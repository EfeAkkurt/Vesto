"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { ProofListItem } from "@/src/lib/proofs/selectors";
import { CUSTODIAN_STATUS_THEME } from "@/src/components/custodian/statusTheme";
import { cn } from "@/src/utils/cn";
import { formatBytes, formatDateTime } from "@/src/lib/utils/format";
import { getViaGateway } from "@/src/lib/ipfs/client";
import { shortHash } from "@/src/lib/utils/text";

export type ProofDrawerProps = {
  open: boolean;
  onClose: () => void;
  proof?: ProofListItem | null;
};

type DrawerRowProps = {
  label: string;
  children: ReactNode;
  wrap?: boolean;
};

const DrawerRow = ({ label, children, wrap = false }: DrawerRowProps) => (
  <div className="flex items-start gap-4">
    <dt className="w-32 shrink-0 text-sm text-zinc-400">{label}</dt>
    <dd
      className={cn(
        "flex flex-1 items-center gap-2",
        wrap ? "flex-wrap" : "flex-nowrap",
      )}
    >
      {children}
    </dd>
  </div>
);

const deriveFileName = (proof: ProofListItem) => {
  const subtitle = proof.subtitle?.trim() ?? "";
  if (subtitle) return `${subtitle}.${(proof.mime ?? "bin").split("/").pop() ?? "bin"}`;
  return `${proof.title.replace(/\s+/g, "-").toLowerCase() || "proof"}.bin`;
};

export const ProofDrawer = ({ open, onClose, proof }: ProofDrawerProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  if (!mounted) return null;
  if (!proof) return null;

  const statusTheme = CUSTODIAN_STATUS_THEME[proof.status];
  const metadataUrl = proof.metadataCid ? getViaGateway(proof.metadataCid) : null;
  const fileName = deriveFileName(proof);
  const signedBy = proof.verifiedBy ?? null;
  const signatureCount = proof.status === "Verified" ? 1 : 0;

  return createPortal(
    <AnimatePresence>
      {open ? (
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
            aria-labelledby="proof-drawer-title"
            initial={prefersReducedMotion ? { x: 0, opacity: 0 } : { x: "100%", opacity: 1 }}
            animate={prefersReducedMotion ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { x: 0, opacity: 0 } : { x: "100%", opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="h-full w-full max-w-[440px] overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 id="proof-drawer-title" className="text-lg font-semibold tracking-tight text-zinc-100">
                  {proof.title}
                </h2>
                <p className="text-sm text-zinc-400">{proof.type}</p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusTheme.badge,
                  )}
                >
                  {proof.status}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>

            <dl className="mt-6 space-y-4">
              <DrawerRow label="Uploaded">
                <span className="text-sm font-medium text-zinc-100">
                  {formatDateTime(proof.uploadedAt)}
                </span>
              </DrawerRow>

              <DrawerRow label="Verified">
                <span className="text-sm font-medium text-zinc-100">
                  {proof.verifiedAtLabel ?? "—"}
                </span>
              </DrawerRow>

              <DrawerRow label="CID" wrap>
                <CopyHash
                  value={proof.cid}
                  short={false}
                  variant="plain"
                  className="justify-start"
                  textClassName="ellipsis max-w-[220px]"
                />
                <button
                  type="button"
                  onClick={() => window.open(proof.gatewayUrl, "_blank", "noopener,noreferrer")}
                  className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-100 transition hover:border-white/20 hover:text-white"
                >
                  Open
                </button>
              </DrawerRow>

              <DrawerRow label="Metadata" wrap>
                {proof.metadataCid ? (
                  <>
                    <CopyHash
                      value={proof.metadataCid}
                      short={false}
                      variant="plain"
                      className="justify-start"
                      textClassName="ellipsis max-w-[220px]"
                    />
                    {metadataUrl ? (
                      <button
                        type="button"
                        onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}
                        className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-100 transition hover:border-white/20 hover:text-white"
                      >
                        Gateway
                      </button>
                    ) : null}
                  </>
                ) : (
                  <span className="text-sm font-medium text-zinc-500">—</span>
                )}
              </DrawerRow>

              <DrawerRow label="SHA-256">
                <CopyHash
                  value={proof.sha256}
                  short={false}
                  variant="plain"
                  className="justify-start"
                  textClassName="break-any"
                />
              </DrawerRow>

              <DrawerRow label="Tx Hash">
                {proof.txHash ? (
                  <CopyHash value={proof.txHash} short={false} variant="plain" className="justify-start" />
                ) : (
                  <span className="text-sm font-medium text-zinc-500">—</span>
                )}
              </DrawerRow>

              <DrawerRow label="Mime / Size">
                <span className="text-sm font-medium text-zinc-100">
                  {(proof.mime ?? "application/octet-stream").toLowerCase()} ·{" "}
                  {proof.size != null ? formatBytes(proof.size) : "Unknown"}
                </span>
              </DrawerRow>

              <DrawerRow label="Source">
                <span className="text-sm font-medium text-zinc-100 capitalize">{proof.source}</span>
              </DrawerRow>

              <DrawerRow label="Download">
                <button
                  type="button"
                  onClick={() => window.open(proof.gatewayUrl, "_blank", "noopener,noreferrer")}
                  className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-100 transition hover:border-white/20 hover:text-white"
                >
                  Download {fileName}
                </button>
              </DrawerRow>
            </dl>

            <div className="mt-6 flex flex-wrap items-center gap-x-2 border-t border-white/5 pt-4 text-xs text-zinc-500">
              <span>Fee • —</span>
              <span>· Signed by {signedBy ? shortHash(signedBy, 6, 6) : "—"}</span>
              <span>· {signatureCount} sig</span>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
