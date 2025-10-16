"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/src/components/ui/Toast";
import { QuickAccessCards } from "@/src/components/proofs/QuickAccessCards";
import { SpvStatus } from "@/src/components/proofs/SpvStatus";
import { ReserveMiniChart } from "@/src/components/proofs/ReserveMiniChart";
import { ProofRowActions } from "@/src/components/proofs/ProofRowActions";
import { ProofsEmpty } from "@/src/components/proofs/ProofsEmpty";
import { ProofsSkeleton } from "@/src/components/proofs/ProofsSkeleton";
import {
  proofsMock,
  quickAccessProofs,
  reserveSeries,
  spvStatusMock,
} from "@/src/lib/mock/proofs";
import type { ProofItem } from "@/src/lib/types/proofs";
import { formatDate } from "@/src/lib/utils/format";

const proofTypeOptions: ProofItem["type"][] = [
  "Audit Report",
  "Insurance Policy",
  "Legal Agreement",
  "Ownership",
  "Appraisal",
  "Other",
];

const generateHash = () => {
  const segment = () => Math.random().toString(16).slice(2, 10);
  return `0x${segment()}${segment()}`;
};

const statusStyles: Record<ProofItem["status"], string> = {
  Verified: "bg-emerald-500/15 text-emerald-300",
  Pending: "bg-amber-400/15 text-amber-300",
  Rejected: "bg-rose-500/15 text-rose-300",
};

export default function ProofsPage() {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [selectedType, setSelectedType] = useState<ProofItem["type"] | "">("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proofs, setProofs] = useState<ProofItem[]>([]);

  useEffect(() => {
    setProofs(proofsMock);
    const timer = window.setTimeout(() => setIsLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setProofFile(file ?? null);
    if (file) {
      toast({
        title: "File staged",
        description: `${file.name} ready for upload`,
        variant: "info",
      });
    }
  };

  const handleSubmitProof = () => {
    if (!proofFile || !selectedType) {
      toast({
        title: "Missing details",
        description: "Select a proof type and upload a document first.",
        variant: "error",
      });
      return;
    }

    const newProof: ProofItem = {
      id: `proof-${Date.now()}`,
      type: selectedType,
      asset: proofFile.name.replace(/\.[^.]+$/, ""),
      status: "Pending",
      hash: generateHash(),
      url: "ipfs://QmPendingUpload",
      date: new Date().toISOString(),
      verifiedBy: wallet.address ?? "Pending",
    };

    setProofs((prev) => [newProof, ...prev]);

    toast({
      title: "Proof submitted",
      description: `${proofFile.name} queued for verification`,
      variant: "success",
    });

    setProofFile(null);
    setSelectedType("");
  };

  const proofVariants = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      } as const;
    }
    return fadeInUp;
  }, [prefersReducedMotion]);

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate={"visible"}
        variants={proofVariants}
        transition={transitions.base}
        className="container mx-auto px-4 py-8"
      >
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Proof Management</h1>
          <p className="text-muted-foreground">
            Centralize audits, insurance certificates, and legal agreements for your reserves.
          </p>
        </header>

        <section className="space-y-6">
          <QuickAccessCards items={quickAccessProofs} />

          <div className="grid gap-4 lg:grid-cols-3">
            <SpvStatus active={spvStatusMock.active} lastUpdated={spvStatusMock.lastUpdated} className="lg:col-span-1" />
            <div className="lg:col-span-2">
              <ReserveMiniChart data={reserveSeries} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <motion.div
              variants={proofVariants}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
            >
              <h2 className="text-xl font-semibold">Submit New Proof</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload supporting documentation for your custodial assets. Files remain client-side until submitted.
              </p>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/90">Proof Type</label>
                  <select
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value as ProofItem["type"] | "")}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select proof type</option>
                    {proofTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground/90">Upload Document</label>
                  <label
                    htmlFor="proof-upload"
                    className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-background/40 text-center transition hover:border-primary/60"
                  >
                    <input
                      id="proof-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {proofFile ? (
                      <div className="px-6">
                        <p className="text-sm font-medium text-foreground">{proofFile.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="px-6">
                        <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                        <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={wallet.status !== "connected" || !proofFile || !selectedType}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {wallet.status === "connected" ? "Submit Proof" : "Connect Wallet First"}
                </button>
              </div>
            </motion.div>

            <motion.section
              variants={proofVariants}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
            >
              <header className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold">Your Proofs</h2>
                  <p className="text-sm text-muted-foreground">Latest submissions and verification status.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {proofs.length} items
                </span>
              </header>

              <div className="mt-5">
                {isLoading ? (
                  <ProofsSkeleton />
                ) : proofs.length === 0 ? (
                  <ProofsEmpty />
                ) : (
                  <div className="space-y-4">
                    {proofs.map((proof) => (
                      <article
                        key={proof.id}
                        className="rounded-xl border border-border/40 bg-background/40 p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{proof.type}</p>
                            <p className="text-xs text-muted-foreground">{proof.asset ?? "Unassigned asset"}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[proof.status]}`}>
                            {proof.status}
                          </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                          <div>
                            <dt className="uppercase tracking-wide">Hash</dt>
                            <dd className="mt-1 font-mono text-[11px] text-foreground/80">{proof.hash}</dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-wide">Date</dt>
                            <dd className="mt-1 text-foreground/80">{formatDate(proof.date)}</dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-wide">Verified By</dt>
                            <dd className="mt-1 text-foreground/80">{proof.verifiedBy ?? "—"}</dd>
                          </div>
                        </dl>

                        <div className="mt-4">
                          <ProofRowActions url={proof.url} hash={proof.hash} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        </section>
      </motion.div>
    </LayoutShell>
  );
}
