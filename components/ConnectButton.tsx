"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { connectFreighter, type FreighterNetwork } from "@/lib/wallet/freighter";
import {
  bootstrapWalletState,
  clearWalletConnection,
  setWalletConnection,
  useWalletConnection,
} from "@/lib/wallet/store";
import { logger } from "@/lib/logging/logger";

export default function ConnectButton() {
  const { push } = useToast();
  const { address, network } = useWalletConnection();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bootstrapWalletState();
  }, []);

  async function onClick() {
    if (loading) return;
    if (address) {
      const previousAddress = address;
      const previousNetwork = network;
      clearWalletConnection();
      push({
        variant: "info",
        title: "Disconnected",
        description: `${maskAddress(previousAddress)}${previousNetwork ? ` · ${formatNetworkLabel(previousNetwork)}` : ""}`,
        duration: 5000,
      });
      logger.info("Wallet disconnected", {
        publicKey: maskAddress(previousAddress),
        network: previousNetwork ?? "UNKNOWN",
      });
      return;
    }

    setLoading(true);
    try {
      const connection = await connectFreighter();
      const net = connection.network;
      const isTestnet = net === "TESTNET";
      setWalletConnection(connection.address, net);
      push({
        variant: isTestnet ? "warning" : "success",
        title: isTestnet ? "Connected to TESTNET" : "Wallet connected",
        description: `${maskAddress(connection.address)} · ${formatNetworkLabel(net)}`,
        duration: 6000,
      });
      logger.info("Wallet connected", {
        publicKey: maskAddress(connection.address),
        network: net,
        horizon: connection.networkDetails?.networkUrl,
      });
    } catch (error: unknown) {
      const msg = normalizeErr(error);
      push({ variant: "error", title: "Connection failed", description: msg, duration: 6000 });
      logger.error("Wallet connect failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      className="gap-2"
      title={address ? "Disconnect wallet" : "Connect wallet"}
    >
      {loading ? "Connecting…" : address ? `Disconnect · ${maskAddress(address)}` : "Connect Wallet"}
    </Button>
  );
}

function maskAddress(value: string) {
  return value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function normalizeErr(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

function formatNetworkLabel(net: FreighterNetwork) {
  if (net === "PUBLIC") return "MAINNET";
  return net;
}
