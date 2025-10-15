"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/components/ui/toast";

export default function ProofsPage() {
  const [selectedProof, setSelectedProof] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { push } = useToast();

  const mockProofs = [
    {
      id: "PRF001",
      type: "Ownership Certificate",
      assetName: "Manhattan Property A",
      status: "verified",
      createdAt: "2024-01-15",
      verifiedBy: "Vesto Custodian",
      hash: "0x7f9a...3b2c",
    },
    {
      id: "PRF002",
      type: "Appraisal Report",
      assetName: "Gold Bullion #1234",
      status: "pending",
      createdAt: "2024-01-14",
      verifiedBy: "Pending",
      hash: "0x8d2e...5a1f",
    },
    {
      id: "PRF003",
      type: "Legal Documentation",
      assetName: "Tech Startup Shares",
      status: "verified",
      createdAt: "2024-01-13",
      verifiedBy: "Legal Team",
      hash: "0x3c7b...9d4e",
    },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProofFile(file);
      push({
        title: "File uploaded",
        description: `${file.name} ready for submission`,
        variant: "info",
      });
    }
  };

  const handleSubmitProof = () => {
    if (!proofFile || !selectedProof) {
      push({
        title: "Missing information",
        description: "Please select proof type and upload a file",
        variant: "error",
      });
      return;
    }

    push({
      title: "Proof submitted",
      description: "Your proof has been submitted for verification",
      variant: "success",
    });

    // Reset form
    setProofFile(null);
    setSelectedProof("");
  };

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={transitions.base}
        className="container mx-auto px-4 py-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Proof Management</h1>
          <p className="text-muted-foreground">Manage and verify asset ownership documents and proofs</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <motion.div
              variants={fadeInUp}
              className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
            >
              <h2 className="text-xl font-semibold mb-4">Submit New Proof</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Proof Type</label>
                  <select
                    value={selectedProof}
                    onChange={(e) => setSelectedProof(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select proof type</option>
                    <option value="ownership">Ownership Certificate</option>
                    <option value="appraisal">Appraisal Report</option>
                    <option value="legal">Legal Documentation</option>
                    <option value="audit">Audit Report</option>
                    <option value="insurance">Insurance Certificate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Upload Document</label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="proof-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="proof-upload"
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border/40 rounded-lg cursor-pointer hover:border-primary/50 transition"
                    >
                      <div className="text-center">
                        {proofFile ? (
                          <>
                            <p className="text-sm font-medium">{proofFile.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">Click to upload</p>
                            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 10MB)</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSubmitProof}
                  disabled={wallet.status !== "connected" || !proofFile}
                  className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {wallet.status === "connected" ? "Submit Proof" : "Connect Wallet First"}
                </button>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              variants={fadeInUp}
              className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
            >
              <h2 className="text-xl font-semibold mb-4">Your Proofs</h2>

              <div className="space-y-4">
                {mockProofs.map((proof, index) => (
                  <motion.div
                    key={proof.id}
                    variants={fadeInUp}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/30 bg-background/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{proof.type}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          proof.status === "verified"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                        }`}>
                          {proof.status.charAt(0).toUpperCase() + proof.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Asset</p>
                          <p className="font-medium">{proof.assetName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium">{proof.createdAt}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Verified By</p>
                          <p className="font-medium">{proof.verifiedBy}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hash</p>
                          <p className="font-mono text-xs">{proof.hash}</p>
                        </div>
                      </div>
                    </div>

                    <button className="ml-4 p-2 rounded-lg hover:bg-primary/10 transition">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </LayoutShell>
  );
}