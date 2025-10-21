import { createHash } from "crypto";
import { Asset, Memo, Operation, StrKey, TransactionBuilder } from "stellar-sdk";
import { CID } from "multiformats/cid";
import { lighthouseUploadDagCbor } from "@/src/lib/ipfs/lighthouse";
import {
  getBridgeAccount,
  getBridgeKeypair,
  getNetworkPassphrase,
  getServer,
} from "@/src/lib/stellar/sdk.server";
import {
  BRIDGE_PUBLIC_ACCOUNT,
  SUSD_PUBLIC_CODE,
  SUSD_PUBLIC_ISSUER,
} from "@/src/utils/constants";
import { parseAmountToStroops } from "@/src/lib/utils/format";
import { debugObj } from "@/src/lib/logging/logger";

type HorizonSubmitResult = { hash?: string };

export class BridgeError extends Error {
  code: string;
  status: number;
  hint?: string;

  constructor(code: string, message: string, status = 400, hint?: string) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.status = status;
    this.hint = hint;
  }
}

const ensureApiKey = (): string => {
  const apiKey = (process.env.LIGHTHOUSE_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new BridgeError("config_missing", "LIGHTHOUSE_API_KEY is not configured on the server.", 500);
  }
  return apiKey;
};

const normaliseAmount = (value: string | number): string => {
  const stroops = parseAmountToStroops(value);
  if (!Number.isFinite(stroops) || stroops <= 0) {
    throw new BridgeError("validation_error", "Amount must be greater than zero.", 400);
  }
  return (stroops / 10_000_000).toFixed(7);
};

const validateAsset = (asset: string): "XLM" | "SUSD" => {
  if (asset === "XLM") return "XLM";
  if (asset === "SUSD") return "SUSD";
  throw new BridgeError("validation_error", "Unsupported asset. Use XLM or SUSD.", 400);
};

const validateEvmAddress = (address: string): string => {
  const normalised = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/u.test(normalised)) {
    throw new BridgeError("validation_error", "Recipient must be a valid 0x-prefixed EVM address.", 400);
  }
  return normalised;
};

const validateStellarAccount = (account: string): string => {
  const trimmed = account.trim();
  if (!StrKey.isValidEd25519PublicKey(trimmed)) {
    throw new BridgeError("validation_error", "Target account must be a valid Stellar public key.", 400);
  }
  return trimmed;
};

const validateCid = (cid: string, field: string): string => {
  const trimmed = cid.trim();
  if (!trimmed) {
    throw new BridgeError("validation_error", `${field} is required.`, 400);
  }
  try {
    return CID.parse(trimmed).toV1().toString();
  } catch {
    throw new BridgeError("validation_error", `${field} must be a valid CID.`, 400);
  }
};

const sha256Hex = (value: string): string => createHash("sha256").update(value).digest("hex");

const getSusdAsset = () => {
  if (!SUSD_PUBLIC_CODE || !SUSD_PUBLIC_ISSUER) {
    throw new BridgeError("config_missing", "SUSD asset configuration missing.", 500);
  }
  return new Asset(SUSD_PUBLIC_CODE, SUSD_PUBLIC_ISSUER);
};

const resolvePaymentAsset = (asset: "XLM" | "SUSD"): Asset =>
  asset === "XLM" ? Asset.native() : getSusdAsset();

const buildBaseTx = async () => {
  const server = getServer() as unknown as {
    loadAccount(accountId: string): Promise<{
      accountId(): string;
      sequenceNumber(): string;
      incrementSequenceNumber(): void;
    }>;
    fetchBaseFee(): Promise<number>;
    submitTransaction(tx: unknown): Promise<HorizonSubmitResult>;
  };
  const bridgeAccount = getBridgeAccount();
  const account = await server.loadAccount(bridgeAccount);
  const baseFee = await server.fetchBaseFee();
  const passphrase = getNetworkPassphrase();
  return {
    bridgeAccount,
    server,
    builder: new TransactionBuilder(account, {
      fee: (baseFee * 2).toString(),
      networkPassphrase: passphrase,
    }),
  };
};

const applyMemoAndData = (
  builder: TransactionBuilder,
  manageDataName: string,
  cid: string,
  memoHashHex: string,
) =>
  builder
    .addOperation(
      Operation.manageData({
        name: manageDataName,
        value: Buffer.from(cid, "utf8"),
      }),
    )
    .addMemo(Memo.hash(memoHashHex))
    .setTimeout(60);

const submitTransaction = async (
  builder: TransactionBuilder,
  server: { submitTransaction(tx: unknown): Promise<HorizonSubmitResult> },
): Promise<string> => {
  const keypair = getBridgeKeypair();
  const tx = builder.build();
  // Keypair exposes sign() / signPayload() – TransactionBuilder infers types poorly, so cast to any.
  (tx as unknown as { sign: (kp: unknown) => void }).sign(keypair);
  try {
    const result = await server.submitTransaction(tx);
    if (result?.hash) {
      return result.hash;
    }
    throw new BridgeError("horizon_error", "Transaction submitted but no hash returned.", 502);
  } catch (error) {
    throw mapHorizonError(error);
  }
};

const mapHorizonError = (error: unknown): BridgeError => {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } }; detail?: string }; statusText?: string } }).response;
    if (response) {
      const status = response.status ?? 502;
      const extras = response.data?.extras?.result_codes;
      const parts: string[] = [];
      if (extras?.transaction) {
        parts.push(extras.transaction);
      }
      if (extras?.operations?.length) {
        parts.push(`ops: ${extras.operations.join(", ")}`);
      }
      if (response.data?.detail) {
        parts.push(response.data.detail);
      }
      const hint = parts.length ? parts.join(" | ") : undefined;
      const message = response.statusText ?? "Horizon transaction failed.";
      return new BridgeError("horizon_error", message, status, hint);
    }
  }
  const message = error instanceof Error ? error.message : "Horizon transaction failed.";
  return new BridgeError("horizon_error", message, 502);
};

type LockParams = {
  amount: string;
  asset: "XLM" | "SUSD";
  recipient: string;
  chain?: "EVM";
};

type MintParams = {
  amount: string;
  targetAccount: string;
  evmLockProofCid: string;
};

type RedeemParams = {
  amount: string;
  evmRecipient: string;
};

export type BridgeOperationResult = {
  txHash: string;
  cid: string;
  memoHashHex: string;
};

export const processLock = async ({ amount, asset, recipient, chain = "EVM" }: LockParams): Promise<BridgeOperationResult> => {
  const apiKey = ensureApiKey();
  const normalisedAsset = validateAsset(asset);
  const normalisedAmount = normaliseAmount(amount);
  const normalisedRecipient = validateEvmAddress(recipient);
  const timestamp = new Date().toISOString();

  const metadata = {
    schema: "vesto.lock@1",
    bridgeAccount: BRIDGE_PUBLIC_ACCOUNT,
    chain,
    asset: normalisedAsset,
    assetIssuer: normalisedAsset === "SUSD" ? SUSD_PUBLIC_ISSUER : undefined,
    amount: normalisedAmount,
    recipient: normalisedRecipient,
    timestamp,
  };

  const { cid } = await lighthouseUploadDagCbor(metadata, apiKey);
  const memoHashHex = sha256Hex(cid);
  const { builder, server, bridgeAccount } = await buildBaseTx();

  applyMemoAndData(builder.addOperation(
    Operation.payment({
      destination: bridgeAccount,
      asset: resolvePaymentAsset(normalisedAsset),
      amount: normalisedAmount,
    }),
  ), "vesto.bridge.lock.cid", cid, memoHashHex);

  const txHash = await submitTransaction(builder, server);
  debugObj("[bridge:lock]", { txHash, cid, amount: normalisedAmount, asset: normalisedAsset, recipient: normalisedRecipient });
  return { txHash, cid, memoHashHex };
};

export const processMint = async ({ amount, targetAccount, evmLockProofCid }: MintParams): Promise<BridgeOperationResult> => {
  const apiKey = ensureApiKey();
  const normalisedAmount = normaliseAmount(amount);
  const normalisedTarget = validateStellarAccount(targetAccount);
  const proofCid = validateCid(evmLockProofCid, "evmLockProofCid");
  const timestamp = new Date().toISOString();

  const metadata = {
    schema: "vesto.mint@1",
    bridgeAccount: BRIDGE_PUBLIC_ACCOUNT,
    targetAccount: normalisedTarget,
    amount: normalisedAmount,
    asset: { code: "SUSD", issuer: SUSD_PUBLIC_ISSUER },
    evmLockProofCid: proofCid,
    timestamp,
  };

  const { cid } = await lighthouseUploadDagCbor(metadata, apiKey);
  const memoHashHex = sha256Hex(cid);
  const { builder, server, bridgeAccount } = await buildBaseTx();

  applyMemoAndData(builder.addOperation(
    Operation.payment({
      source: bridgeAccount,
      destination: normalisedTarget,
      asset: resolvePaymentAsset("SUSD"),
      amount: normalisedAmount,
    }),
  ), "vesto.bridge.mint.cid", cid, memoHashHex);

  const txHash = await submitTransaction(builder, server);
  debugObj("[bridge:mint]", { txHash, cid, amount: normalisedAmount, target: normalisedTarget, proofCid });
  return { txHash, cid, memoHashHex };
};

export const processRedeem = async ({ amount, evmRecipient }: RedeemParams): Promise<BridgeOperationResult> => {
  const apiKey = ensureApiKey();
  const normalisedAmount = normaliseAmount(amount);
  const recipient = validateEvmAddress(evmRecipient);
  const timestamp = new Date().toISOString();

  const metadata = {
    schema: "vesto.redeem@1",
    bridgeAccount: BRIDGE_PUBLIC_ACCOUNT,
    targetChain: "EVM",
    recipient,
    amount: normalisedAmount,
    asset: { code: "SUSD", issuer: SUSD_PUBLIC_ISSUER },
    timestamp,
  };

  const { cid } = await lighthouseUploadDagCbor(metadata, apiKey);
  const memoHashHex = sha256Hex(cid);
  const { builder, server, bridgeAccount } = await buildBaseTx();

  applyMemoAndData(builder.addOperation(
    Operation.payment({
      source: bridgeAccount,
      destination: bridgeAccount,
      asset: resolvePaymentAsset("SUSD"),
      amount: normalisedAmount,
    }),
  ), "vesto.bridge.redeem.cid", cid, memoHashHex);

  const txHash = await submitTransaction(builder, server);
  debugObj("[bridge:redeem]", { txHash, cid, amount: normalisedAmount, recipient });
  return { txHash, cid, memoHashHex };
};
