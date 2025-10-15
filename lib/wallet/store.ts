"use client";

import { useSyncExternalStore } from "react";
import {
  currentNetwork,
  freighterStatus,
  type FreighterNetwork,
} from "@/lib/wallet/freighter";
import { logger } from "@/lib/logging/logger";

type WalletState = {
  address: string | null;
  network: FreighterNetwork | null;
};

type Listener = () => void;

let state: WalletState = {
  address: null,
  network: null,
};

const listeners = new Set<Listener>();
let polling: ReturnType<typeof setInterval> | null = null;

function setState(partial: Partial<WalletState>) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function walletStoreSubscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function walletStoreSnapshot(): WalletState {
  return state;
}

export function setWalletConnection(address: string, network: FreighterNetwork | null) {
  setState({ address, network });
}

export function clearWalletConnection() {
  setState({ address: null, network: null });
}

export function useWalletConnection() {
  return useSyncExternalStore(walletStoreSubscribe, walletStoreSnapshot, walletStoreSnapshot);
}

export async function bootstrapWalletState() {
  if (typeof window === "undefined") return;
  try {
    const status = await freighterStatus();
    if (status.address) {
      const network = await currentNetwork();
      setState({ address: status.address, network });
    } else {
      setState({ address: null, network: null });
    }
  } catch (error) {
    logger.warn("Failed to bootstrap wallet state", { error });
    setState({ address: null, network: null });
  }
  startWalletPolling();
}

function startWalletPolling() {
  if (polling || typeof window === "undefined") return;
  polling = setInterval(async () => {
    if (!state.address) return;
    try {
      const network = await currentNetwork();
      if (network !== state.network) {
        setState({ network });
      }
    } catch (error) {
      logger.warn("Wallet polling failed", { error });
    }
  }, 5000);
}

