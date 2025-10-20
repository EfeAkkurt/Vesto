"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { mutate } from "swr";
import { motion, useReducedMotion } from "framer-motion";
import { useToast } from "@/src/components/ui/Toast";
import { Loader } from "@/src/components/ui/Loader";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { maskPercent } from "@/src/lib/utils/format";
import { uploadFile, putDagCbor, getViaGateway } from "@/src/lib/ipfs/client";
import type { AssetType, MintResult, ProofRef } from "@/src/lib/types/proofs";
import { buildAndSubmitMemoTx } from "@/src/lib/custodian/attestation";
import { CUSTODIAN_ACCOUNT, HORIZON, STELLAR_NET } from "@/src/utils/constants";
import { refreshProofsAll } from "@/src/lib/swr/mutateBus";

export type TokenizeFormValues = {
  assetType: AssetType | "";
  assetName: string;
  assetValueUSD: string;
  expectedYieldPct: string;
  proof: ProofRef | null;
};

export type TokenizeFormHandle = {
  focusFirstField: () => void;
  clearErrors: () => void;
};

type TokenizeFormProps = {
  values: TokenizeFormValues;
  onChange: (next: Partial<TokenizeFormValues>) => void;
  onMintSuccess: (result: MintResult) => void;
  walletConnected: boolean;
  accountId?: string;
  custodianAccount?: string;
};

type FormErrors = Partial<Record<"assetType" | "assetName" | "assetValueUSD" | "expectedYieldPct" | "proof", string>>;

const assetTypeOptions: AssetType[] = ["Invoice", "Subscription", "Rent", "Carbon Credit"];

const NETWORK_PASSPHRASES = {
  MAINNET: "Public Global Stellar Network ; September 2015",
  TESTNET: "Test SDF Network ; September 2015",
} as const;

const getNetworkPassphrase = () =>
  STELLAR_NET?.toUpperCase() === "MAINNET" ? NETWORK_PASSPHRASES.MAINNET : NETWORK_PASSPHRASES.TESTNET;

const fieldVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const parseAssetValue = (value: string) => {
  if (!value) return NaN;
  return Number.parseFloat(value.replace(/,/g, ""));
};

const randomTokenId = () => `vRWA-${Math.floor(Math.random() * 1_000_000)
  .toString()
  .padStart(6, "0")}`;

export const TokenizeForm = forwardRef<TokenizeFormHandle, TokenizeFormProps>(
  ({ values, onChange, onMintSuccess, walletConnected, accountId, custodianAccount }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const { toast } = useToast();
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const firstFieldRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        focusFirstField: () => firstFieldRef.current?.focus(),
        clearErrors: () => setErrors({}),
      }),
      [],
    );

    useEffect(() => {
      if (
        values.assetName === "" &&
        values.assetValueUSD === "" &&
        values.expectedYieldPct === "" &&
        !values.proof
      ) {
        setErrors({});
      }
    }, [values.assetName, values.assetValueUSD, values.expectedYieldPct, values.proof]);

    const clearError = (key: keyof FormErrors) => {
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

    const handleAssetTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
      onChange({ assetType: event.target.value as AssetType | "" });
      clearError("assetType");
    };

    const handleAssetNameChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ assetName: event.target.value });
      clearError("assetName");
    };

    const handleAssetValueChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ assetValueUSD: event.target.value });
      clearError("assetValueUSD");
    };

    const handleExpectedYieldChange = (event: ChangeEvent<HTMLInputElement>) => {
      const masked = maskPercent(event.target.value);
      onChange({ expectedYieldPct: masked });
      clearError("expectedYieldPct");
    };

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setIsUploading(true);
        const cid = await uploadFile(file);
        const proof: ProofRef = {
          hash: cid,
          url: getViaGateway(cid),
          size: file.size,
          mime: file.type || "application/octet-stream",
          name: file.name,
        };
        onChange({ proof });
        clearError("proof");
        toast({
          title: "Proof uploaded",
          description: `${file.name} pinned to IPFS (${cid.slice(0, 8)}…)`,
          variant: "success",
        });
      } catch (error) {
        console.error("Failed to upload proof", error);
        toast({ title: "Upload failed", description: "Please try again.", variant: "error" });
      } finally {
        setIsUploading(false);
      }
    };

    const validate = () => {
      const nextErrors: FormErrors = {};
      if (!values.assetType) {
        nextErrors.assetType = "Select an asset type.";
      }
      if (values.assetName.trim().length < 3) {
        nextErrors.assetName = "Enter at least 3 characters.";
      }
      const numericValue = parseAssetValue(values.assetValueUSD);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        nextErrors.assetValueUSD = "Enter a value greater than zero.";
      }
      if (!values.proof) {
        nextErrors.proof = "Upload a supporting proof document.";
      }
      setErrors(nextErrors);
      return {
        valid: Object.keys(nextErrors).length === 0,
        numericValue,
      };
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting || isUploading) return;
      const { valid, numericValue } = validate();
      if (!valid || !values.proof) {
        toast({ title: "Mint failed", description: "Fix the highlighted fields and try again.", variant: "error" });
        return;
      }

      if (!walletConnected || !accountId) {
        toast({
          title: "Connect wallet",
          description: "Freighter must be connected to submit on-chain requests.",
          variant: "warning",
        });
        return;
      }

      const targetCustodian = (custodianAccount ?? CUSTODIAN_ACCOUNT)?.trim();
      if (!targetCustodian) {
        toast({
          title: "Missing custodian",
          description: "Custodian account is not configured. Set NEXT_PUBLIC_CUSTODIAN_ACCOUNT.",
          variant: "error",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const timestamp = new Date().toISOString();
        const expectedYield =
          values.expectedYieldPct.trim() !== ""
            ? Number.parseFloat(values.expectedYieldPct.replace(/[^0-9.]/g, ""))
            : undefined;
        const requestEnvelope = {
          schema: "vesto.token.request@1",
          asset: {
            type: values.assetType,
            name: values.assetName.trim(),
            valueUSD: numericValue,
            expectedYieldPct: expectedYield,
          },
          proofCid: values.proof.hash,
          proofUrl: values.proof.url,
          issuer: accountId,
          timestamp,
        };

        const metadataCid = await putDagCbor(requestEnvelope);

        const { txHash } = await buildAndSubmitMemoTx({
          account: accountId,
          destination: targetCustodian,
          memoCid: metadataCid,
          serverUrl: HORIZON,
          networkPassphrase: getNetworkPassphrase(),
          amount: "0.0000001",
        });

        await refreshProofsAll();
        await mutate("dashboard:attestations");

        const result: MintResult = {
          tokenId: randomTokenId(),
          supply: numericValue,
          proof: values.proof,
          metadataCid,
          txHash,
          destination: targetCustodian,
          requestCid: metadataCid,
        };
        toast({ title: "Request sent", description: `${values.assetName} posted to Horizon for custodian review.`, variant: "success" });
        onMintSuccess(result);
        await new Promise((resolve) => {
          setTimeout(resolve, 1_200);
        });
      } catch (error) {
        console.error("Mint simulation failed", error);
        toast({ title: "Mint failed", description: "Unexpected error, try again shortly.", variant: "error" });
      } finally {
        setIsSubmitting(false);
      }
    };

    const motionProps = prefersReducedMotion
      ? { initial: false as const, animate: { opacity: 1 } }
      : {
          initial: "hidden" as const,
          animate: "visible" as const,
          variants: fieldVariants,
          transition: { duration: 0.2, ease: [0.33, 1, 0.68, 1] as const },
        };

    const disableSubmit = !walletConnected || !accountId || isSubmitting || isUploading;

    const selectedFileName = useMemo(() => values.proof?.name ?? values.proof?.hash ?? null, [values.proof]);

    return (
      <motion.form onSubmit={handleSubmit} className="space-y-6">
        <motion.div {...motionProps}>
          <label className="text-sm font-medium text-foreground/90">Asset Type</label>
          <select
            value={values.assetType}
            onChange={handleAssetTypeChange}
            className="mt-2 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select type</option>
            {assetTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.assetType ? <p className="mt-1 text-xs text-rose-400">{errors.assetType}</p> : null}
        </motion.div>

        <motion.div {...motionProps}>
          <label className="text-sm font-medium text-foreground/90">Asset Name</label>
          <input
            ref={firstFieldRef}
            type="text"
            value={values.assetName}
            onChange={handleAssetNameChange}
            placeholder="e.g., Midtown Invoice Series A"
            className="mt-2 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.assetName ? <p className="mt-1 text-xs text-rose-400">{errors.assetName}</p> : null}
        </motion.div>

        <motion.div {...motionProps}>
          <label className="text-sm font-medium text-foreground/90">Asset Value (USD)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={values.assetValueUSD}
            onChange={handleAssetValueChange}
            placeholder="250000"
            className="mt-2 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.assetValueUSD ? <p className="mt-1 text-xs text-rose-400">{errors.assetValueUSD}</p> : null}
        </motion.div>

        <motion.div {...motionProps}>
          <label className="text-sm font-medium text-foreground/90">Expected Yield (%)</label>
          <div className="relative mt-2">
            <input
              type="text"
              inputMode="decimal"
              value={values.expectedYieldPct}
              onChange={handleExpectedYieldChange}
              placeholder="6.5"
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 pr-10 text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">%</span>
          </div>
          {errors.expectedYieldPct ? <p className="mt-1 text-xs text-rose-400">{errors.expectedYieldPct}</p> : null}
        </motion.div>

        <motion.div {...motionProps}>
          <label className="text-sm font-medium text-foreground/90">Proof Document</label>
          <label
            htmlFor="tokenize-proof-upload"
            className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-background/40 px-6 py-6 text-center transition hover:border-primary/60"
          >
            <input
              id="tokenize-proof-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader size="sm" />
                <span>Uploading proof…</span>
              </div>
            ) : selectedFileName ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Proof ready</p>
                <CopyHash value={selectedFileName} />
              </div>
            ) : (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Drag & drop or click to upload</p>
                <p className="text-xs">PDF, JPG, PNG up to 10MB</p>
              </div>
            )}
          </label>
          {errors.proof ? <p className="mt-1 text-xs text-rose-400">{errors.proof}</p> : null}
        </motion.div>

        <motion.button
          type="submit"
          whileHover={prefersReducedMotion ? undefined : { y: -1 }}
          transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
          disabled={disableSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader size="sm" /> : null}
          {!walletConnected || !accountId
            ? "Connect Wallet First"
            : isSubmitting
              ? "Submitting Request"
              : "Submit Token Request"}
        </motion.button>
      </motion.form>
    );
  },
);

TokenizeForm.displayName = "TokenizeForm";
