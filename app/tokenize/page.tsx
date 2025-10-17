"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { TokenizeForm, type TokenizeFormHandle, type TokenizeFormValues } from "@/src/components/tokenize/TokenizeForm";
import { LivePreviewCard } from "@/src/components/tokenize/LivePreviewCard";
import { SuccessMintModal } from "@/src/components/tokenize/SuccessMintModal";
import type { MintResult } from "@/src/lib/types/proofs";
import { CUSTODIAN_ACCOUNT } from "@/src/utils/constants";

const initialFormValues: TokenizeFormValues = {
  assetType: "",
  assetName: "",
  assetValueUSD: "",
  expectedYieldPct: "",
  proof: null,
};

export default function TokenizePage() {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const prefersReducedMotion = useReducedMotion();

  const [formValues, setFormValues] = useState<TokenizeFormValues>(initialFormValues);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const formRef = useRef<TokenizeFormHandle>(null);

  const handleFormChange = (next: Partial<TokenizeFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...next }));
  };

  const handleMintSuccess = (result: MintResult) => {
    setMintResult(result);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setMintResult(null);
    setFormValues(initialFormValues);
    requestAnimationFrame(() => {
      formRef.current?.clearErrors();
      formRef.current?.focusFirstField();
    });
  };

  const previewData = useMemo(() => {
    const numericValue = Number.parseFloat(formValues.assetValueUSD.replace(/,/g, ""));
    const expectedYield = formValues.expectedYieldPct ? Number.parseFloat(formValues.expectedYieldPct) : undefined;
    return {
      name: formValues.assetName.trim(),
      type: formValues.assetType,
      valueUSD: Number.isFinite(numericValue) ? numericValue : 0,
      expectedYieldPct: Number.isFinite(expectedYield ?? NaN) ? expectedYield : undefined,
      proof: formValues.proof,
      custodian: "Pending" as const,
    };
  }, [formValues]);

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate="visible"
        variants={prefersReducedMotion ? undefined : fadeInUp}
        transition={transitions.base}
        className="container mx-auto px-4 py-8"
      >
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Tokenize Assets</h1>
          <p className="text-muted-foreground">
            Convert revenue streams and off-chain agreements into Stellar-based vRWA tokens.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.section
            variants={prefersReducedMotion ? undefined : fadeInUp}
            transition={transitions.base}
            className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
          >
            <h2 className="text-xl font-semibold text-foreground">Asset details</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Provide baseline information and a recent proof to initiate the minting workflow.
            </p>
            <div className="mt-6">
              <TokenizeForm
                ref={formRef}
                values={formValues}
                onChange={handleFormChange}
                onMintSuccess={handleMintSuccess}
                walletConnected={wallet.status === "connected"}
                accountId={wallet.accountId}
                custodianAccount={CUSTODIAN_ACCOUNT}
              />
            </div>
          </motion.section>

          <motion.aside
            variants={prefersReducedMotion ? undefined : fadeInUp}
            transition={transitions.base}
            className="space-y-6"
          >
            <LivePreviewCard
              name={previewData.name}
              type={previewData.type}
              valueUSD={previewData.valueUSD}
              expectedYieldPct={previewData.expectedYieldPct}
              proof={previewData.proof}
              custodian={previewData.custodian}
            />

            <motion.div
              variants={prefersReducedMotion ? undefined : fadeInUp}
              transition={transitions.base}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
            >
              <h3 className="text-lg font-semibold text-foreground">Minting checklist</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Ensure asset valuation has supporting documents (appraisals, invoices).
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Custodian review typically completes within 6 business hours.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  After mint, tokens appear immediately in the custodian dashboard.
                </li>
              </ul>
            </motion.div>
          </motion.aside>
        </div>
      </motion.div>

      <SuccessMintModal open={modalOpen} onClose={handleModalClose} result={mintResult} />
    </LayoutShell>
  );
}
