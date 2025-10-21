"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { Attestation } from "@/src/lib/types/proofs";
import { formatUSD, formatDateTime } from "@/src/lib/utils/format";
import { getViaGateway } from "@/src/lib/ipfs/client";
import type { AttestationMetadata } from "@/src/lib/custodian/schema";
import { TokenRequestMetadataSchema, type TokenRequestMetadata } from "@/src/lib/custodian/requests";
import { verifyAttestation } from "@/src/lib/attestations/verify";
import { debug } from "@/src/lib/logging/logger";
import { MANAGE_DATA_SIGNATURE } from "@/src/lib/types/proofs";

export type AttestationDrawerProps = {
  open: boolean;
  onClose: () => void;
  item?: Attestation | null;
  onStatusUpdate?: (
    metadataCid: string,
    status: Attestation["status"],
    payload?: {
      reserveAmount?: number;
      timestamp?: string;
      metadata?: AttestationMetadata;
    },
  ) => void;
};

const statusBadge: Record<Attestation["status"], string> = {
  Verified: "bg-primary/15 text-primary",
  Recorded: "bg-sky-400/15 text-sky-200",
  Pending: "bg-amber-400/15 text-amber-200",
  Invalid: "bg-rose-400/15 text-rose-300",
};

type VerificationState = "idle" | "loading" | "recorded" | "verified" | "invalid" | "error";

export const AttestationDrawer = ({ open, onClose, item, onStatusUpdate }: AttestationDrawerProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [metadata, setMetadata] = useState<AttestationMetadata | null>(null);
  const [requestMetadata, setRequestMetadata] = useState<TokenRequestMetadata | null>(null);
  const [verification, setVerification] = useState<VerificationState>("idle");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVerificationRef = useRef(0);
  const verificationInFlightRef = useRef(false);
  const lastStatusRef = useRef<Attestation["status"] | null>(null);
  const lastMetadataRef = useRef<string | null>(null);
  const drawerTickRef = useRef(0);

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
    drawerTickRef.current += 1;
    const currentTick = drawerTickRef.current;
    if (!open || !item) {
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
        verificationTimerRef.current = null;
      }
      debug("[attestation:verify:schedule-cancelled]", {
        metadataCid: item?.metadataCid ?? "n/a",
        reason: open ? "unmounted" : "drawer-closed",
      });
      return;
    }
    const strictVerify = (process.env.NEXT_PUBLIC_STRICT_VERIFY ?? "").trim() === "1";
    let cancelled = false;
    const MIN_INTERVAL_MS = 2000;

    const scheduleVerification = () => {
      if (cancelled) return;
      const now = Date.now();
      const elapsed = now - lastVerificationRef.current;
      const delay = lastVerificationRef.current === 0 ? 0 : Math.max(0, MIN_INTERVAL_MS - elapsed);
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }
      verificationTimerRef.current = setTimeout(async () => {
        if (cancelled || verificationInFlightRef.current) {
          scheduleVerification();
          return;
        }
        verificationInFlightRef.current = true;
        lastVerificationRef.current = Date.now();
        try {
          const context = {
            metadataCid: item.metadataCid,
            proofCid: item.proofCid ?? item.ipfs.hash,
            memoHashHex: item.memoHashHex ?? null,
            requestCid: item.requestCid,
            requestMemoHashHex: item.requestMemoHashHex,
          };
          setVerification((state) => (state === "verified" || state === "recorded" ? state : "loading"));
          setVerificationError(null);
          debug("[attestation:verify:request]", {
            metadataCid: context.metadataCid,
            delayMs: Date.now() - lastVerificationRef.current,
            strictVerify,
          });

          const outcome = await verifyAttestation(context, { strict: strictVerify });
          if (cancelled || drawerTickRef.current !== currentTick) {
            return;
          }

          if (outcome.metadata) {
            setMetadata(outcome.metadata);
          }

          const nextStatus: Attestation["status"] =
            outcome.status === "Verified"
              ? "Verified"
              : outcome.status === "Invalid"
                ? "Invalid"
                : "Recorded";
          const reserveAmount = outcome.metadata?.reserveAmount;
          const timestamp = outcome.metadata?.timestamp;

          if (outcome.status === "Verified") {
            setVerification("verified");
            setVerificationError(null);
          } else if (outcome.status === "Invalid") {
            setVerification("invalid");
            setVerificationError(outcome.reason ?? "mismatch");
          } else {
            setVerification("recorded");
            setVerificationError(outcome.reason ?? null);
          }
          debug("[attestation:verify:status]", {
            metadataCid: item.metadataCid,
            status: outcome.status,
            reason: outcome.reason ?? null,
          });

          if (nextStatus !== lastStatusRef.current) {
            lastStatusRef.current = nextStatus;
            onStatusUpdate?.(item.metadataCid, nextStatus, {
              reserveAmount,
              timestamp,
              metadata: outcome.metadata,
            });
          }

          const requestCid =
            item.requestCid ??
            outcome.metadata?.request?.cid ??
            outcome.metadata?.attestation?.requestCid ??
            null;

          if (requestCid) {
            try {
              const response = await fetch(getViaGateway(requestCid), {
                headers: { Accept: "application/json, application/cbor" },
              });
              if (!response.ok) {
                throw new Error(`Failed to fetch token request metadata (${response.status})`);
              }
              const payload = await response.json();
              const parsed = TokenRequestMetadataSchema.safeParse(payload);
              if (parsed.success && !cancelled) {
                setRequestMetadata({
                  ...parsed.data,
                  proofUrl: parsed.data.proofUrl ?? getViaGateway(parsed.data.proofCid),
                });
              }
            } catch (error) {
              if (!cancelled) {
                debug(
                  "[attestation:request-metadata:error]",
                  error instanceof Error ? error.message : String(error),
                );
              }
            }
          }
        } catch (error) {
          if (cancelled || drawerTickRef.current !== currentTick) {
            return;
          }
          setVerification("error");
          setVerificationError(error instanceof Error ? error.message : "Unknown error");
          debug("[attestation:verify:error]", {
            metadataCid: item.metadataCid,
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          verificationInFlightRef.current = false;
        }
      }, delay);
      debug("[attestation:verify:schedule]", {
        metadataCid: item.metadataCid,
        delayMs: delay,
      });
    };

    if (item.metadataCid !== lastMetadataRef.current) {
      lastMetadataRef.current = item.metadataCid;
      lastStatusRef.current = item.status ?? null;
      setMetadata(null);
      setRequestMetadata(null);
      setVerification("loading");
      setVerificationError(null);
    }

    scheduleVerification();

    return () => {
      cancelled = true;
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
        verificationTimerRef.current = null;
      }
      debug("[attestation:verify:cleanup]", {
        metadataCid: item.metadataCid,
      });
    };
  }, [open, item, item?.metadataCid, item?.proofCid, item?.requestCid, item?.memoHashHex, item?.requestMemoHashHex, onStatusUpdate]);

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
  const displayTxSigner = content?.txSourceAccount ?? displaySignedBy;
  const displaySigCount = content?.sigCount ?? content?.signatureCount ?? 0;
const displayFeeXlm = typeof content?.feeXlm === "number" ? content.feeXlm : undefined;
const manageDataSignature =
  (metadataAttestation?.signature ?? content?.signature ?? "").toUpperCase() === MANAGE_DATA_SIGNATURE;
const displaySignature =
  manageDataSignature || (metadataAttestation?.signature ?? "").length === 0
    ? ""
    : metadataAttestation?.signature ?? (content?.signature && content.signature !== "-" ? content.signature : "");
const signatureFallbackLabel = "Auto-verified (demo mode)";
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
                      : verification === "recorded"
                        ? "rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-200"
                        : verification === "invalid"
                          ? "rounded-full bg-rose-400/15 px-3 py-1 text-xs font-semibold text-rose-300"
                          : "rounded-full bg-border/40 px-3 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {verification === "loading"
                    ? "Checking"
                    : verification === "verified"
                      ? "Verified"
                      : verification === "recorded"
                        ? "Recorded"
                        : verification === "invalid"
                          ? "Invalid"
                          : verification === "error"
                        ? "Error"
                        : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Signed by</span>
                <span className="font-mono text-xs text-foreground">
                  {(displayTxSigner && displayTxSigner !== "" ? displayTxSigner : "—")} • {displaySigCount} sig
                </span>
              </div>
              {displayFeeXlm != null ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-mono text-xs text-foreground">{displayFeeXlm.toFixed(7)} XLM</span>
                </div>
              ) : null}
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
                {content.metadataFetchFailed ? (
                  <p className="mt-1 text-[11px] text-amber-200">
                    Metadata fetch pending
                    {content.metadataFailureReason
                      ? ` · ${content.metadataFailureReason.length > 80 ? `${content.metadataFailureReason.slice(0, 77)}…` : content.metadataFailureReason}`
                      : ""}
                  </p>
                ) : null}
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
                {manageDataSignature ? (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Manage data
                  </span>
                ) : displaySignature ? (
                  <CopyHash value={displaySignature} />
                ) : (
                  <span className="text-foreground/80">{signatureFallbackLabel}</span>
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
