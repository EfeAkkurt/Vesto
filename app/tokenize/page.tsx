"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/components/ui/toast";

export default function TokenizePage() {
  const [selectedAsset, setSelectedAsset] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { push } = useToast();

  const handleTokenize = () => {
    if (!assetName || !assetValue) {
      push({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "error",
      });
      return;
    }

    push({
      title: "Tokenization initiated",
      description: `Creating token for ${assetName} valued at $${assetValue}`,
      variant: "success",
    });

    // Reset form
    setAssetName("");
    setAssetValue("");
    setSelectedAsset("");
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Tokenize Assets</h1>
          <p className="text-muted-foreground">Convert real-world assets into digital tokens on the Stellar network</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            variants={fadeInUp}
            className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
          >
            <h2 className="text-xl font-semibold mb-4">Asset Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Asset Type</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select asset type</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="commodities">Commodities</option>
                  <option value="equity">Private Equity</option>
                  <option value="art">Art & Collectibles</option>
                  <option value="intellectual">Intellectual Property</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Asset Name</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g., Manhattan Property #42B"
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Asset Value (USD)</label>
                <input
                  type="number"
                  value={assetValue}
                  onChange={(e) => setAssetValue(e.target.value)}
                  placeholder="1000000"
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <button
                onClick={handleTokenize}
                disabled={wallet.status !== "connected"}
                className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wallet.status === "connected" ? "Tokenize Asset" : "Connect Wallet First"}
              </button>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
          >
            <h2 className="text-xl font-semibold mb-4">Tokenization Process</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  1
                </div>
                <div>
                  <h3 className="font-medium">Asset Verification</h3>
                  <p className="text-sm text-muted-foreground">Submit documentation for asset verification</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  2
                </div>
                <div>
                  <h3 className="font-medium">Custodian Approval</h3>
                  <p className="text-sm text-muted-foreground">Wait for custodian to review and approve</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  3
                </div>
                <div>
                  <h3 className="font-medium">Token Creation</h3>
                  <p className="text-sm text-muted-foreground">Digital tokens are minted on Stellar</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  4
                </div>
                <div>
                  <h3 className="font-medium">Trading Enabled</h3>
                  <p className="text-sm text-muted-foreground">Tokens become available for trading</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </LayoutShell>
  );
}