import StellarSdk from "stellar-sdk";

type ServerConstructor = new (url: string) => unknown;

const resolveServerCtor = (): ServerConstructor => {
  const sdkModule = StellarSdk as unknown as {
    Server?: ServerConstructor;
    Horizon?: { Server?: ServerConstructor };
    default?: { Server?: ServerConstructor; Horizon?: { Server?: ServerConstructor } };
  };
  const ctor =
    sdkModule.Server ?? sdkModule.Horizon?.Server ?? sdkModule.default?.Server ?? sdkModule.default?.Horizon?.Server;
  if (!ctor) {
    throw new Error("Stellar SDK Server constructor unavailable.");
  }
  return ctor;
};

const ServerCtor = resolveServerCtor();

let cachedServer: InstanceType<typeof ServerCtor> | null = null;

const networks = (StellarSdk as unknown as { Networks: { PUBLIC: string; TESTNET: string } }).Networks;
const keypair = (StellarSdk as unknown as { Keypair: { fromSecret: (seed: string) => unknown } }).Keypair;

type KeypairInstance = ReturnType<typeof keypair.fromSecret>;

export const getServer = (): InstanceType<typeof ServerCtor> => {
  const url = process.env.HORIZON_URL ?? process.env.NEXT_PUBLIC_HORIZON_URL;
  if (!url) {
    throw new Error("HORIZON_URL is required to instantiate the Horizon Server.");
  }
  if (cachedServer) {
    return cachedServer;
  }
  cachedServer = new ServerCtor(url) as InstanceType<typeof ServerCtor>;
  return cachedServer;
};

export const getNetworkPassphrase = () =>
  (process.env.NETWORK ?? process.env.NEXT_PUBLIC_STELLAR_NETWORK) === "PUBLIC"
    ? networks.PUBLIC
    : networks.TESTNET;

export const getSpvKeypair = (): KeypairInstance => {
  const secret = process.env.SPV_SECRET;
  if (!secret) {
    throw new Error("SPV_SECRET is not configured.");
  }
  return keypair.fromSecret(secret) as KeypairInstance;
};

export const getSpvPublic = () => {
  const account = process.env.SPV_ACCOUNT ?? process.env.NEXT_PUBLIC_SPV_ACCOUNT;
  if (!account) {
    throw new Error("SPV_ACCOUNT is not configured.");
  }
  return account;
};

export const getBridgeKeypair = (): KeypairInstance => {
  const secret = process.env.BRIDGE_SECRET;
  if (!secret) {
    throw new Error("BRIDGE_SECRET is not configured.");
  }
  return keypair.fromSecret(secret) as KeypairInstance;
};

export const getBridgeAccount = () => {
  const account = process.env.BRIDGE_ACCOUNT ?? process.env.NEXT_PUBLIC_BRIDGE_ACCOUNT;
  if (!account) {
    throw new Error("BRIDGE_ACCOUNT is not configured.");
  }
  return account;
};
