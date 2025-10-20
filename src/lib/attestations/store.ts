import { Buffer } from "buffer";
import { CID } from "multiformats/cid";
import { mutate } from "swr";
import type { HorizonEffect, HorizonOperation, HorizonPayment } from "@/src/hooks/horizon";
import { MANAGE_DATA_SIGNATURE } from "@/src/lib/types/proofs";
import type { Attestation } from "@/src/lib/types/proofs";
import { IPFS_GATEWAY } from "@/src/utils/constants";
import { extractMemoCid, memoHashB64ToHex } from "@/src/lib/horizon/memos";
import { verifyAttestation } from "@/src/lib/attestations/verify";

const ipfsBase = IPFS_GATEWAY.replace(/\/$/, "");
const absoluteUrlPattern = /^https?:\/\//i;

const buildGatewayUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (absoluteUrlPattern.test(trimmed)) return trimmed;
  const stripped = trimmed.replace(/^\/+/, "").replace(/^ipfs\/+/i, "");
  return `${ipfsBase}/${stripped}`;
};

const REVALIDATION_DELAY_MS = 10_000;
const revalidationTimers = new Map<string, ReturnType<typeof setTimeout>>();

const normaliseCid = (raw?: string | null): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    return CID.parse(value).toV1().toString();
  } catch {
    return null;
  }
};

const isAccountDataEffect = (effect: HorizonEffect): effect is HorizonEffect & { value: string } =>
  (effect.type === "data_created" || effect.type === "data_updated") && typeof effect.value === "string";

type EffectBundle = {
  metadataCid?: string;
  signatureString?: string;
  publicKey?: string;
  nonce?: string;
  requestCid?: string;
  manageDataName?: string;
  metadataError?: string;
};

const mergeEffectBundle = (existing: EffectBundle | undefined, incoming: EffectBundle): EffectBundle => ({
  metadataCid: incoming.metadataCid ?? existing?.metadataCid,
  signatureString: incoming.signatureString ?? existing?.signatureString,
  publicKey: incoming.publicKey ?? existing?.publicKey,
  nonce: incoming.nonce ?? existing?.nonce,
  requestCid: incoming.requestCid ?? existing?.requestCid,
  manageDataName: incoming.manageDataName ?? existing?.manageDataName,
  metadataError: incoming.metadataError ?? existing?.metadataError,
});

const buildEffectBundles = (effects: HorizonEffect[]): Map<string, EffectBundle> => {
  const map = new Map<string, EffectBundle>();
  for (const effect of effects) {
    if (!isAccountDataEffect(effect)) continue;
    const txHash = effect.transaction_hash;
    if (!txHash) continue;
    try {
      const decoded = Buffer.from(effect.value, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const attestationExtras = (parsed.attestation ?? {}) as Record<string, unknown>;
      const metadataCidRaw =
        (typeof parsed.metadataCid === "string" && parsed.metadataCid) ||
        (typeof attestationExtras.metadataCid === "string" && attestationExtras.metadataCid) ||
        undefined;
      const bundle: EffectBundle = {
        metadataCid: normaliseCid(metadataCidRaw) ?? undefined,
        signatureString:
          (typeof parsed.signature === "string" && parsed.signature) ||
          (typeof attestationExtras.signature === "string" && attestationExtras.signature) ||
          undefined,
        publicKey:
          (typeof parsed.publicKey === "string" && parsed.publicKey) ||
          (typeof parsed.signedBy === "string" && parsed.signedBy) ||
          (typeof attestationExtras.publicKey === "string" && attestationExtras.publicKey) ||
          (typeof attestationExtras.signedBy === "string" && attestationExtras.signedBy) ||
          undefined,
        nonce:
          (typeof parsed.nonce === "string" && parsed.nonce) ||
          (typeof attestationExtras.nonce === "string" && attestationExtras.nonce) ||
          undefined,
        requestCid:
          (typeof parsed.requestCid === "string" && parsed.requestCid) ||
          (typeof attestationExtras.requestCid === "string" && attestationExtras.requestCid) ||
          undefined,
      };
      const merged = mergeEffectBundle(map.get(txHash), bundle);
      map.set(txHash, merged);
    } catch {
      continue;
    }
  }
  return map;
};

const mergeManageDataBundles = (
  operations: HorizonOperation[],
  effectBundles: Map<string, EffectBundle>,
) => {
  for (const operation of operations) {
    if (operation.type !== "manage_data") continue;
    const txHash = operation.transaction_hash;
    if (!txHash) continue;
    const rawValue = typeof operation.value === "string" ? operation.value : null;
    const bundle: EffectBundle = {
      manageDataName: typeof operation.name === "string" ? operation.name : undefined,
    };

    if (rawValue) {
      let decoded: string | null = null;
      try {
        const buffer = Buffer.from(rawValue, "base64");
        const normalisedInput = rawValue.replace(/=+$/u, "");
        const normalisedOutput = buffer.toString("base64").replace(/=+$/u, "");
        if (normalisedOutput !== normalisedInput) {
          throw new Error("Invalid base64 payload for manage_data value");
        }
        decoded = buffer.toString("utf8");
      } catch (error) {
        bundle.metadataError = error instanceof Error ? error.message : "Failed to decode manage_data value";
      }

      if (decoded) {
        let metadataCidRaw: string | undefined;
        let signatureString: string | undefined;
        let publicKey: string | undefined;
        let nonce: string | undefined;
        let requestCid: string | undefined;

        try {
          const parsed = JSON.parse(decoded) as Record<string, unknown>;
          const attestationExtras = (parsed.attestation ?? {}) as Record<string, unknown>;
          metadataCidRaw =
            (typeof parsed.metadataCid === "string" && parsed.metadataCid) ||
            (typeof attestationExtras.metadataCid === "string" && attestationExtras.metadataCid) ||
            undefined;
          signatureString =
            (typeof parsed.signature === "string" && parsed.signature) ||
            (typeof attestationExtras.signature === "string" && attestationExtras.signature) ||
            undefined;
          publicKey =
            (typeof parsed.publicKey === "string" && parsed.publicKey) ||
            (typeof parsed.signedBy === "string" && parsed.signedBy) ||
            (typeof attestationExtras.publicKey === "string" && attestationExtras.publicKey) ||
            (typeof attestationExtras.signedBy === "string" && attestationExtras.signedBy) ||
            undefined;
          nonce =
            (typeof parsed.nonce === "string" && parsed.nonce) ||
            (typeof attestationExtras.nonce === "string" && attestationExtras.nonce) ||
            undefined;
          requestCid =
            (typeof parsed.requestCid === "string" && parsed.requestCid) ||
            (typeof attestationExtras.requestCid === "string" && attestationExtras.requestCid) ||
            undefined;
        } catch {
          metadataCidRaw = decoded;
        }

        if (metadataCidRaw) {
          bundle.metadataCid = normaliseCid(metadataCidRaw) ?? metadataCidRaw;
        }
        bundle.signatureString = signatureString;
        bundle.publicKey = publicKey;
        bundle.nonce = nonce;
        bundle.requestCid = requestCid;
      }
    }

    const merged = mergeEffectBundle(effectBundles.get(txHash), bundle);
    effectBundles.set(txHash, merged);
  }
};

type PaymentExtractionResult = {
  payments: HorizonPayment[];
  memoHashByTx: Map<string, string>;
};

const buildPaymentsFromOperations = (operations: HorizonOperation[]): PaymentExtractionResult => {
  const memoAttrByTx = new Map<
    string,
    {
      memo_type?: string | null;
      memo?: string | null;
      signatures?: string[];
    }
  >();

  const normalizeMemoAttr = (
    txHash: string,
    candidate?: { memo_type?: string | null; memo?: string | null; signatures?: string[] },
  ) => {
    if (!candidate) return;
    const existing = memoAttrByTx.get(txHash) ?? {};
    if (candidate.memo_type && !existing.memo_type) {
      existing.memo_type = candidate.memo_type;
    }
    if (candidate.memo && !existing.memo) {
      existing.memo = candidate.memo;
    }
    if (candidate.signatures && candidate.signatures.length) {
      existing.signatures = candidate.signatures;
    }
    memoAttrByTx.set(txHash, existing);
  };

  for (const operation of operations) {
    const txHash = operation.transaction_hash;
    if (!txHash) continue;
    const attr =
      operation.transaction_attr ??
      ((operation as unknown as { transaction?: { memo_type?: string | null; memo?: string | null; signatures?: string[] } }).transaction ??
        undefined);
    normalizeMemoAttr(txHash, attr);
  }

  const memoHashByTx = new Map<string, string>();
  memoAttrByTx.forEach((attr, txHash) => {
    if (attr.memo && attr.memo_type === "hash") {
      try {
        const hash = memoHashB64ToHex(attr.memo).toLowerCase();
        memoHashByTx.set(txHash, hash);
      } catch {
        // ignore malformed memo
      }
    }
  });

  const payments: HorizonPayment[] = [];
  for (const operation of operations) {
    if (operation.type !== "payment") continue;
    const txHash = operation.transaction_hash;
    if (!txHash) continue;
    const attr = memoAttrByTx.get(txHash);
    const normalizedAttr = attr
      ? {
          memo_type: attr.memo_type ?? undefined,
          memo: attr.memo ?? undefined,
          signatures: attr.signatures,
        }
      : undefined;
    payments.push({
      id: operation.id,
      created_at: operation.created_at,
      type: "payment",
      amount: typeof operation.amount === "string" ? operation.amount : operation.amount != null ? String(operation.amount) : undefined,
      asset_type: typeof operation.asset_type === "string" ? operation.asset_type : undefined,
      asset_code: typeof operation.asset_code === "string" ? operation.asset_code : undefined,
      asset_issuer: typeof operation.asset_issuer === "string" ? operation.asset_issuer : undefined,
      transaction_hash: txHash,
      transaction_successful: operation.transaction_successful,
      source_account: operation.source_account ?? (typeof operation.from === "string" ? operation.from : undefined),
      to: typeof operation.to === "string" ? operation.to : undefined,
      from: typeof operation.from === "string" ? operation.from : operation.source_account,
      memo: normalizedAttr?.memo ?? null,
      transaction_attr: normalizedAttr,
    });
  }

  return { payments, memoHashByTx };
};

type AttestationCandidate = {
  payment: HorizonPayment;
  metadataCid: string;
  memoHashHex?: string;
};

const buildAttestation = async (
  candidate: AttestationCandidate,
  effectBundle?: EffectBundle,
): Promise<Attestation | null> => {
  try {
    const strictVerify = (process.env.NEXT_PUBLIC_STRICT_VERIFY ?? "").trim() === "1";
    const txAttr = candidate.payment.transaction_attr;
    const feeXlm =
      txAttr?.fee_charged != null ? Number(txAttr.fee_charged) / 1e7 : undefined;
    const sigCount = txAttr?.signatures?.length ?? undefined;
    const txSourceAccount =
      txAttr?.source_account ??
      candidate.payment.source_account ??
      candidate.payment.from ??
      null;

    const verifyResult = await verifyAttestation(
      {
        metadataCid: candidate.metadataCid,
        proofCid: effectBundle?.metadataCid ?? undefined,
        memoHashHex: candidate.memoHashHex ?? null,
        requestCid: effectBundle?.requestCid ?? undefined,
        requestMemoHashHex: candidate.memoHashHex ?? undefined,
      },
      { strict: strictVerify },
    );

    const metadata = verifyResult.metadata ?? null;
    const fileCid =
      metadata?.fileCid ??
      metadata?.proofCid ??
      candidate.metadataCid;
    const reserveAmount = metadata?.reserveAmount ?? 0;
    const week = metadata?.week ?? 0;
    const timestamp =
      metadata?.timestamp ??
      candidate.payment.created_at;
    const signatureString =
      effectBundle?.signatureString ??
      metadata?.attestation?.signature ??
      MANAGE_DATA_SIGNATURE;
    const signatureType: Attestation["signatureType"] =
      signatureString.toUpperCase() === MANAGE_DATA_SIGNATURE ? "manageData" : "ed25519";
    const signedBy =
      metadata?.attestation?.signedBy ??
      metadata?.issuer ??
      effectBundle?.publicKey ??
      txSourceAccount ??
      "";
    const nonce =
      effectBundle?.nonce ??
      metadata?.attestation?.nonce ??
      "";
    const requestCid =
      effectBundle?.requestCid ??
      metadata?.request?.cid ??
      metadata?.attestation?.requestCid;

    return {
      week,
      reserveUSD: reserveAmount,
      ipfs: {
        hash: fileCid,
        url: buildGatewayUrl(fileCid),
        mime: metadata?.mime,
        size: metadata?.size,
      },
      metadataCid: candidate.metadataCid,
      proofCid: metadata?.proofCid,
      memoHashHex: candidate.memoHashHex,
      signedBy,
      signature: signatureString,
      signatureType,
      nonce,
      status: verifyResult.status,
      ts: timestamp,
      txHash: candidate.payment.transaction_hash,
      requestCid: requestCid ?? undefined,
      signatureCount: sigCount ?? 0,
      metadataFetchFailed: verifyResult.status === "Recorded" && !metadata,
      metadataFailureReason: verifyResult.reason,
      feeXlm,
      sigCount,
      txSourceAccount: txSourceAccount ?? undefined,
      requestMemoHashHex: candidate.memoHashHex,
    } satisfies Attestation;
  } catch (error) {
    const txAttr = candidate.payment.transaction_attr;
    const sigCount = txAttr?.signatures?.length ?? undefined;
    const feeXlm =
      txAttr?.fee_charged != null ? Number(txAttr.fee_charged) / 1e7 : undefined;
    const txSourceAccount =
      txAttr?.source_account ??
      candidate.payment.source_account ??
      candidate.payment.from ??
      undefined;

    return {
      week: 0,
      reserveUSD: 0,
      ipfs: {
        hash: candidate.metadataCid,
        url: buildGatewayUrl(candidate.metadataCid),
      },
      metadataCid: candidate.metadataCid,
      memoHashHex: candidate.memoHashHex,
      signedBy: txSourceAccount ?? effectBundle?.publicKey ?? "",
      signature: effectBundle?.signatureString ?? MANAGE_DATA_SIGNATURE,
      signatureType:
        (effectBundle?.signatureString ?? MANAGE_DATA_SIGNATURE).toUpperCase() === MANAGE_DATA_SIGNATURE
          ? "manageData"
          : "ed25519",
      nonce: effectBundle?.nonce ?? "",
      status: "Recorded",
      ts: candidate.payment.created_at,
      txHash: candidate.payment.transaction_hash,
      requestCid: effectBundle?.requestCid,
      signatureCount: sigCount ?? 0,
      metadataFetchFailed: true,
      metadataFailureReason:
        error instanceof Error ? error.message : "metadata-fetch-failed",
      feeXlm,
      sigCount,
      txSourceAccount,
      requestMemoHashHex: candidate.memoHashHex,
    } satisfies Attestation;
  }
};

const dedupeCandidates = (
  payments: HorizonPayment[],
  effectBundles: Map<string, EffectBundle>,
  memoHashByTx: Map<string, string>,
): AttestationCandidate[] => {
  const map = new Map<string, AttestationCandidate>();
  payments.forEach((payment) => {
    const txHash = payment.transaction_hash;
    const effect = txHash ? effectBundles.get(txHash) : undefined;
    const rawCid = extractMemoCid(payment) ?? effect?.metadataCid ?? null;
    const metadataCid = rawCid ? normaliseCid(rawCid) ?? rawCid : null;
    if (!metadataCid) return;

    const candidate: AttestationCandidate = {
      payment,
      metadataCid,
      memoHashHex: txHash ? memoHashByTx.get(txHash) : undefined,
    };

    const existing = map.get(metadataCid);
    if (!existing) {
      map.set(metadataCid, candidate);
      return;
    }

    const existingDate = new Date(existing.payment.created_at).getTime();
    const currentDate = new Date(payment.created_at).getTime();
    if (currentDate > existingDate) {
      map.set(metadataCid, candidate);
    }
  });
  return Array.from(map.values());
};

const scheduleRevalidations = (attestations: Attestation[]) => {
  attestations.forEach((att) => {
    const existing = revalidationTimers.get(att.metadataCid);
    if (att.status === "Verified" || att.status === "Invalid") {
      if (existing) {
        clearTimeout(existing);
        revalidationTimers.delete(att.metadataCid);
      }
      return;
    }
    if (att.status !== "Recorded") {
      return;
    }
    if (existing) {
      return;
    }
    const timer = setTimeout(async () => {
      revalidationTimers.delete(att.metadataCid);
      try {
        await Promise.all([mutate("proofs:list"), mutate("dashboard:attestations")]);
      } catch {
        // swallow mutate errors
      }
    }, REVALIDATION_DELAY_MS);
    revalidationTimers.set(att.metadataCid, timer);
  });
};

export const resolveAttestations = async (
  operations?: HorizonOperation[],
  effects?: HorizonEffect[],
): Promise<Attestation[]> => {
  if (!operations?.length) return [];
  const { payments, memoHashByTx } = buildPaymentsFromOperations(operations);
  if (!payments.length) return [];
  const effectBundles = buildEffectBundles(effects ?? []);
  mergeManageDataBundles(operations, effectBundles);
  const candidates = dedupeCandidates(payments, effectBundles, memoHashByTx);
  const resolved = await Promise.all(
    candidates.map((candidate) =>
      buildAttestation(candidate, candidate.payment.transaction_hash ? effectBundles.get(candidate.payment.transaction_hash) : undefined),
    ),
  );
  const attestations = resolved
    .filter((item): item is Attestation => item !== null)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  scheduleRevalidations(attestations);

  return attestations;
};
