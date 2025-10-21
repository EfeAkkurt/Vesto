'use client';

import * as Freighter from "@stellar/freighter-api";

export type FreighterApiModule = typeof Freighter;

export type StellarModule = {
  Server?: new (url: string) => unknown;
  TransactionBuilder?: typeof import("stellar-sdk").TransactionBuilder;
  Operation?: typeof import("stellar-sdk").Operation;
  Memo?: typeof import("stellar-sdk").Memo;
  Asset?: typeof import("stellar-sdk").Asset;
  Networks?: typeof import("stellar-sdk").Networks;
  Keypair?: typeof import("stellar-sdk").Keypair;
};

const loadCandidate = async () => {
  try {
    return (await import("stellar-sdk/minimal")) as Record<string, unknown>;
  } catch (minimalError) {
    console.warn("[stellar:sdk] minimal bundle unavailable, falling back to full sdk", minimalError);
    const fallback = await import("stellar-sdk");
    return fallback as Record<string, unknown>;
  }
};

let cachedModule: StellarModule | null = null;
let cachedServer: unknown | null = null;

const extractModule = async (): Promise<StellarModule> => {
  if (cachedModule) return cachedModule;
  const sdkModule = await loadCandidate();
  const candidates = [
    sdkModule,
    (sdkModule?.default ?? null) as Record<string, unknown> | null,
    (sdkModule as { StellarSdk?: Record<string, unknown> }).StellarSdk ?? null,
  ].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));

  const resolve = <T = unknown>(key: string): T | undefined => {
    for (const candidate of candidates) {
      const value = candidate?.[key] as T | undefined;
      if (value !== undefined) return value;
    }
    return undefined;
  };

  const horizonModule = resolve("Horizon") as { Server?: StellarModule["Server"] } | undefined;
  cachedModule = {
    Server: (resolve("Server") as StellarModule["Server"]) ?? horizonModule?.Server,
    TransactionBuilder: resolve("TransactionBuilder"),
    Operation: resolve("Operation"),
    Memo: resolve("Memo"),
    Asset: resolve("Asset"),
    Networks: resolve("Networks"),
    Keypair: resolve("Keypair"),
  };
  return cachedModule;
};

export const loadStellar = async (): Promise<StellarModule> => extractModule();

export const getServer = async () => {
  if (cachedServer) return cachedServer;
  const url = (process.env.NEXT_PUBLIC_HORIZON_URL ?? "").trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_HORIZON_URL is required to instantiate the Horizon Server.");
  }

  const stellarModule = await extractModule();
  const ServerCtor = stellarModule.Server;
  if (!ServerCtor) {
    throw new Error("Stellar SDK Server constructor unavailable.");
  }

  const globalContext = globalThis as typeof globalThis & { __vestoHorizonClient?: unknown };
  if (!globalContext.__vestoHorizonClient) {
    globalContext.__vestoHorizonClient = new ServerCtor(url);
  }
  cachedServer = globalContext.__vestoHorizonClient;
  return cachedServer;
};

export const STELLAR_NETWORK_PASSPHRASE = (process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "").trim();

export const getBrowser = () => ({ freighter: Freighter });

export const getFreighterApi = (): FreighterApiModule => Freighter;
