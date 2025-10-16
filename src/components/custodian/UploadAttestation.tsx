"use client";

import { useState } from "react";
import { useToast } from "@/src/components/ui/Toast";
import { Loader } from "@/src/components/ui/Loader";
import { mockUpload } from "@/src/lib/utils/ipfs";
import type { Attestation } from "@/src/lib/types/proofs";

export type UploadAttestationProps = {
  wallet: string;
  nextWeek: number;
  onUploaded: (attestation: Attestation) => void;
};

type FormErrors = Partial<Record<"reserveUSD" | "file", string>>;

export const UploadAttestation = ({ wallet, nextWeek, onUploaded }: UploadAttestationProps) => {
  const { toast } = useToast();
  const [reserveUSD, setReserveUSD] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    try {
      const proof = await mockUpload(file);
      const attestation: Attestation = {
        week: nextWeek,
        reserveUSD: value,
        ipfs: proof,
        signedBy: wallet,
        status: "Verified",
        ts: new Date().toISOString(),
      };
      onUploaded(attestation);
      toast({ title: "Attestation uploaded", description: `Week ${nextWeek} added to the log.`, variant: "success" });
      setReserveUSD("");
      setFile(null);
      setErrors({});
    } catch (error) {
      console.error("Failed to upload attestation", error);
      toast({ title: "Upload failed", description: "Please retry in a moment.", variant: "error" });
    } finally {
      setIsSubmitting(false);
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
        <label className="text-sm font-medium text-foreground/90">Signed Attestation (PDF)</label>
        <label
          htmlFor="attestation-upload"
          className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-background/40 px-6 py-6 text-center transition hover:border-primary/60"
        >
          <input
            id="attestation-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
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
        {isSubmitting ? "Saving" : "Upload Attestation"}
      </button>
    </form>
  );
};
