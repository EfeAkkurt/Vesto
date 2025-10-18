"use client";

export type StellarModule = {
  Server: unknown;
  Keypair: unknown;
  TransactionBuilder: unknown;
  Networks: unknown;
  Operation: unknown;
  Memo: unknown;
  Asset: unknown;
};

let cachedModule: StellarModule | null = null;

export async function loadSDK(): Promise<StellarModule> {
  if (cachedModule) return cachedModule;
  const sdk = (await import("stellar-sdk/minimal")) as Record<string, unknown>;
  const horizon = (sdk["Horizon"] ?? {}) as Record<string, unknown>;
  const server = (sdk["Server"] ?? horizon?.["Server"]) as unknown;
  if (!server) {
    throw new Error("Stellar SDK Server constructor unavailable");
  }
  cachedModule = {
    Server: server,
    Keypair: sdk["Keypair"],
    TransactionBuilder: sdk["TransactionBuilder"],
    Networks: sdk["Networks"],
    Operation: sdk["Operation"],
    Memo: sdk["Memo"],
    Asset: sdk["Asset"],
  };
  return cachedModule;
}

export const loadStellar = loadSDK;
