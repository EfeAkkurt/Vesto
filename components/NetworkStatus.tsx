"use client";
import { useEffect } from "react";
import { useToast } from "@/src/components/ui/Toast";
import { bootstrapWalletState, useWalletConnection } from "@/lib/wallet/store";
import type { FreighterNetwork } from "@/lib/wallet/freighter";

export default function NetworkStatus() {
  const { push } = useToast();
  const { address, network } = useWalletConnection();

  useEffect(() => {
    bootstrapWalletState();
  }, []);

  const effectiveNetwork: ConnectionState = address
    ? (network ?? "UNKNOWN")
    : "DISCONNECTED";

  function handleClick() {
    const label = humanReadable(effectiveNetwork);
    push({
      variant: toastVariantFor(effectiveNetwork),
      title: `Network: ${label}`,
      description: descriptionForState(effectiveNetwork),
      duration: 5000,
    });
  }

  const visuals = colorFor(effectiveNetwork);
  const statusText = statusLabel(effectiveNetwork);

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${visuals.bg} ${visuals.border} ${visuals.text}`}
      aria-label="Network status"
      title={`Network: ${humanReadable(effectiveNetwork)}`}
    >
      <span className={`h-2 w-2 rounded-full ${visuals.dot}`} />
      {statusText}
    </button>
  );
}

type ConnectionState = FreighterNetwork | "DISCONNECTED" | "UNKNOWN";

function statusLabel(state: ConnectionState) {
  if (state === "DISCONNECTED") return "Not connected";
  if (state === "UNKNOWN") return "Connected · UNKNOWN";
  return `Connected · ${humanReadable(state)}`;
}

function humanReadable(state: ConnectionState) {
  if (state === "PUBLIC") return "MAINNET";
  if (state === "TESTNET") return "TESTNET";
  if (state === "DISCONNECTED") return "DISCONNECTED";
  return state;
}

function toastVariantFor(state: ConnectionState) {
  if (state === "TESTNET" || state === "UNKNOWN") return "warning" as const;
  if (state === "PUBLIC") return "success" as const;
  return "info" as const;
}

function descriptionForState(state: ConnectionState) {
  switch (state) {
    case "PUBLIC":
      return "Mainnet is active. Transactions are final.";
    case "TESTNET":
      return "Testnet is active. Assets here are not real.";
    case "UNKNOWN":
      return "Unable to detect the current network. Check the Freighter extension.";
    default:
      return "Wallet is not connected.";
  }
}

function colorFor(state: ConnectionState) {
  switch (state) {
    case "PUBLIC":
      return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-200", dot: "bg-emerald-400" };
    case "TESTNET":
      return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-200", dot: "bg-amber-400" };
    case "FUTURENET":
      return { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-200", dot: "bg-purple-400" };
    case "SANDBOX":
      return { bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-200", dot: "bg-sky-400" };
    case "STANDALONE":
      return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-200", dot: "bg-blue-400" };
    case "UNKNOWN":
      return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-200", dot: "bg-red-400" };
    default:
      return { bg: "bg-white/10", border: "border-white/20", text: "text-white", dot: "bg-white" };
  }
}
