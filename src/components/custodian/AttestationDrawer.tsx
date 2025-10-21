"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { Attestation } from "@/src/lib/types/proofs";
import { formatUSD, formatDateTime, formatXLM } from "@/src/lib/utils/format";
import { shortHash } from "@/src/lib/utils/text";
import { getViaGateway } from "@/src/lib/ipfs/client";
import type { AttestationMetadata } from "@/src/lib/custodian/schema";
import { TokenRequestMetadataSchema, type TokenRequestMetadata } from "@/src/lib/custodian/requests";
import { verifyAttestation } from "@/src/lib/attestations/verify";
import { debug } from "@/src/lib/logging/logger";
import { MANAGE_DATA_SIGNATURE } from "@/src/lib/types/proofs";
import { cn } from "@/src/utils/cn";
import { CUSTODIAN_STATUS_THEME } from "@/src/components/custodian/statusTheme";

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

const VERIFICATION_THEME: Record<
  VerificationState,
  { label: string; className: string }
> = {
  idle: { label: "Pending", className: CUSTODIAN_STATUS_THEME.Pending.badge },
  loading: { label: "Checking", className: CUSTODIAN_STATUS_THEME.Pending.badge },
  recorded: { label: "Recorded", className: CUSTODIAN_STATUS_THEME.Recorded.badge },
  verified: { label: "Verified", className: CUSTODIAN_STATUS_THEME.Verified.badge },
  invalid: { label: "Invalid", className: CUSTODIAN_STATUS_THEME.Invalid.badge },
  error: { label: "Error", className: "border border-rose-400/30 bg-rose-500/10 text-rose-300" },
};

type DrawerRowProps = {
  label: string;
  children: ReactNode;
  align?: "start" | "end";
  wrap?: boolean;
};

const DrawerRow = ({ label, children, align = "end", wrap = false }: DrawerRowProps) => (
  <div className="flex items-start gap-4">
    <dt className="w-32 shrink-0 text-sm text-zinc-400">{label}</dt>
    <dd
      className={cn(
        "flex flex-1 items-center gap-2",
        align === "end" ? "justify-end text-right" : "justify-start text-left",
        wrap ? "flex-wrap" : "flex-nowrap",
      )}
    >
      {children}
    </dd>
  </div>
);

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
  const displayReserveUSD = metadata?.reserveAmount ?? requestMetadata?.asset?.valueUSD ?? content?.reserveUSD ?? 0;
  const hasVerifiedReserve = (content?.status ?? item?.status) === "Verified" || (displayReserveUSD ?? 0) > 0;
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
            className="h-full w-full max-w-[440px] overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 id="attestation-drawer-title" className="text-lg font-semibold tracking-tight text-zinc-100">
                  Week {content.week}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    CUSTODIAN_STATUS_THEME[content.status].badge,
                  )}
                >
                  {content.status}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-zinc-100"
              >
                Close
              </button>
            </div>

            <dl className="mt-6 space-y-4">
              <DrawerRow label="Reserve">
                <span className="break-any text-sm font-medium text-zinc-100">
                  {hasVerifiedReserve ? formatUSD(displayReserveUSD) : "—"}
                </span>
              </DrawerRow>

              <DrawerRow label="Verification">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    VERIFICATION_THEME[verification].className,
                  )}
                >
                  {VERIFICATION_THEME[verification].label}
                </span>
              </DrawerRow>

              <DrawerRow label="Proof">
                {proofHash ? (
                  <>
                    <CopyHash value={proofHash} short={false} variant="plain" />
                    {proofUrl ? (
                      <button
                        type="button"
                        onClick={() => window.open(proofUrl, "_blank", "noopener,noreferrer")}
                        className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-100 transition hover:border-white/20 hover:text-white"
                      >
                        Open
                      </button>
                    ) : null}
                  </>
                ) : (
                  <span className="break-any text-sm font-medium text-zinc-500">—</span>
                )}
              </DrawerRow>

              <DrawerRow label="Metadata CID" align="end" wrap>
                <div className="flex flex-1 flex-nowrap items-center justify-end gap-2">
                  <CopyHash value={content.metadataCid} short={false} variant="plain" />
                  <button
                    type="button"
                    onClick={() => window.open(getViaGateway(content.metadataCid), "_blank", "noopener,noreferrer")}
                    className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-100 transition hover:border-white/20 hover:text-white"
                  >
                    Gateway
                  </button>
                </div>
                {content.metadataFetchFailed && content.status !== "Verified" ? (
                  <span className="w-full text-right text-sm italic text-zinc-400">
                    IPFS gateway is syncing this CID — please retry soon.
                  </span>
                ) : null}
              </DrawerRow>

              <DrawerRow label="Tx Hash">
                <CopyHash value={content.txHash} short={false} variant="plain" />
              </DrawerRow>

              <DrawerRow label="Signed By">
                {displaySignedBy && displaySignedBy !== "—" ? (
                  <CopyHash value={displaySignedBy} variant="plain" />
                ) : (
                  <span className="break-any text-sm font-medium text-zinc-500">—</span>
                )}
              </DrawerRow>

              <DrawerRow label="Timestamp">
                <span className="break-any text-sm font-medium text-zinc-100">
                  {displayTimestamp ? formatDateTime(displayTimestamp) : "—"}
                </span>
              </DrawerRow>

              <DrawerRow label="Signature">
                {manageDataSignature ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                    Manage data
                  </span>
                ) : displaySignature ? (
                  <CopyHash value={displaySignature} short={false} variant="plain" />
                ) : (
                  <span className="text-sm italic text-zinc-400">{signatureFallbackLabel}</span>
                )}
              </DrawerRow>
            </dl>

            {metadata ? (
              <div className="mt-6 space-y-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Metadata</p>
                <pre className="max-h-80 overflow-auto rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-zinc-200">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </div>
            ) : requestMetadata ? (
              <div className="mt-6 space-y-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Request metadata</p>
                <pre className="max-h-80 overflow-auto rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-zinc-200">
                  {JSON.stringify(requestMetadata, null, 2)}
                </pre>
              </div>
            ) : verification === "loading" ? (
              <p className="mt-6 text-sm text-zinc-400">Fetching metadata from IPFS…</p>
            ) : null}

            {verification === "error" && verificationError ? (
              <p className="mt-4 text-sm text-rose-400">Verification error: {verificationError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-x-2 border-t border-white/5 pt-4 text-xs text-zinc-500">
              <span>Fee • {displayFeeXlm != null ? `${formatXLM(displayFeeXlm)} XLM` : "—"}</span>
              <span>· Signed by {displayTxSigner ? shortHash(displayTxSigner, 6, 6) : "—"}</span>
              <span>· {displaySigCount ?? 0} sig</span>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
