"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/src/components/ui/Toast";
import { connectFreighter, type FreighterNetwork } from "@/lib/wallet/freighter";
import {
  bootstrapWalletState,
  clearWalletConnection,
  setWalletConnection,
  useWalletConnection,
} from "@/lib/wallet/store";
import { logger } from "@/lib/logging/logger";

const hoverVariants = {
  hover: { opacity: 1, scale: 1.02 },
  initial: { opacity: 0, scale: 1 },
} as const;

const buttonVariants = {
  hover: {
    boxShadow: "0 0 0 0 rgba(0,0,0,0.2) inset, 0 0 0 12px rgba(0,0,0,0.9) inset",
    y: -1,
  },
  initial: { boxShadow: "0 0 0 0 rgba(0,0,0,0.9) inset", y: 0 },
} as const;

export default function ConnectWalletButton() {
  const { toast } = useToast();
  const { address, network } = useWalletConnection();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bootstrapWalletState();
  }, []);

  const handleClick = async () => {
    if (loading) return;
    if (address) {
      const previousAddress = address;
      const previousNetwork = network;
      clearWalletConnection();
      toast({
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
      toast({
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
    } catch (error) {
      const message = normalizeError(error);
      toast({ variant: "error", title: "Connection failed", description: message, duration: 6000 });
      logger.error("Wallet connect failed", error);
    } finally {
      setLoading(false);
    }
  };

  const label = loading ? "Connecting…" : address ? `Disconnect · ${maskAddress(address)}` : "Connect Wallet";

  return (
    <motion.div initial={false} whileHover="hover" className="relative inline-flex">
      <motion.span
        variants={hoverVariants}
        transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] as const }}
        className="pointer-events-none absolute inset-0 rounded-[32px] opacity-0"
        style={{
          boxShadow: "0 0 0 0 rgba(0,0,0,0.2) inset, 0 0 0 0 rgba(0,0,0,0.9) inset",
        }}
      />

      <motion.button
        type="button"
        onClick={handleClick}
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] as const }}
        className="rounded-[32px] border border-[#ADD015] px-5 py-2 text-sm font-semibold text-[#ADD015] transition-colors bg-transparent focus:outline-none focus:ring-2 focus:ring-[#ADD015]/50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        title={address ? "Disconnect wallet" : "Connect wallet"}
      >
        {label}
      </motion.button>
    </motion.div>
  );
}

function maskAddress(value: string) {
  return value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function normalizeError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function formatNetworkLabel(net: FreighterNetwork) {
  if (net === "PUBLIC") return "MAINNET";
  return net;
}
