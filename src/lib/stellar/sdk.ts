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

export async function getServer() {
  const url = process.env.NEXT_PUBLIC_HORIZON_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_HORIZON_URL is required to create the Horizon Server instance.");
  }

  const sdkModule = (await import("stellar-sdk")) as unknown as {
    Server?: new (url: string) => unknown;
    Horizon?: { Server?: new (url: string) => unknown };
    default?: {
      Server?: new (url: string) => unknown;
      Horizon?: { Server?: new (url: string) => unknown };
    };
  };

  const ServerCtor =
    sdkModule.Server ??
    sdkModule.Horizon?.Server ??
    sdkModule.default?.Server ??
    sdkModule.default?.Horizon?.Server;

  if (!ServerCtor) {
    throw new Error("Stellar SDK Server constructor unavailable");
  }

  type ServerInstance = InstanceType<typeof ServerCtor>;
  const globalContext = globalThis as typeof globalThis & { __vestoServer?: ServerInstance };

  if (!globalContext.__vestoServer) {
    // Vesto: join-transactions fix
    globalContext.__vestoServer = new ServerCtor(url) as ServerInstance;
  }

  return globalContext.__vestoServer as ServerInstance;
}

export const STELLAR_NETWORK_PASSPHRASE = (process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "").trim();
