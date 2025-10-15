"use client";

import freighterApi, {
  addToken,
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  requestAccess,
  setAllowed,
  signAuthEntry,
  signMessage,
  signTransaction,
} from "@stellar/freighter-api";
import { logger } from "@/lib/logging/logger";

export type FreighterNetwork =
  | "PUBLIC"
  | "TESTNET"
  | "FUTURENET"
  | "STANDALONE"
  | "SANDBOX"
  | "UNKNOWN";

const FREIGHTER_MISSING = "Freighter extension is not available. Please install or enable it.";

type MaybeErrorResult = { error?: string } | undefined | null;

const hasWindow = () => typeof window !== "undefined";

export async function ensureFreighterInstalled() {
  if (!hasWindow()) throw new Error(FREIGHTER_MISSING);
  try {
    const res = await isConnected();
    if (res && typeof res.isConnected === "boolean") {
      return res.isConnected;
    }
    if ((res as MaybeErrorResult)?.error) {
      throw new Error((res as { error: string }).error);
    }
  } catch (err) {
    throw mapFreighterError(err);
  }
  // If the result doesn't contain a boolean, assume extension missing
  throw new Error(FREIGHTER_MISSING);
}

export async function freighterStatus() {
  try {
    const connected = await safeCall(() => isConnected(), "isConnected", true);
    const allowed = await safeCall(() => isAllowed(), "isAllowed", true);
    const addressRes = await safeCall(() => getAddress(), "getAddress", true);
    return {
      installed: connected ? Boolean(connected.isConnected) : false,
      allowed: allowed ? Boolean(allowed.isAllowed) : false,
      address: addressRes?.address ?? "",
    };
  } catch (error) {
    logger.warn("freighterStatus failed", { error: messageFrom(error) });
    return { installed: false, allowed: false, address: "" };
  }
}

export interface WalletConnection {
  address: string;
  network: FreighterNetwork;
  networkDetails?: Awaited<ReturnType<typeof getNetworkDetails>>;
}

export async function connectFreighter(): Promise<WalletConnection> {
  await ensureFreighterInstalled();

  const allowed = await safeCall(() => isAllowed(), "isAllowed", true);
  if (!allowed?.isAllowed) {
    const allowResult = await safeCall(() => setAllowed(), "setAllowed");
    logger.info("Freighter allow list updated", { allowed: allowResult?.isAllowed });
  }

  const access = await safeCall(() => requestAccess(), "requestAccess");
  const address = access.address;
  const details = await safeCall(() => getNetworkDetails(), "getNetworkDetails");

  const network = normalizeNetwork(details?.network);
  logger.info("Freighter connected", { address: mask(address), network });

  return { address, network, networkDetails: details };
}

export async function currentNetwork(): Promise<FreighterNetwork> {
  try {
    const details = await safeCall(() => getNetworkDetails(), "getNetworkDetails", true);
    return normalizeNetwork(details?.network);
  } catch (error) {
    logger.warn("Network lookup failed", { error: messageFrom(error) });
    return "UNKNOWN";
  }
}

export async function signUserMessage(message: string, address?: string) {
  await ensureFreighterInstalled();
  const res = await safeCall(() => signMessage(message, address ? { address } : undefined), "signMessage");
  logger.info("Message signed", { signer: mask(res.signerAddress) });
  return res;
}

export async function signTx(xdr: string, opts?: { network?: FreighterNetwork; networkPassphrase?: string; address?: string }) {
  await ensureFreighterInstalled();
  const res = await safeCall(() => signTransaction(xdr, opts), "signTransaction");
  logger.info("Transaction signed", { signer: mask(res.signerAddress) });
  return res;
}

export async function registerToken(params: Parameters<typeof addToken>[0]) {
  await ensureFreighterInstalled();
  const res = await safeCall(() => addToken(params), "addToken");
  logger.info("Token registered", params);
  return res;
}

export async function signBinaryBlob(blob: string, address: string) {
  await ensureFreighterInstalled();
  const api = freighterApi as { signBlob?: (data: string, opts: { address: string }) => Promise<{ signedBlob: string | null; signerAddress: string; error?: string }>; };
  if (!api.signBlob) {
    throw new Error("Your Freighter version does not support signBlob.");
  }
  const res = await safeCall(() => api.signBlob!(blob, { address }), "signBlob");
  logger.info("Blob signed", { signer: mask(res.signerAddress) });
  return res;
}

export async function signAuthorizationEntry(authEntryXdr: string, address: string) {
  await ensureFreighterInstalled();
  const res = await safeCall(() => signAuthEntry(authEntryXdr, { address }), "signAuthEntry");
  logger.info("Auth entry signed", { signer: mask(res.signerAddress) });
  return res;
}

async function safeCall<T>(fn: () => Promise<T>, label: string, suppressErrorLog = false): Promise<T> {
  try {
    const result = await fn();
    if (hasError(result)) {
      const err = new Error(result.error);
      if (!suppressErrorLog) logger.error(`Freighter ${label} returned error`, err);
      throw err;
    }
    if (process.env.NODE_ENV !== "production") {
      logger.debug(`Freighter ${label} success`);
    }
    return result;
  } catch (error) {
    const mapped = mapFreighterError(error);
    if (!suppressErrorLog) logger.error(`Freighter ${label} failed`, mapped);
    throw mapped;
  }
}

function mapFreighterError(error: unknown) {
  if (error instanceof Error) {
    const msg = error.message || "Freighter error";
    if (/freighter/i.test(msg) && /install|not (found|installed)|missing/i.test(msg)) {
      return new Error(FREIGHTER_MISSING);
    }
    return error;
  }
  const msg = messageFrom(error);
  if (/freighter/i.test(msg) && /install|missing/i.test(msg)) {
    return new Error(FREIGHTER_MISSING);
  }
  return new Error(msg);
}

function normalizeNetwork(value?: string | null): FreighterNetwork {
  if (!value) return "UNKNOWN";
  const upper = value.toUpperCase();
  if (["PUBLIC", "TESTNET", "FUTURENET", "STANDALONE", "SANDBOX"].includes(upper)) {
    return upper as FreighterNetwork;
  }
  return "UNKNOWN";
}

function mask(value: string) {
  if (!value) return value;
  return value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function messageFrom(error: unknown) {
  if (!error) return "Bilinmeyen hata";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
function hasError(result: unknown): result is { error: string } {
  if (!result || typeof result !== "object") return false;
  const value = (result as { error?: unknown }).error;
  return typeof value === "string" && value.length > 0;
}
export { freighterApi };
