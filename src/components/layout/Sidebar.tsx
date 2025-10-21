"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import VestoLogo from "@/components/VestoLogo";
import type { WalletHook } from "@/src/hooks/useWallet";
import type { NetworkHealth } from "@/src/hooks/useNetworkHealth";
import { SIDEBAR_NAV } from "@/src/utils/constants";
import { cn } from "@/src/utils/cn";
import { formatUSD, formatUSDCompact, formatXLM } from "@/src/lib/utils/format";
import { shortAddress } from "@/src/lib/utils/text";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import NetworkStatus from "@/components/NetworkStatus";

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

const NavIcon = ({ icon }: { icon: (typeof SIDEBAR_NAV)[number]["icon"] }) => {
  const props = { className: "size-5", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.6, fill: "none" } as const;
  switch (icon) {
    case "dashboard":
      return (
        <svg {...props}>
          <path d="M4 12V5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
          <path d="M13 20v-7a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1z" />
          <path d="M4 19v-3a1 1 0 011-1h4a1 1 0 011 1v3" />
        </svg>
      );
    case "tokenize":
      return (
        <svg {...props}>
          <path d="M12 2l8 4v6c0 4.418-3.582 8-8 8s-8-3.582-8-8V6l8-4z" />
          <path d="M8 10l4 4 4-4" />
        </svg>
      );
    case "custodian":
      return (
        <svg {...props}>
          <path d="M12 2l9 4.5-9 4.5-9-4.5L12 2z" />
          <path d="M3 8.5l9 4.5 9-4.5" />
          <path d="M3 13l9 4.5 9-4.5" />
        </svg>
      );
    case "proofs":
      return (
        <svg {...props}>
          <path d="M5 3h14v4H5z" />
          <path d="M5 11h14v4H5z" />
          <path d="M5 19h14" strokeLinecap="round" />
        </svg>
      );
    case "spv":
      return (
        <svg {...props}>
          <path d="M4 18v-5a8 8 0 018-8h0a8 8 0 018 8v5" />
          <path d="M8 21h8" strokeLinecap="round" />
          <path d="M9 13h6" />
          <path d="M12 10v6" />
        </svg>
      );
    case "bridge":
    default:
      return (
        <svg {...props}>
          <path d="M3 17c0-4.418 3.582-8 8-8h2c4.418 0 8 3.582 8 8" />
          <path d="M5 13v4" /><path d="M19 13v4" />
          <path d="M8 17h8" />
        </svg>
      );
  }
};

type SidebarProps = {
  wallet: WalletHook;
  networkHealth: NetworkHealth;
  collapsed?: boolean;
  isOpen?: boolean;
  onCloseMobile?: () => void;
};

export const Sidebar = ({
  wallet,
  networkHealth,
  collapsed = false,
  isOpen = true,
  onCloseMobile,
}: SidebarProps) => {
  const pathname = usePathname();
  const activeKey = useMemo(() => SIDEBAR_NAV.find((item) => pathname.startsWith(item.href))?.key, [pathname]);

  const statusChip = wallet.status === "connected"
    ? "Connected"
    : wallet.status === "connecting"
    ? "Connecting"
    : wallet.status === "wrong-network"
    ? "Check network"
    : "Wallet";

  const portfolioDisplay =
    wallet.balanceUSD == null
      ? "—"
      : (() => {
          const numeric = Number(wallet.balanceUSD);
          if (Number.isFinite(numeric)) {
            return Math.abs(numeric) >= 10_000 ? formatUSDCompact(numeric) : formatUSD(numeric);
          }
          return formatUSD(wallet.balanceUSD);
        })();

  const nativeDisplay = wallet.balanceNative != null ? `${formatXLM(wallet.balanceNative)} XLM` : "—";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border/40 bg-sidebar/95 backdrop-blur-xl transition-transform duration-200",
        collapsed
          ? "md:w-0 md:-translate-x-full md:pointer-events-none md:opacity-0"
          : "md:w-72 md:translate-x-0 md:opacity-100",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
      aria-hidden={collapsed && !isOpen}
    >
      <div className="flex h-16 items-center justify-center border-b border-border/30 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Vesto dashboard home">
          <VestoLogo size={32} className="text-primary" />
          <span className="hidden text-sm font-semibold tracking-tight text-foreground md:inline">Vesto</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="flex flex-col gap-2">
          {SIDEBAR_NAV.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive && "bg-primary/10 text-primary",
                  )}
                >
                  <NavIcon icon={item.icon} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border/30 px-4 py-6 text-sm text-foreground/80">
        <div className="rounded-2xl border border-border/40 bg-card/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>Account</span>
            <span className="rounded-full border border-border/40 bg-border/10 px-3 py-0.5 text-[11px] font-semibold text-foreground/80">
              {statusChip}
            </span>
          </div>
          {wallet.status === "connected" && wallet.address ? (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Address</p>
                <p className="mt-1 font-mono text-lg text-foreground/90">
                  {shortAddress(wallet.address)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Portfolio</span>
                <span className="text-lg font-semibold text-primary">
                  {portfolioDisplay}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Native</span>
                <span className="font-semibold text-foreground/80">
                  {nativeDisplay}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Connect Freighter to view balances and trigger payouts.
            </p>
          )}
          {wallet.status === "wrong-network" ? (
            <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Switch networks in Freighter to match the preferred environment.
            </p>
          ) : null}
          <div className="mt-5 space-y-3">
            <NetworkStatus />
            <ConnectWalletButton />
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-border/10 px-3 py-2 text-xs uppercase tracking-wide text-foreground/70">
              <span>{networkHealth.network}</span>
              <span className={cn(networkHealth.horizonHealthy ? "text-primary" : "text-destructive")}>{networkHealth.horizonHealthy ? "Healthy" : "Degraded"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-border/10 px-3 py-2 text-xs uppercase tracking-wide text-foreground/70">
              <span>Ledger lag</span>
              <span>{networkHealth.isLoading ? "—" : formatLatency(networkHealth.latencyMs)}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
