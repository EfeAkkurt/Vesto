"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Buffer } from "buffer";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { decode } from "cborg";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { Attestation } from "@/src/lib/types/proofs";
import { formatUSD, formatDateTime } from "@/src/lib/utils/format";
import { getViaGateway } from "@/src/lib/ipfs/client";
import { AttestationMetadataSchema, type AttestationMetadata } from "@/src/lib/custodian/schema";
import { TokenRequestMetadataSchema, type TokenRequestMetadata } from "@/src/lib/custodian/requests";
import { verifyAttestationSignature, type SignatureBundle } from "@/src/lib/attestations/verify";

export type AttestationDrawerProps = {
  open: boolean;
  onClose: () => void;
  item?: Attestation | null;
  onStatusUpdate?: (metadataCid: string, status: Attestation["status"]) => void;
};

const statusBadge: Record<Attestation["status"], string> = {
  Verified: "bg-primary/15 text-primary",
  Pending: "bg-amber-400/15 text-amber-200",
  Invalid: "bg-rose-400/15 text-rose-300",
};

type VerificationState = "idle" | "loading" | "verified" | "invalid" | "error";

export const AttestationDrawer = ({ open, onClose, item, onStatusUpdate }: AttestationDrawerProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [metadata, setMetadata] = useState<AttestationMetadata | null>(null);
  const [requestMetadata, setRequestMetadata] = useState<TokenRequestMetadata | null>(null);
  const [verification, setVerification] = useState<VerificationState>("idle");
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.querySelector<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    (async () => {
      const initialState = item.status === "Verified" ? "verified" : item.status === "Invalid" ? "invalid" : "loading";
      setVerification(initialState);
      try {
        setVerificationError(null);
        setMetadata(null);
        setRequestMetadata(null);

        const response = await fetch(getViaGateway(item.metadataCid), {
          headers: { Accept: "application/octet-stream" },
        });
        if (!response.ok) throw new Error(`Gateway responded ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const bytes = new Uint8Array(buffer);
        let parsedMetadata: AttestationMetadata | null = null;
        let parsedRequestMetadata: TokenRequestMetadata | null = null;
        let decodeError: unknown;

        try {
          const decoded = decode(bytes);
          if (decoded && typeof decoded === "object") {
            const parsed = AttestationMetadataSchema.safeParse(decoded);
            if (parsed.success) {
              parsedMetadata = parsed.data;
            } else {
              decodeError = new Error("Metadata schema mismatch");
            }
          }
        } catch (error) {
          decodeError = error;
        }

        if (!parsedMetadata) {
          try {
            const text = new TextDecoder().decode(bytes);
            const json = JSON.parse(text);
            const parsed = AttestationMetadataSchema.safeParse(json);
            if (parsed.success) {
              parsedMetadata = parsed.data;
            } else {
              const parsedToken = TokenRequestMetadataSchema.safeParse(json);
              if (parsedToken.success) {
                parsedRequestMetadata = {
                  ...parsedToken.data,
                  proofUrl: parsedToken.data.proofUrl ?? getViaGateway(parsedToken.data.proofCid),
                };
              } else if (!decodeError) {
                decodeError = new Error("Metadata schema mismatch");
              }
            }
          } catch (jsonError) {
            if (!decodeError) decodeError = jsonError;
          }
        }

        if (!parsedMetadata && parsedRequestMetadata) {
          setRequestMetadata(parsedRequestMetadata);
          setVerification("idle");
          setVerificationError("Awaiting custodian attestation metadata.");
          return;
        }

        if (!parsedMetadata) {
          throw (decodeError instanceof Error
            ? decodeError
            : new Error("Failed to decode attestation metadata"));
        }

        setMetadata(parsedMetadata);

        const attestationDetails = parsedMetadata.attestation ?? null;
        const resolvedNonce = (attestationDetails?.nonce ?? item.nonce ?? "").trim();
        const resolvedSignature = attestationDetails?.signature ?? (item.signature && item.signature !== "-" ? item.signature : "");
        const resolvedSigner = attestationDetails?.signedBy ?? (item.signedBy || "");

        const signatureBytes =
          resolvedSignature && resolvedSignature !== "-"
            ? (() => {
                try {
                  return new Uint8Array(Buffer.from(resolvedSignature, "base64"));
                } catch {
                  return undefined;
                }
              })()
            : undefined;

        const bundle: SignatureBundle = {
          signatureString: resolvedSignature || undefined,
          signatureBytes,
          publicKey: resolvedSigner || undefined,
          nonce: resolvedNonce || undefined,
          messageBase64: typeof attestationDetails?.message === "string" ? attestationDetails.message : undefined,
          requestCid:
            attestationDetails?.requestCid ??
            parsedMetadata.request?.cid ??
            (typeof item.requestCid === "string" ? item.requestCid : undefined) ??
            undefined,
        };

        const outcome = await verifyAttestationSignature(parsedMetadata, bundle);

        if (!cancelled) {
          if (outcome.status === "Verified") {
            setVerification("verified");
            setVerificationError(null);
            onStatusUpdate?.(item.metadataCid, "Verified");
          } else if (outcome.status === "Invalid") {
            setVerification("invalid");
            setVerificationError(outcome.reason ?? "Signature verification failed");
            onStatusUpdate?.(item.metadataCid, "Invalid");
          } else {
            setVerification("loading");
            setVerificationError(outcome.reason ?? "Awaiting attestation signature");
          }
        }
      } catch (error) {
        console.error("Failed to verify attestation", error);
        if (!cancelled) {
          setVerification("error");
          setVerificationError(error instanceof Error ? error.message : "Unknown error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, item, onStatusUpdate]);

  const content = useMemo(() => item ?? null, [item]);
  const metadataAttestation = metadata?.attestation;
  const displayReserveUSD =
    metadata?.reserveAmount ??
    requestMetadata?.asset?.valueUSD ??
    (content?.reserveUSD ?? 0);
  const displayTimestamp = metadata?.timestamp ?? requestMetadata?.timestamp ?? (content?.ts ?? "");
  const displaySignedBy =
    metadataAttestation?.signedBy ??
    metadata?.issuer ??
    requestMetadata?.issuer ??
    (content?.signedBy ?? "—");
  const displaySignature = metadataAttestation?.signature ?? (content?.signature && content.signature !== "-" ? content.signature : "");
  const proofHash = metadata?.fileCid ?? requestMetadata?.proofCid ?? (content?.ipfs.hash ?? undefined);
  const proofUrl = metadata?.fileCid
    ? getViaGateway(metadata.fileCid)
    : requestMetadata?.proofUrl ?? (proofHash ? getViaGateway(proofHash) : undefined);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && content ? (
        <motion.div
          className="fixed inset-0 z-[95] flex justify-end bg-black/50 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="attestation-drawer-title"
            initial={prefersReducedMotion ? { x: 0, opacity: 0 } : { x: "100%", opacity: 1 }}
            animate={prefersReducedMotion ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { x: 0, opacity: 0 } : { x: "100%", opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="h-full w-full max-w-md overflow-y-auto border-l border-border/60 bg-card/95 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="attestation-drawer-title" className="text-xl font-semibold text-foreground">
                  Week {content.week}
                </h2>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[content.status]}`}>
                  {content.status}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border/50 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reserve</span>
                <span className="font-semibold text-foreground">{formatUSD(displayReserveUSD)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Verification</span>
                <span
                  className={
                    verification === "verified"
                      ? "rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"
                      : verification === "invalid"
                        ? "rounded-full bg-rose-400/15 px-3 py-1 text-xs font-semibold text-rose-300"
                        : "rounded-full bg-border/40 px-3 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {verification === "loading"
                    ? "Checking"
                    : verification === "verified"
                      ? "Verified"
                      : verification === "invalid"
                        ? "Invalid"
                        : verification === "error"
                          ? "Error"
                          : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Proof</span>
                <div className="mt-2 flex items-center gap-2">
                  {proofHash ? <CopyHash value={proofHash} /> : <span className="text-foreground/60">—</span>}
                  {proofUrl ? (
                    <button
                      type="button"
                      onClick={() => window.open(proofUrl, "_blank", "noopener,noreferrer")}
                      className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                    >
                      Open
                    </button>
                  ) : null}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Metadata CID</span>
                <div className="mt-2 flex items-center gap-2">
                  <CopyHash value={content.metadataCid} />
                  <button
                    type="button"
                    onClick={() => window.open(getViaGateway(content.metadataCid), "_blank", "noopener,noreferrer")}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    Gateway
                  </button>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Tx Hash</span>
                <div className="mt-2 flex items-center gap-2">
                  <CopyHash value={content.txHash} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Signed By</span>
                <span className="font-semibold text-foreground">{displaySignedBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timestamp</span>
                <span className="font-semibold text-foreground">{displayTimestamp ? formatDateTime(displayTimestamp) : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Signature</span>
                {displaySignature ? (
                  <CopyHash value={displaySignature} />
                ) : (
                  <span className="text-foreground/60">—</span>
                )}
              </div>
              {metadata ? (
                <div className="rounded-xl border border-border/40 bg-border/10 p-3 text-xs">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Metadata</p>
                  <pre className="whitespace-pre-wrap break-all text-foreground/80">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </div>
              ) : requestMetadata ? (
                <div className="rounded-xl border border-border/40 bg-border/10 p-3 text-xs">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Request metadata</p>
                  <pre className="whitespace-pre-wrap break-all text-foreground/80">
                    {JSON.stringify(requestMetadata, null, 2)}
                  </pre>
                </div>
              ) : verification === "loading" ? (
                <p className="text-xs text-muted-foreground">Fetching metadata from IPFS…</p>
              ) : null}
              {verification === "error" && verificationError ? (
                <p className="text-xs text-rose-400">Verification error: {verificationError}</p>
              ) : null}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
