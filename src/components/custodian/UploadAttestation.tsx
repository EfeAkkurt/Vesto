"use client";

import { useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";
import { useToast } from "@/src/components/ui/Toast";
import { Loader } from "@/src/components/ui/Loader";
import type { Attestation } from "@/src/lib/types/proofs";
import { MANAGE_DATA_SIGNATURE } from "@/src/lib/types/proofs";
import { uploadFile, putDagCbor, getViaGateway } from "@/src/lib/ipfs/client";
import { HORIZON, STELLAR_NET } from "@/src/utils/constants";
import { submitAttestationTransaction } from "@/src/lib/custodian/attestation";
import { AttestationMetadataSchema } from "@/src/lib/custodian/schema";
import type { TokenizationRequest } from "@/src/lib/custodian/requests";
import { refreshDashboardAll, refreshProofsAll } from "@/src/lib/swr/mutateBus";

export type UploadAttestationProps = {
  accountId?: string;
  connected: boolean;
  nextWeek: number;
  onUploaded: (attestation: Attestation) => void;
  request?: TokenizationRequest | null;
  onRequestCleared?: () => void;
};

type FormErrors = Partial<Record<"reserveUSD" | "file", string>>;

type SubmissionStage = "idle" | "uploading" | "signing" | "submitting";

const NETWORK_PASSPHRASES = {
  MAINNET: "Public Global Stellar Network ; September 2015",
  TESTNET: "Test SDF Network ; September 2015",
} as const;

const getNetworkPassphrase = () =>
  STELLAR_NET?.toUpperCase() === "MAINNET" ? NETWORK_PASSPHRASES.MAINNET : NETWORK_PASSPHRASES.TESTNET;

const generateNonce = () => {
  const source = globalThis.crypto?.getRandomValues(new Uint8Array(16));
  const bytes = source ?? Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  return Buffer.from(bytes).toString("hex");
};

export const UploadAttestation = ({ accountId, connected, nextWeek, onUploaded, request, onRequestCleared }: UploadAttestationProps) => {
  const { toast } = useToast();
  const [reserveUSD, setReserveUSD] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<SubmissionStage>("idle");
  const [lastSubmission, setLastSubmission] = useState<{ txHash: string; metadataCid: string } | null>(null);

  const requestCid = request?.memo.kind === "cid" ? request.memo.value : undefined;
  const explorerNetworkSegment = STELLAR_NET?.toLowerCase() === "mainnet" ? "public" : "testnet";

  useEffect(() => {
    if (!request) return;
    if (!reserveUSD || reserveUSD === "0" || reserveUSD === "") {
      const metaValue = request?.meta?.valueUsd;
      const value = Number.isFinite(metaValue ?? NaN) ? metaValue : undefined;
      if (value != null) {
        setReserveUSD(String(value));
      }
    }
  }, [request, reserveUSD]);

  const clearError = (key: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const numericReserve = useMemo(() => Number.parseFloat(reserveUSD.replace(/,/g, "")), [reserveUSD]);

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!Number.isFinite(numericReserve) || numericReserve <= 0) {
      nextErrors.reserveUSD = "Enter the reserve value in USD.";
    }
    if (!file) {
      nextErrors.file = "Attach the signed attestation.";
    }
    setErrors(nextErrors);
    return {
      valid: Object.keys(nextErrors).length === 0,
      value: numericReserve,
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !connected || !accountId) {
      if (!connected || !accountId) {
        toast({
          title: "Connect wallet",
          description: "Freighter must be connected before uploading attestation proofs.",
          variant: "warning",
        });
      }
      return;
    }
    const { valid, value } = validate();
    if (!valid || !file) return;

    setIsSubmitting(true);
    setStage("uploading");
    try {
      const timestamp = new Date().toISOString();
      const nonce = generateNonce();
      const networkPassphrase = getNetworkPassphrase();

      const fileCid = await uploadFile(file);

      const metadataBase = {
        schema: "vesto.attestation.metadata@1",
        week: nextWeek,
        reserveAmount: value,
        fileCid,
        proofCid: request?.meta?.proofCid ?? fileCid,
        issuer: accountId,
        timestamp,
        mime: file.type || "application/octet-stream",
        size: file.size,
        attestation: {
          nonce,
          signedBy: accountId,
          signature: MANAGE_DATA_SIGNATURE,
          requestCid,
        },
        request: requestCid
          ? {
              cid: requestCid,
              asset: request?.meta
                ? {
                    type: request.meta.type ?? "Unknown",
                    name: request.meta.name ?? "Tokenized Asset",
                    valueUSD: request.meta.valueUsd ?? value ?? 0,
                  }
                : undefined,
            }
          : undefined,
      } satisfies Parameters<typeof AttestationMetadataSchema.parse>[0];
      AttestationMetadataSchema.parse(metadataBase);

      const metadataCid = await putDagCbor(metadataBase);

      setStage("signing");
      const memoHashHex = request?.memo.kind === "hash" ? request.memo.value : undefined;
      const { txHash, signatureCount } = await submitAttestationTransaction({
        account: accountId,
        metadataCid,
        memoHashHex,
        networkPassphrase,
        serverUrl: HORIZON,
      });

      setStage("submitting");

      await refreshProofsAll();
      await refreshDashboardAll();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const attestation: Attestation = {
        week: nextWeek,
        reserveUSD: value,
        ipfs: {
          hash: fileCid,
          url: getViaGateway(fileCid),
          size: file.size,
          mime: file.type || "application/octet-stream",
        },
        metadataCid,
        memoHashHex,
        signedBy: accountId,
        signature: MANAGE_DATA_SIGNATURE,
        signatureType: "manageData",
        nonce,
        signatureCount,
        sigCount: signatureCount,
        status: "Verified",
        ts: timestamp,
        txHash,
        requestCid,
        txSourceAccount: accountId,
        metadataFetchFailed: false,
        metadataFailureReason: undefined,
      };

      onUploaded(attestation);
      onRequestCleared?.();
      setLastSubmission({ txHash, metadataCid });
      toast({
        title: "On-chain attestation ✅",
        description: `Week ${nextWeek} anchored on Stellar.`,
        variant: "success",
      });
      setReserveUSD("");
      setFile(null);
      setErrors({});
    } catch (error) {
      console.error("Failed to upload attestation", error);
      toast({ title: "Attestation failed", description: "Check credentials and try again.", variant: "error" });
    } finally {
      setIsSubmitting(false);
      setStage("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6">
      {lastSubmission ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">On-chain attestation ✅</p>
              <p className="mt-1 break-all font-mono text-[11px] text-primary/80">{lastSubmission.txHash}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://stellar.expert/explorer/${explorerNetworkSegment}/tx/${lastSubmission.txHash}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold transition hover:border-primary/60 hover:text-primary"
            >
              View on StellarExpert
            </button>
          </div>
        </div>
      ) : null}

      {!connected || !accountId ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
          Connect wallet to sign attestation.
        </div>
      ) : null}

      {requestCid ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Responding to request</p>
              <p className="mt-1 break-all font-mono text-[11px]">{requestCid}</p>
              {request ? (
                <div className="mt-2 space-y-1 text-[11px] text-primary/80">
                  {request.meta?.name ? (
                    <p>
                      {request.meta.name} · {request.meta.type ?? "Asset"}
                    </p>
                  ) : (
                    <p>
                      Hash reference · {(request.memo.kind === "hash" ? request.memo.value.slice(0, 12) : request.txHash.slice(0, 12))}…
                    </p>
                  )}
                  {Number.isFinite(request.meta?.valueUsd ?? NaN) ? (
                    <p>
                      ≈ {request.meta?.valueUsd?.toLocaleString()} USD · Proof {request.meta?.proofCid?.slice(0, 6) ?? "—"}…
                    </p>
                  ) : (
                    <p>
                      {request.amount} XLM · From {request.from.slice(0, 6)}…
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onRequestCleared}
              className="rounded-full border border-primary/30 px-2 py-1 text-[11px] font-semibold transition hover:border-primary/60"
            >
              Clear
            </button>
          </div>
        </div>
      ) : request?.memo.kind === "hash" ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Responding to hash-only reference</p>
              <p className="mt-1 break-all font-mono text-[11px]">{request.memo.value}</p>
              <div className="mt-2 space-y-1 text-[11px] text-primary/80">
                <p>
                  {request.amount} XLM received from {request.from.slice(0, 6)}…
                </p>
                <p>Attach attestation referencing this memo hash.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestCleared}
              className="rounded-full border border-primary/30 px-2 py-1 text-[11px] font-semibold transition hover:border-primary/60"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium text-foreground/90">Reserve (USD)</label>
        <input
          type="number"
          min="0"
          step="any"
          value={reserveUSD}
          onChange={(event) => {
            setReserveUSD(event.target.value);
            clearError("reserveUSD");
          }}
          placeholder="520000"
          className="mt-2 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {errors.reserveUSD ? <p className="mt-1 text-xs text-rose-400">{errors.reserveUSD}</p> : null}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground/90">Signed Attestation (PDF)</label>
        <label
          htmlFor="attestation-upload"
          className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-background/40 px-6 py-6 text-center transition hover:border-primary/60"
        >
          <input
            id="attestation-upload"
            type="file"
            accept=".pdf,.json,.jpg,.jpeg,.png"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              clearError("file");
            }}
            className="hidden"
          />
          {stage === "uploading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader size="sm" />
              <span>Uploading proof…</span>
            </div>
          ) : file ? (
            <p className="text-sm font-medium text-foreground">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Drop file or click to browse</p>
          )}
        </label>
        {errors.file ? <p className="mt-1 text-xs text-rose-400">{errors.file}</p> : null}
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !connected || !accountId}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader size="sm" /> : null}
        {isSubmitting
          ? stage === "uploading"
            ? "Uploading"
            : stage === "signing"
              ? "Signing"
              : "Submitting"
          : connected && accountId
            ? "Upload Attestation"
            : "Connect Freighter to Upload"}
      </button>
    </form>
  );
};
