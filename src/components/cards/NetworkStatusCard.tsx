"use client";

import type { FC } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { NetworkHealth, StellarNetwork } from "@/src/lib/mockData";
import type { WalletHook } from "@/src/hooks/useWallet";
import { transitions, fadeScale } from "@/src/components/motion/presets";
import { formatCurrency, formatDateTime, shortAddress } from "@/src/utils/format";

export type NetworkStatusCardProps = {
  networkHealth: NetworkHealth;
  wallet: WalletHook;
  onSwitchNetwork: (network: StellarNetwork) => void;
};

export const NetworkStatusCard: FC<NetworkStatusCardProps> = ({ networkHealth, wallet, onSwitchNetwork }) => {
  const prefersReducedMotion = useReducedMotion();

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
        <p className="text-xs text-muted-foreground">Stellar Horizon health & wallet permissions</p>
      </header>
      <div className="rounded-xl border border-border/40 bg-border/10 px-4 py-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active Network</span>
          <span className="font-semibold text-primary">{networkHealth.network}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground">Latency</span>
          <span>{networkHealth.latencyMs}ms</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground">Horizon health</span>
          <span className={networkHealth.horizonHealthy ? "text-primary" : "text-destructive"}>
            {networkHealth.horizonHealthy ? "Healthy" : "Degraded"}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Last check {formatDateTime(networkHealth.lastHorizonCheck)}
        </p>
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
              <span className="text-muted-foreground">Balance</span>
              <span className="font-semibold text-primary">{formatCurrency(wallet.balanceUSD ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last sign-in</span>
              <span>{wallet.lastSignIn ? formatDateTime(wallet.lastSignIn) : "n/a"}</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">Connect Freighter to view wallet metrics.</p>
        )}
        {wallet.status === "wrong-network" ? (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            Wallet connected to {wallet.network}. Switch to {wallet.preferredNetwork}.
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onSwitchNetwork(wallet.preferredNetwork === "TestNet" ? "Mainnet" : "TestNet")}
          className="mt-3 w-full rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/70 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Switch Network
        </button>
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
