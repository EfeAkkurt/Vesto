"use client";

import type { FC } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { NetworkHealth } from "@/src/hooks/useNetworkHealth";
import type { HorizonAccount } from "@/src/hooks/horizon";
import type { WalletHook } from "@/src/hooks/useWallet";
import { transitions, fadeScale } from "@/src/components/motion/presets";
import { formatCurrency, formatDateTime, shortAddress } from "@/src/lib/utils/format";

const formatLatency = (latencyMs: number) => {
  if (!Number.isFinite(latencyMs) || latencyMs <= 0) return "<1s";
  if (latencyMs < 1_000) {
    return `${Math.round(latencyMs)}ms`;
  }
  const seconds = latencyMs / 1_000;
  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  }
  const minutes = seconds / 60;
  return `${minutes.toFixed(minutes < 10 ? 1 : 0)}m`;
};

export type NetworkStatusCardProps = {
  networkHealth: NetworkHealth;
  wallet: WalletHook;
  account?: HorizonAccount;
};

export const NetworkStatusCard: FC<NetworkStatusCardProps> = ({ networkHealth, wallet, account }) => {
  const prefersReducedMotion = useReducedMotion();

  const ledgerSequence = networkHealth.ledger?.sequence;
  const ledgerClosedAt = networkHealth.ledger?.closed_at ? formatDateTime(networkHealth.ledger.closed_at) : "—";
  const ledgerOps = networkHealth.ledger?.operation_count;

  const nativeBalance = account?.balances.find((balance) => balance.asset_type === "native");
  const trustlines = account?.balances.filter((balance) => balance.asset_type !== "native").length ?? 0;
  const nativeValue = nativeBalance ? `${Number.parseFloat(nativeBalance.balance).toFixed(4)} XLM` : "—";
  const portfolioValue = wallet.balanceUSD != null ? formatCurrency(wallet.balanceUSD) : "—";

  return (
    <motion.section
      className="flex h-full flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={prefersReducedMotion ? undefined : fadeScale}
      transition={transitions.base}
    >
      <header>
        <h2 className="text-sm font-semibold text-foreground/90">Network & Status</h2>
        <p className="text-xs text-muted-foreground">Stellar Horizon health & wallet telemetry</p>
      </header>
      <div className="inline-flex items-center gap-2 self-start rounded-full border border-border/40 bg-border/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{networkHealth.network}</span>
        <span className="size-1 rounded-full bg-primary" aria-hidden />
        <span>{formatLatency(networkHealth.latencyMs)}</span>
      </div>
      <div className="rounded-xl border border-border/40 bg-border/10 px-4 py-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active Network</span>
          <span className="font-semibold text-primary">{networkHealth.network}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground">Ledger lag</span>
          <span>{networkHealth.isLoading ? "—" : formatLatency(networkHealth.latencyMs)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground">Horizon health</span>
          <span className={networkHealth.horizonHealthy ? "text-primary" : "text-destructive"}>
            {networkHealth.horizonHealthy ? "Healthy" : "Degraded"}
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ledger #</span>
            <span className="font-semibold text-foreground/90">{ledgerSequence ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Operations</span>
            <span>{ledgerOps ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Closed</span>
            <span>{ledgerClosedAt}</span>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border/40 bg-card/60 px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Wallet</span>
          <span className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-foreground/70">
            {wallet.status}
          </span>
        </div>
        {wallet.status === "connected" && wallet.address ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-semibold text-foreground/80">{shortAddress(wallet.address)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Portfolio</span>
              <span className="font-semibold text-primary">{portfolioValue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Native</span>
              <span>{nativeValue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Trustlines</span>
              <span>{trustlines}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last sign-in</span>
              <span>{wallet.lastSignIn ? formatDateTime(wallet.lastSignIn) : "n/a"}</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">Connect Freighter to view wallet metrics.</p>
        )}
        {wallet.status === "wrong-network" && wallet.network ? (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            Wallet connected to {wallet.network}. Switch in Freighter to align with {wallet.preferredNetwork}.
          </div>
        ) : null}
      </div>
      <div className="rounded-xl border border-border/40 bg-border/10 px-4 py-3 text-xs">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Permissions</p>
        <ul className="mt-2 space-y-1">
          {(wallet.permissions ?? ["signTransaction", "signMessage"]).map((permission) => (
            <li key={permission} className="flex items-center gap-2 text-foreground/80">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {permission}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
};
