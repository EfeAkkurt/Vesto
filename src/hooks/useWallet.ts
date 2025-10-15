"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  walletState as mockWalletState,
  walletStateMainnet,
  type WalletState,
  type StellarNetwork,
} from "@/src/lib/mockData";

export type WalletControls = {
  connect: () => void;
  disconnect: () => void;
  switchNetwork: (network: StellarNetwork) => void;
};

export type WalletHook = WalletState & {
  controls: WalletControls;
  isLoading: boolean;
  error?: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getNetworkState = (network: StellarNetwork): WalletState => {
  if (network === "Mainnet") {
    return { ...walletStateMainnet, network: "Mainnet", preferredNetwork: "Mainnet" };
  }
  return { ...mockWalletState, network: "TestNet", preferredNetwork: "TestNet" };
};

export const useWallet = (): WalletHook => {
  const [state, setState] = useState<WalletState>(mockWalletState);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setState(mockWalletState);
  }, []);

  const connect = useCallback(async () => {
    setError(undefined);
    if (state.status === "connected") return;
    setLoading(true);
    setState((prev) => ({ ...prev, status: "connecting" }));
    await delay(600);
    setState((prev) => {
      const targetNetwork = prev.preferredNetwork ?? mockWalletState.preferredNetwork;
      const base = getNetworkState(targetNetwork);
      return { ...base, status: "connected" };
    });
    setLoading(false);
  }, [state.status]);

  const disconnect = useCallback(() => {
    setError(undefined);
    setState((prev) => ({ preferredNetwork: prev.preferredNetwork ?? mockWalletState.preferredNetwork, status: "disconnected" }));
  }, []);

  const switchNetwork = useCallback(
    (network: StellarNetwork) => {
      setError(undefined);
      if (state.status === "disconnected") {
        setState((prev) => ({ ...prev, preferredNetwork: network }));
        return;
      }
      const base = getNetworkState(network);
      setState({ ...base, status: "connected" });
    },
    [state.status],
  );

  const value = useMemo<WalletHook>(() => ({
    ...state,
    controls: {
      connect,
      disconnect,
      switchNetwork,
    },
    isLoading,
    error,
  }), [connect, disconnect, error, isLoading, state, switchNetwork]);

  return value;
};
