"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/components/ui/toast";

export default function BridgePage() {
  const [fromNetwork, setFromNetwork] = useState("stellar");
  const [toNetwork, setToNetwork] = useState("ethereum");
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { push } = useToast();

  const mockTokens = {
    stellar: [
      { symbol: "XLM", name: "Stellar Lumens", balance: "1000.50" },
      { symbol: "USDC", name: "USD Coin", balance: "500.00" },
      { symbol: "vRWA", name: "Vesto RWA Token", balance: "100.00" },
    ],
    ethereum: [
      { symbol: "ETH", name: "Ethereum", balance: "0.5" },
      { symbol: "USDC", name: "USD Coin", balance: "1000.00" },
      { symbol: "vRWA", name: "Vesto RWA Token", balance: "50.00" },
    ],
  };

  const mockHistory = [
    {
      id: "TRX001",
      from: "Stellar",
      to: "Ethereum",
      token: "USDC",
      amount: "100.00",
      status: "completed",
      timestamp: "2024-01-15 14:30",
    },
    {
      id: "TRX002",
      from: "Ethereum",
      to: "Stellar",
      token: "vRWA",
      amount: "25.00",
      status: "pending",
      timestamp: "2024-01-15 12:15",
    },
    {
      id: "TRX003",
      from: "Stellar",
      to: "Ethereum",
      token: "XLM",
      amount: "500.00",
      status: "failed",
      timestamp: "2024-01-14 18:45",
    },
  ];

  const handleBridge = () => {
    if (!token || !amount || !recipientAddress) {
      push({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "error",
      });
      return;
    }

    push({
      title: "Bridge transaction initiated",
      description: `Bridging ${amount} ${token} from ${fromNetwork} to ${toNetwork}`,
      variant: "success",
    });

    // Reset form
    setAmount("");
    setRecipientAddress("");
  };

  const swapNetworks = () => {
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Cross-Chain Bridge</h1>
          <p className="text-muted-foreground">Transfer assets between Stellar and Ethereum networks</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <motion.div
              variants={fadeInUp}
              className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
            >
              <h2 className="text-xl font-semibold mb-6">Bridge Assets</h2>

              <div className="space-y-6">
                {/* From Network */}
                <div>
                  <label className="block text-sm font-medium mb-2">From</label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={fromNetwork}
                      onChange={(e) => setFromNetwork(e.target.value)}
                      className="rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="stellar">Stellar</option>
                      <option value="ethereum">Ethereum</option>
                    </select>
                    <select
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select token</option>
                      {mockTokens[fromNetwork as keyof typeof mockTokens].map((t) => (
                        <option key={t.symbol} value={t.symbol}>
                          {t.symbol} - {t.name} (Balance: {t.balance})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-2 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={swapNetworks}
                    className="p-2 rounded-lg border border-border/40 bg-background hover:bg-primary/10 transition"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* To Network */}
                <div>
                  <label className="block text-sm font-medium mb-2">To</label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={toNetwork}
                      onChange={(e) => setToNetwork(e.target.value)}
                      className="rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="stellar">Stellar</option>
                      <option value="ethereum">Ethereum</option>
                    </select>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder={`Recipient ${toNetwork === 'stellar' ? 'Stellar' : 'ETH'} Address`}
                      className="rounded-lg border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Bridge Info */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Bridge Fee</span>
                    <span>0.1%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Estimated Time</span>
                    <span>10-15 minutes</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>You will receive</span>
                    <span className="font-medium">{amount || "0.00"} {token}</span>
                  </div>
                </div>

                <button
                  onClick={handleBridge}
                  disabled={wallet.status !== "connected" || !token || !amount || !recipientAddress}
                  className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {wallet.status === "connected" ? "Bridge Assets" : "Connect Wallet First"}
                </button>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              variants={fadeInUp}
              className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
            >
              <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>

              <div className="space-y-3">
                {mockHistory.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    variants={fadeInUp}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg border border-border/30 bg-background/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{tx.id}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        tx.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                          : tx.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{tx.amount} {tx.token}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.from} → {tx.to}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{tx.timestamp}</p>
                    </div>
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