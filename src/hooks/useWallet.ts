"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { connectFreighter, currentNetwork, type FreighterNetwork } from "@/lib/wallet/freighter";
import {
  bootstrapWalletState,
  clearWalletConnection,
  setWalletConnection,
  useWalletConnection,
} from "@/lib/wallet/store";

export type StellarNetwork = "TestNet" | "Mainnet";

export type WalletState = {
  status: "disconnected" | "connecting" | "wrong-network" | "connected";
  address?: string;
  network?: StellarNetwork;
  balanceUSD?: number;
  balanceNative?: number;
  permissions?: string[];
  lastSignIn?: string;
  preferredNetwork: StellarNetwork;
};

export type WalletControls = {
  connect: () => Promise<void> | void;
  disconnect: () => void;
  switchNetwork: (network: StellarNetwork) => void;
};

export type WalletHook = WalletState & {
  controls: WalletControls;
  isLoading: boolean;
  error?: string;
  connected: boolean;
  accountId?: string;
  connect: WalletControls["connect"];
  disconnect: WalletControls["disconnect"];
};

const DEFAULT_NETWORK: StellarNetwork = "TestNet";

const freighterToStellar = (value: FreighterNetwork | null | undefined): StellarNetwork | undefined => {
  if (!value) return undefined;
  if (value === "PUBLIC") return "Mainnet";
  if (value === "TESTNET") return "TestNet";
  return undefined;
};

const formatError = (error: unknown) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Unknown error";
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const useWallet = (): WalletHook => {
  const { address, network } = useWalletConnection();
  const [status, setStatus] = useState<WalletState["status"]>("disconnected");
  const [preferredNetwork, setPreferredNetwork] = useState<StellarNetwork>(DEFAULT_NETWORK);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    bootstrapWalletState();
  }, []);

  useEffect(() => {
    if (!hydrated && network) {
      const mapped = freighterToStellar(network);
      if (mapped) setPreferredNetwork(mapped);
      setHydrated(true);
    }
  }, [hydrated, network]);

  useEffect(() => {
    if (isLoading) {
      setStatus("connecting");
      return;
    }
    if (!address) {
      setStatus("disconnected");
      return;
    }
    const current = freighterToStellar(network) ?? preferredNetwork;
    setStatus(current !== preferredNetwork ? "wrong-network" : "connected");
  }, [address, network, preferredNetwork, isLoading]);

  const connect = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(undefined);
    try {
      setStatus("connecting");
      const connection = await connectFreighter();
      setWalletConnection(connection.address, connection.network);
      const mapped = freighterToStellar(connection.network);
      if (mapped) setPreferredNetwork(mapped);
      setStatus("connected");
    } catch (err) {
      setError(formatError(err));
      setStatus("disconnected");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const disconnect = useCallback(() => {
    clearWalletConnection();
    setStatus("disconnected");
  }, []);

  const switchNetwork = useCallback((network: StellarNetwork) => {
    setPreferredNetwork(network);
  }, []);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      const net = await currentNetwork();
      if (cancelled) return;
      const mapped = freighterToStellar(net);
      if (mapped) {
        setStatus(mapped !== preferredNetwork ? "wrong-network" : "connected");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, preferredNetwork]);

  const mappedNetwork = freighterToStellar(network) ?? (address ? preferredNetwork : undefined);
  const connected = status === "connected" && !!address && (!mappedNetwork || mappedNetwork === preferredNetwork);
  const accountId = connected && address ? address : undefined;

  return useMemo<WalletHook>(() => ({
    status,
    address: address ?? undefined,
    accountId,
    connected,
    network: mappedNetwork,
    balanceUSD: undefined,
    balanceNative: undefined,
    permissions: undefined,
    lastSignIn: undefined,
    preferredNetwork,
    controls: {
      connect,
      disconnect,
      switchNetwork,
    },
    connect,
    disconnect,
    isLoading,
    error,
  }), [
    status,
    address,
    accountId,
    connected,
    mappedNetwork,
    preferredNetwork,
    connect,
    disconnect,
    switchNetwork,
    isLoading,
    error,
  ]);
};
