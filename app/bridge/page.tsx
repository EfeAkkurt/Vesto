"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/src/components/ui/Toast";
import { NetworkMismatch } from "@/src/components/bridge/NetworkMismatch";
import { TotalLockedMini } from "@/src/components/bridge/TotalLockedMini";
import { ProgressModal } from "@/src/components/bridge/ProgressModal";
import { isValidEth, isValidStellar } from "@/src/components/bridge/validators";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { Loader } from "@/src/components/ui/Loader";
import { formatNumber } from "@/src/lib/utils/format";
import type { BridgeTx, Chain } from "@/src/lib/types/proofs";

const chains: Chain[] = ["Stellar", "Ethereum", "Solana"];

const tokensByChain: Record<Chain, Array<{ symbol: string; name: string; balance: number }>> = {
  Stellar: [
    { symbol: "XLM", name: "Stellar Lumens", balance: 1240.5 },
    { symbol: "USDC", name: "USD Coin", balance: 560.0 },
    { symbol: "vRWA", name: "Vesto RWA", balance: 92.4 },
  ],
  Ethereum: [
    { symbol: "ETH", name: "Ethereum", balance: 0.82 },
    { symbol: "USDC", name: "USD Coin", balance: 845.6 },
    { symbol: "vRWA", name: "Vesto RWA", balance: 33.2 },
  ],
  Solana: [
    { symbol: "SOL", name: "Solana", balance: 14.2 },
    { symbol: "USDC", name: "USD Coin", balance: 300.0 },
  ],
};

const lockedSeries = [
  { date: "2024-01-09", lockedUSD: 482000 },
  { date: "2024-01-10", lockedUSD: 486200 },
  { date: "2024-01-11", lockedUSD: 491500 },
  { date: "2024-01-12", lockedUSD: 497800 },
  { date: "2024-01-13", lockedUSD: 503200 },
  { date: "2024-01-14", lockedUSD: 508400 },
  { date: "2024-01-15", lockedUSD: 515000 },
];

const explorerByChain: Record<Chain, string> = {
  Stellar: "https://stellar.expert/explorer/public/tx/",
  Ethereum: "https://etherscan.io/tx/",
  Solana: "https://solscan.io/tx/",
};

const historyMock: BridgeTx[] = [
  {
    id: "BR-001",
    chainFrom: "Stellar",
    chainTo: "Ethereum",
    asset: "USDC",
    amount: 150,
    hash: "0x7f9a4d2c9b01e8f6c3b2c19642a1ff13fbc2af76",
    status: "completed",
    ts: "2024-01-15T14:30:00.000Z",
    explorer: `${explorerByChain.Ethereum}0x7f9a4d2c9b01e8f6c3b2c19642a1ff13fbc2af76`,
  },
  {
    id: "BR-002",
    chainFrom: "Ethereum",
    chainTo: "Stellar",
    asset: "vRWA",
    amount: 45,
    hash: "0x8d2e5a1f3b2e1c4a6d7e8f9b0c1d2e3f4a5b6c7d",
    status: "pending",
    ts: "2024-01-15T12:15:00.000Z",
    explorer: `${explorerByChain.Ethereum}0x8d2e5a1f3b2e1c4a6d7e8f9b0c1d2e3f4a5b6c7d`,
  },
  {
    id: "BR-003",
    chainFrom: "Stellar",
    chainTo: "Solana",
    asset: "XLM",
    amount: 520,
    hash: "0x3c7b9d4e2a1c5f6d7e8f9b0c1d2e3f4a5b6c7d8e",
    status: "failed",
    ts: "2024-01-14T18:45:00.000Z",
    explorer: `${explorerByChain.Stellar}3c7b9d4e2a1c5f6d7e8f9b0c1d2e3f4a5b6c7d8e`,
  },
];

const statusStyles: Record<BridgeTx["status"], string> = {
  completed: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-200",
  failed: "bg-rose-500/15 text-rose-300",
};

const formatDirection = (from: Chain, to: Chain) => `${from} → ${to}`;

const validateAddress = (chain: Chain, value: string) => {
  if (!value) return false;
  if (chain === "Ethereum") return isValidEth(value);
  if (chain === "Stellar") return isValidStellar(value);
  return value.trim().length >= 32;
};

export default function BridgePage() {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [fromChain, setFromChain] = useState<Chain>("Stellar");
  const [toChain, setToChain] = useState<Chain>("Ethereum");
  const [token, setToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);

  const walletChain: Chain | null = wallet.status === "connected" ? "Stellar" : null;

  const addressValid = useMemo(
    () => validateAddress(toChain, recipientAddress),
    [recipientAddress, toChain],
  );

  const amountValue = Number.parseFloat(amount);
  const canSubmit =
    wallet.status === "connected" &&
    token !== "" &&
    amountValue > 0 &&
    !Number.isNaN(amountValue) &&
    addressValid &&
    !isSubmitting;

  const sameChain = fromChain === toChain;

  const handleSwap = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setToken("");
  };

  const handleBridge = () => {
    if (!canSubmit) {
      toast({
        title: "Check details",
        description: "Complete all fields before bridging",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    toast({
      title: "Bridge initiated",
      description: `Moving ${amount} ${token} from ${fromChain} to ${toChain}`,
      variant: "info",
    });
    setModalOpen(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setAmount("");
      setRecipientAddress("");
    }, 600);
  };

  const variants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeInUp;

  const tokens = tokensByChain[fromChain];

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate="visible"
        variants={variants}
        transition={transitions.base}
        className="container mx-auto px-4 py-8"
      >
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Cross-Chain Bridge</h1>
          <p className="text-muted-foreground">
            Transfer assets between Stellar, Ethereum, and Solana while keeping full custody visibility.
          </p>
        </header>

        <ProgressModal open={isModalOpen} onClose={() => setModalOpen(false)} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          <motion.section
            variants={variants}
            className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Bridge Assets</h2>
                <p className="text-sm text-muted-foreground">
                  Choose source and destination networks, then confirm the recipient address.
                </p>
              </div>
              {isSubmitting ? <Loader size="sm" className="text-primary" /> : null}
            </header>

            <div className="mt-5 space-y-5">
              <NetworkMismatch
                walletChain={walletChain}
                selectedChain={fromChain}
                onSwitch={() => toast({
                  title: "Switch network",
                  description: "Network switching is simulated in this demo.",
                  variant: "info",
                })}
              />

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/90">From</label>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,160px),1fr]">
                  <select
                    value={fromChain}
                    onChange={(event) => {
                      const next = event.target.value as Chain;
                      setFromChain(next);
                      setToken("");
                    }}
                    className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {chains.map((chain) => (
                      <option key={chain} value={chain}>
                        {chain}
                      </option>
                    ))}
                  </select>
                  <select
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select token</option>
                    {tokens.map((item) => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.symbol} • {item.name} (Balance: {formatNumber(item.balance, 2)})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="rounded-full border border-border/50 bg-background/60 p-2 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                  aria-label="Swap networks"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M5 6h10M5 6l2-2m-2 2l2 2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 14H5m10 0l-2 2m2-2l-2-2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/90">To</label>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,160px),1fr]">
                  <select
                    value={toChain}
                    onChange={(event) => setToChain(event.target.value as Chain)}
                    className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {chains.map((chain) => (
                      <option key={chain} value={chain}>
                        {chain}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(event) => setRecipientAddress(event.target.value)}
                    placeholder={`Recipient ${toChain} address`}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                {!addressValid && recipientAddress ? (
                  <p className="text-xs text-rose-400">
                    {toChain === "Ethereum" && "Enter a valid Ethereum address (0x...)"}
                    {toChain === "Stellar" && "Enter a valid Stellar public key (starts with G)"}
                    {toChain === "Solana" && "Enter a valid Solana address (32+ characters)"}
                  </p>
                ) : null}
                {sameChain ? (
                  <p className="text-xs text-muted-foreground">Same-chain transfer (no bridge).</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/40 bg-background/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Bridge fee</span>
                  <span>0.10%</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Estimated time</span>
                  <span>10-15 minutes</span>
                </div>
                <div className="mt-2 flex items-center justify-between font-medium">
                  <span>You receive</span>
                  <span>
                    {amount && !Number.isNaN(amountValue) ? `${amount} ${token || "—"}` : "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBridge}
                disabled={!canSubmit}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Processing" : wallet.status === "connected" ? "Bridge Assets" : "Connect Wallet First"}
              </button>
            </div>
          </motion.section>

          <motion.aside
            variants={variants}
            className="space-y-6"
          >
            <TotalLockedMini data={lockedSeries} />

            <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
              <p className="text-sm text-muted-foreground">Latest bridge activity across chains.</p>

              <div className="mt-4 space-y-3">
                {historyMock.map((tx) => (
                  <article
                    key={tx.id}
                    className="rounded-xl border border-border/40 bg-background/40 p-4 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">{tx.id}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {tx.amount} {tx.asset}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDirection(tx.chainFrom, tx.chainTo)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[tx.status]}`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(tx.ts).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <CopyHash value={tx.hash} />
                        {tx.explorer ? (
                          <button
                            type="button"
                            onClick={() => window.open(tx.explorer ?? `${explorerByChain[tx.chainTo]}${tx.hash}`, "_blank", "noopener,noreferrer")}
                            className="rounded-full border border-border/50 bg-background/40 px-3 py-1 font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                          >
                            Explorer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </motion.aside>
        </div>
      </motion.div>
    </LayoutShell>
  );
}
