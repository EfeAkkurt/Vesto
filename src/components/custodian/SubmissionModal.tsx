"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { Attestation } from "@/src/lib/types/proofs";
import { STELLAR_NET } from "@/src/utils/constants";

const explorerSegment = STELLAR_NET.toUpperCase() === "MAINNET" ? "public" : "testnet";

export type SubmissionModalProps = {
  open: boolean;
  onClose: () => void;
  attestation: Attestation | null;
};

export const SubmissionModal = ({ open, onClose, attestation }: SubmissionModalProps) => {
  const prefersReducedMotion = useReducedMotion();
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && attestation ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur"
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        >
          <motion.div
            initial={prefersReducedMotion ? undefined : { scale: 0.95, opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { scale: 0.95, opacity: 0 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-6 text-sm shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Attestation submitted</h2>
                <p className="text-xs text-muted-foreground">Week {attestation.week} signed and broadcasted.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction Hash</p>
                <div className="mt-1 flex items-center gap-2">
                  <CopyHash value={attestation.txHash} />
                  <a
                    href={`https://stellar.expert/explorer/${explorerSegment}/tx/${attestation.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Open in StellarExpert
                  </a>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Metadata CID</p>
                <div className="mt-1 flex items-center gap-2">
                  <CopyHash value={attestation.metadataCid} />
                  <a
                    href={`https://ipfs.io/ipfs/${attestation.metadataCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Open on IPFS
                  </a>
                </div>
              </div>
              {attestation.requestCid ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Request CID</p>
                  <div className="mt-1 flex items-center gap-2">
                    <CopyHash value={attestation.requestCid} />
                    <a
                      href={`https://ipfs.io/ipfs/${attestation.requestCid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View Token Request
                    </a>
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Proof file</p>
                <div className="mt-1 flex items-center gap-2">
                  <CopyHash value={attestation.ipfs.hash} />
                  <a
                    href={attestation.ipfs.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
