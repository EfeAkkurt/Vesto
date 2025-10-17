"use client";

import { useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";
import { useToast } from "@/src/components/ui/Toast";
import { Loader } from "@/src/components/ui/Loader";
import type { Attestation } from "@/src/lib/types/proofs";
import { uploadFile, putDagCbor, getViaGateway } from "@/src/lib/ipfs/client";
import { HORIZON, STELLAR_NET } from "@/src/utils/constants";
import { serializeAttestationMessage, buildAndSubmitMemoTx, type AttestationMsg } from "@/src/lib/custodian/attestation";
import { AttestationMetadataSchema } from "@/src/lib/custodian/schema";
import { signUserMessage } from "@/lib/wallet/freighter";
import type { TokenizationRequest } from "@/src/lib/custodian/requests";

export type UploadAttestationProps = {
  accountId?: string;
  connected: boolean;
  preferredDestination?: string;
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

export const UploadAttestation = ({ accountId, connected, preferredDestination, nextWeek, onUploaded, request, onRequestCleared }: UploadAttestationProps) => {
  const { toast } = useToast();
  const [reserveUSD, setReserveUSD] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<SubmissionStage>("idle");

  const requestCid = request?.metadataCid;

  useEffect(() => {
    if (!request) return;
    if (!reserveUSD || reserveUSD === "0" || reserveUSD === "") {
      const value = Number.isFinite(request.valueUSD) ? request.valueUSD : undefined;
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

      const fileCid = await uploadFile(file);

      const metadataBase = {
        schema: "vesto.attestation.metadata@1",
        week: nextWeek,
        reserveAmount: value,
        fileCid,
        issuer: accountId,
        timestamp,
        mime: file.type || "application/octet-stream",
        size: file.size,
      } satisfies Parameters<typeof AttestationMetadataSchema.parse>[0];
      AttestationMetadataSchema.parse(metadataBase);

      setStage("signing");
      const message: AttestationMsg = {
        week: nextWeek,
        reserveAmount: value,
        timestamp,
        nonce,
      };
      const { base64 } = serializeAttestationMessage(message);
      const signatureResponse = await signUserMessage(base64, accountId);
      const signedMessage = signatureResponse.signedMessage;
      if (!signedMessage) {
        throw new Error("Freighter did not return a signature payload.");
      }
      const signatureBytes =
        typeof signedMessage === "string"
          ? Buffer.from(signedMessage, "base64")
          : Buffer.isBuffer(signedMessage)
            ? signedMessage
            : Buffer.from(signedMessage);
      const signatureBase64 = Buffer.from(signatureBytes).toString("base64");

      const metadataEnvelope = {
        ...metadataBase,
        attestation: {
          nonce,
          signature: signatureBase64,
          signedBy: signatureResponse.signerAddress ?? accountId,
          message: base64,
          requestCid,
        },
        request: requestCid
          ? {
              cid: requestCid,
              asset: request
                ? {
                    type: request.assetType,
                    name: request.assetName,
                    valueUSD: request.valueUSD,
                  }
                : undefined,
            }
          : undefined,
      };

      const metadataCid = await putDagCbor(metadataEnvelope);

      setStage("submitting");
      const { txHash } = await buildAndSubmitMemoTx({
        account: accountId,
        memoCid: metadataCid,
        serverUrl: HORIZON,
        networkPassphrase: getNetworkPassphrase(),
        destination: preferredDestination,
      });

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
        signedBy: signatureResponse.signerAddress ?? accountId,
        signature: signatureBase64,
        signatureType: "ed25519",
        nonce,
        status: "Pending",
        ts: timestamp,
        txHash,
        requestCid,
      };

      onUploaded(attestation);
      onRequestCleared?.();
      toast({
        title: "Attestation submitted",
        description: `Week ${nextWeek} signed and broadcasted.`,
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
      {requestCid ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Responding to request</p>
              <p className="mt-1 break-all font-mono text-[11px]">{requestCid}</p>
              {request ? (
                <div className="mt-2 text-[11px] text-primary/80">
                  <p>
                    {request.assetName} · {request.assetType}
                  </p>
                  <p>${" "}
                    {request.valueUSD.toLocaleString()} USD · Proof {request.proofCid.slice(0, 6)}…
                  </p>
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
