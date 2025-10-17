"use client";

import { useState } from "react";
import { Buffer } from "buffer";
import { useToast } from "@/src/components/ui/Toast";
import { Loader } from "@/src/components/ui/Loader";
import type { Attestation } from "@/src/lib/types/proofs";
import { uploadFile, putDagCbor, getViaGateway } from "@/src/lib/ipfs/client";
import { HORIZON, STELLAR_NET } from "@/src/utils/constants";
import { canonicalizeToCbor, signEd25519, buildAndSubmitMemoTx, type AttestationMsg } from "@/src/lib/custodian/attestation";
import { AttestationMetadataSchema } from "@/src/lib/custodian/schema";
import { deriveKeypairFromSecret } from "@/src/lib/stellar/keys";

export type UploadAttestationProps = {
  wallet: string;
  nextWeek: number;
  onUploaded: (attestation: Attestation) => void;
};

type FormErrors = Partial<Record<"reserveUSD" | "file" | "secret", string>>;

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

export const UploadAttestation = ({ wallet, nextWeek, onUploaded }: UploadAttestationProps) => {
  const { toast } = useToast();
  const [reserveUSD, setReserveUSD] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<SubmissionStage>("idle");

  const clearError = (key: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    const value = Number.parseFloat(reserveUSD.replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) {
      nextErrors.reserveUSD = "Enter the reserve value in USD.";
    }
    if (!file) {
      nextErrors.file = "Attach the signed attestation.";
    }
    if (!secret.trim()) {
      nextErrors.secret = "Provide the custodian secret key.";
    }
    setErrors(nextErrors);
    return {
      valid: Object.keys(nextErrors).length === 0,
      value,
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const { valid, value } = validate();
    if (!valid || !file) return;

    setIsSubmitting(true);
    setStage("uploading");
    try {
      const derived = deriveKeypairFromSecret(secret.trim());
      const timestamp = new Date().toISOString();
      const nonce = generateNonce();

      const fileCid = await uploadFile(file);

      const metadata = AttestationMetadataSchema.parse({
        schema: "vesto.attestation.metadata@1",
        week: nextWeek,
        reserveAmount: value,
        fileCid,
        issuer: wallet,
        timestamp,
        mime: file.type || "application/octet-stream",
        size: file.size,
      });

      const metadataCid = await putDagCbor(metadata);

      setStage("signing");
      const message: AttestationMsg = {
        week: nextWeek,
        reserveAmount: value,
        timestamp,
        nonce,
      };
      const messageBytes = canonicalizeToCbor(message);
      const signatureBytes = await signEd25519(derived.secretKeyRaw, messageBytes);
      const signature = Buffer.from(signatureBytes).toString("base64");

      setStage("submitting");
      const { txHash } = await buildAndSubmitMemoTx({
        secret: secret.trim(),
        memoCid: metadataCid,
        serverUrl: HORIZON,
        networkPassphrase: getNetworkPassphrase(),
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
        signedBy: derived.publicKey,
        signature,
        signatureType: "ed25519",
        nonce,
        status: "Pending",
        ts: timestamp,
        txHash,
      };

      onUploaded(attestation);
      toast({
        title: "Attestation submitted",
        description: `Week ${nextWeek} signed and broadcasted.`,
        variant: "success",
      });
      setReserveUSD("");
      setFile(null);
      setSecret("");
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
        <label className="text-sm font-medium text-foreground/90">Custodian Secret (ed25519 seed)</label>
        <input
          type="password"
          value={secret}
          onChange={(event) => {
            setSecret(event.target.value);
            clearError("secret");
          }}
          placeholder="S..."
          className="mt-2 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {errors.secret ? <p className="mt-1 text-xs text-rose-400">{errors.secret}</p> : null}
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
          {file ? (
            <p className="text-sm font-medium text-foreground">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Drop file or click to browse</p>
          )}
        </label>
        {errors.file ? <p className="mt-1 text-xs text-rose-400">{errors.file}</p> : null}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader size="sm" /> : null}
        {isSubmitting
          ? stage === "uploading"
            ? "Uploading"
            : stage === "signing"
            ? "Signing"
            : "Submitting"
          : "Upload Attestation"}
      </button>
    </form>
  );
};
