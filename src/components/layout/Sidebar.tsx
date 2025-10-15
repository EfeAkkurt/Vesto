"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WalletHook } from "@/src/hooks/useWallet";
import type { NetworkHealth, StellarNetwork } from "@/src/lib/mockData";
import { SIDEBAR_NAV } from "@/src/utils/constants";
import { cn } from "@/src/utils/cn";
import { shortAddress, formatCurrency } from "@/src/utils/format";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

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
  onSelectNetwork?: (network: StellarNetwork) => void;
};

export const Sidebar = ({
  wallet,
  networkHealth,
  collapsed = false,
  isOpen = true,
  onCloseMobile,
  onSelectNetwork,
}: SidebarProps) => {
  const pathname = usePathname();
  const { push } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);

  const activeKey = useMemo(() => SIDEBAR_NAV.find((item) => pathname.startsWith(item.href))?.key, [pathname]);

  const currentNetwork = wallet.network ?? wallet.preferredNetwork;
  const nextNetwork: StellarNetwork = currentNetwork === "TestNet" ? "Mainnet" : "TestNet";
  const networkStyles = currentNetwork === "TestNet"
    ? { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-100", dot: "bg-amber-400" }
    : { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-100", dot: "bg-emerald-400" };

  const handleConnectClick = () => {
    if (wallet.status === "connected") {
      wallet.controls.disconnect();
      push({
        title: "Wallet disconnected",
        description: `Session ended for ${shortAddress(wallet.address ?? "")} · reconnect anytime from the sidebar.`,
        variant: "info",
      });
      return;
    }
    wallet.controls.connect();
    push({
      title: "Requesting signature",
      description: "Approve the Freighter prompt to connect.",
      variant: "info",
    });
  };

  const handleNetworkSwitch = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await onSelectNetwork?.(nextNetwork);
      push({
        title: `Switched to ${nextNetwork}`,
        description: "Dashboard data will sync to the selected Horizon network.",
        variant: "success",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const statusChip = wallet.status === "connected"
    ? "Connected"
    : wallet.status === "connecting"
    ? "Connecting"
    : wallet.status === "wrong-network"
    ? "Network issue"
    : "Wallet";

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
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/20 text-lg font-semibold text-primary">
            V
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground md:inline">Vesto</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="flex flex-col gap-1">
          {SIDEBAR_NAV.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
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
          {wallet.status === "connected" ? (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Address</p>
                <p className="mt-1 font-mono text-lg text-foreground/90">
                  {shortAddress(wallet.address ?? "")}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Portfolio</span>
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(wallet.balanceUSD ?? 0, { compact: true })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Native</span>
                <span className="font-semibold text-foreground/80">{wallet.balanceNative ?? 0} XLM</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Connect Freighter to view balances and trigger payouts.
            </p>
          )}
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleNetworkSwitch}
              disabled={isSwitching}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                networkStyles.bg,
                networkStyles.border,
                networkStyles.text,
                isSwitching && "opacity-70",
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", networkStyles.dot)} aria-hidden />
                {currentNetwork}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
                {isSwitching ? "switching" : "switch"}
              </span>
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectClick}
              disabled={wallet.status === "connecting"}
              className="w-full justify-center border-white/20 text-white hover:bg-white/10"
            >
              {wallet.status === "connecting"
                ? "Connecting…"
                : wallet.status === "connected" && wallet.address
                  ? `Disconnect · ${shortAddress(wallet.address)}`
                  : "Connect Wallet"}
            </Button>
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-border/10 px-3 py-2 text-xs uppercase tracking-wide text-foreground/70">
              <span>{networkHealth.network}</span>
              <span className={cn(networkHealth.horizonHealthy ? "text-primary" : "text-destructive")}>
                {networkHealth.horizonHealthy ? "Healthy" : "Degraded"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-border/10 px-3 py-2 text-xs uppercase tracking-wide text-foreground/70">
              <span>Latency</span>
              <span>{networkHealth.latencyMs}ms</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
