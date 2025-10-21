"use client";

import { getViaGateway } from "@/src/lib/ipfs/client";
import type { Attestation, ProofStatus, ProofType } from "@/src/lib/types/proofs";
import type { BridgeLock, BridgeMint, BridgeRedeem } from "@/src/lib/types/bridge";
import { BRIDGE_PUBLIC_ACCOUNT } from "@/src/utils/constants";
import type { StoredProof } from "@/src/lib/proofs/storage";
import { formatDate, formatDateTime, formatRelativeTime } from "@/src/lib/utils/format";
import { shortHash } from "@/src/lib/utils/text";
import type { ReserveProofRecord } from "@/src/lib/spv/store";

export type ProofListItem = {
  id: string;
  type: ProofType;
  title: string;
  subtitle: string;
  cid: string;
  metadataCid: string;
  sha256: string;
  hashLabel: string;
  hashShort: string;
  uploadedAt: string;
  uploadedAtLabel: string;
  status: ProofStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  verifiedAtLabel?: string;
  txHash?: string;
  gatewayUrl: string;
  size?: number;
  mime?: string;
  source: "local" | "attestation";
};

export type ProofQuickCard = {
  type: ProofType;
  title: string;
  description: string;
  cid?: string;
  status: ProofStatus;
  badgeLabel?: string;
  hashLabel?: string;
  gatewayUrl?: string;
  updatedAt?: string;
};

export type ProofDiagnostics = {
  timestamp: string;
  total: number;
  matched: number;
  unmatched: number;
  verifiedCount: number;
  recordedCount: number;
  skippedCount: number;
  cidFetchErrors: number;
  droppedByReason: Record<string, number>;
  samples: Array<{
    metadataCid: string;
    cid: string;
    status: ProofStatus;
    hasAttestation: boolean;
  }>;
};

export type SpvStatusSummary = {
  status: "Active" | "Reviewing" | "Suspended";
  updatedAt?: string;
};

export type ProofStats = {
  total: number;
  verified: number;
  pending: number;
  invalid: number;
};

const QUICK_CARD_DESCRIPTIONS: Record<ProofType, string> = {
  "Audit Report": "Independent attestation covering custodial reserves and liabilities.",
  "Insurance Policy": "Coverage certificate for custodial wallets and operational risk.",
  "Legal Agreement": "Master trust agreement outlining SPV structure and investor rights.",
  Ownership: "Ownership documentation submitted by custodial entities.",
  Appraisal: "Third-party valuation or appraisal supporting reserve claims.",
  "Reserve Proof": "Weekly reserve JSON committed on-chain via memo hash.",
  "Bridge Proof": "Bridge lock/mint/redeem metadata anchored on Stellar via memo hash.",
  Other: "Additional documentation supplied by the custodian.",
};

const PRIMARY_CARD_TYPES: ProofType[] = [
  "Audit Report",
  "Insurance Policy",
  "Legal Agreement",
  "Reserve Proof",
  "Bridge Proof",
];

const normalizeStatus = (status?: ProofStatus): ProofStatus => {
  if (status === "Verified" || status === "Invalid" || status === "Recorded") return status;
  return "Pending";
};

const toHexPrefixed = (value: string): string => {
  if (!value) return "";
  return value.startsWith("0x") ? value : `0x${value}`;
};

const stripExtension = (name?: string): string => {
  if (!name) return "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) return name;
  return name.slice(0, lastDot);
};

const deriveSubtitle = (proof: StoredProof): string => stripExtension(proof.name) || "Untitled proof";

const buildAttestationMaps = (attestations: Attestation[]) => {
  const byCid = new Map<string, Attestation>();
  const byMetadata = new Map<string, Attestation>();
  attestations.forEach((att) => {
    if (att.ipfs?.hash) {
      byCid.set(att.ipfs.hash, att);
    }
    if (att.metadataCid) {
      byMetadata.set(att.metadataCid, att);
    }
  });
  return { byCid, byMetadata };
};

const formatUploadedAt = (iso: string) => ({
  iso,
  label: formatDate(iso),
  relative: formatRelativeTime(iso),
});

const toUpper = (value?: string | null): string => (value ?? "").trim().toUpperCase();

const resolveJoinedAttestation = (
  proof: { cid: string; metadataCid: string },
  maps: ReturnType<typeof buildAttestationMaps>,
  custodianAccountUpper: string,
): Attestation | null => {
  const candidates = new Set<Attestation>();
  const byCidAtt = maps.byCid.get(proof.cid);
  if (byCidAtt) candidates.add(byCidAtt);
  const byMetadataAtt = maps.byMetadata.get(proof.metadataCid);
  if (byMetadataAtt) candidates.add(byMetadataAtt);

  for (const candidate of candidates) {
    const signerUpper = toUpper(candidate.txSourceAccount ?? candidate.signedBy);
    if (custodianAccountUpper && signerUpper !== custodianAccountUpper) {
      continue;
    }
    const proofCid = (candidate.proofCid ?? candidate.ipfs?.hash ?? "").trim();
    if (!proofCid) continue;
    if (proofCid === proof.cid) {
      return candidate;
    }
  }

  return null;
};

const toReserveSubtitle = (proof: ReserveProofRecord): string => {
  const week = proof.metadata?.week ?? null;
  if (week != null) {
    return `Week ${week}`;
  }
  return "Reserve commitment";
};

const toReserveStatus = (status: ReserveProofRecord["status"]): ProofStatus => {
  if (status === "Invalid") return "Invalid";
  if (status === "Verified") return "Verified";
  return "Recorded";
};

export const buildProofList = (
  stored: StoredProof[],
  attestations: Attestation[],
  reserveProofs: ReserveProofRecord[] = [],
  bridgeLocks: BridgeLock[] = [],
  bridgeMints: BridgeMint[] = [],
  bridgeRedeems: BridgeRedeem[] = [],
): ProofListItem[] => {
  const maps = buildAttestationMaps(attestations);
  const custodianAccountUpper = toUpper(process.env.NEXT_PUBLIC_CUSTODIAN_ACCOUNT);

  const mapBridgeRecord = (
    record: BridgeLock | BridgeMint | BridgeRedeem,
    kind: "Lock" | "Mint" | "Redeem",
    subtitleValue: string,
  ): ProofListItem => {
    const memoHex = toHexPrefixed(record.memoHashHex);
    const uploaded = formatUploadedAt(record.createdAt);
    const subtitleParts = [subtitleValue];
    if (record.status !== "Verified") {
      subtitleParts.push(record.metadataError ? `metadata: ${record.metadataError}` : "metadata pending");
    }
    const signer =
      "account" in record && typeof record.account === "string" && record.account.length > 0
        ? record.account
        : BRIDGE_PUBLIC_ACCOUNT;
    return {
      id: `bridge:${kind}:${record.id}`,
      type: "Bridge Proof",
      title: `Bridge ${kind}`,
      subtitle: subtitleParts.join(" · "),
      cid: record.proofCid,
      metadataCid: record.proofCid,
      sha256: memoHex,
      hashLabel: memoHex,
      hashShort: memoHex ? shortHash(memoHex, 8, 6) : "",
      uploadedAt: uploaded.iso,
      uploadedAtLabel: uploaded.label,
      status: record.status,
      verifiedBy: signer,
      verifiedAt: record.createdAt,
      verifiedAtLabel: formatDateTime(record.createdAt),
      txHash: record.id,
      gatewayUrl: getViaGateway(record.proofCid),
      size: undefined,
      mime: "application/json",
      source: "attestation",
    };
  };

  const list: ProofListItem[] = stored.map((entry) => {
    const matched = resolveJoinedAttestation(entry, maps, custodianAccountUpper);
    const status: ProofStatus = matched
      ? matched.status === "Verified"
        ? "Verified"
        : matched.status === "Invalid"
          ? "Invalid"
          : "Recorded"
      : "Pending";
    const uploaded = formatUploadedAt(entry.uploadedAt || matched?.ts || new Date().toISOString());
    return {
      id: entry.metadataCid || entry.cid,
      type: entry.type,
      title: entry.type,
      subtitle: deriveSubtitle(entry),
      cid: entry.cid,
      metadataCid: entry.metadataCid,
      sha256: toHexPrefixed(entry.sha256),
      hashLabel: toHexPrefixed(entry.sha256),
      hashShort: shortHash(toHexPrefixed(entry.sha256), 8, 6),
      uploadedAt: uploaded.iso,
      uploadedAtLabel: uploaded.label,
      status,
      verifiedBy: matched?.signedBy,
      verifiedAt: matched?.ts,
      verifiedAtLabel: matched?.ts ? formatDateTime(matched.ts) : undefined,
      txHash: matched?.txHash,
      gatewayUrl: getViaGateway(entry.cid),
      size: entry.size,
      mime: entry.mime,
      source: matched ? "attestation" : "local",
    };
  });

  const reserveItems = reserveProofs.map<ProofListItem>((proof) => {
    const status = toReserveStatus(proof.status);
    const uploaded = formatUploadedAt(proof.ts);
    const memoHex = proof.memoHashHex ?? "";
    return {
      id: `reserve:${proof.txHash}:${proof.cid}`,
      type: "Reserve Proof",
      title: "Reserve Proof",
      subtitle: toReserveSubtitle(proof),
      cid: proof.cid,
      metadataCid: proof.cid,
      sha256: memoHex,
      hashLabel: memoHex,
      hashShort: memoHex ? shortHash(memoHex, 8, 6) : "",
      uploadedAt: uploaded.iso,
      uploadedAtLabel: uploaded.label,
      status,
      verifiedBy: undefined,
      verifiedAt: proof.metadata?.asOf,
      verifiedAtLabel: proof.metadata?.asOf ? formatDateTime(proof.metadata.asOf) : undefined,
      txHash: proof.txHash,
      gatewayUrl: proof.gatewayUrl,
      size: undefined,
      mime: "application/json",
      source: "attestation",
    } satisfies ProofListItem;
  });

  const bridgeItems = [
    ...bridgeLocks.map((record) =>
      mapBridgeRecord(record, "Lock", `Recipient · ${record.recipient || "pending recipient"}`),
    ),
    ...bridgeMints.map((record) =>
      mapBridgeRecord(record, "Mint", `Target · ${record.targetAccount || "pending target"}`),
    ),
    ...bridgeRedeems.map((record) =>
      mapBridgeRecord(record, "Redeem", `Recipient · ${record.recipient || "pending recipient"}`),
    ),
  ];

  return [...list, ...reserveItems, ...bridgeItems].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
};

export const buildQuickCards = (proofs: ProofListItem[]): ProofQuickCard[] =>
  PRIMARY_CARD_TYPES.map((type) => {
    const proof = proofs.find((item) => item.type === type);
    if (!proof) {
      return {
        type,
        title: type,
        description: QUICK_CARD_DESCRIPTIONS[type],
        status: "Pending",
      } satisfies ProofQuickCard;
    }
    return {
      type,
      title: type,
      description: QUICK_CARD_DESCRIPTIONS[type],
      cid: proof.cid,
      status: normalizeStatus(proof.status),
      badgeLabel: proof.hashShort,
      hashLabel: proof.hashLabel,
      gatewayUrl: proof.gatewayUrl,
      updatedAt: proof.verifiedAt ?? proof.uploadedAt,
    } satisfies ProofQuickCard;
  });

export const buildDiagnostics = (proofs: ProofListItem[], attestations: Attestation[]): ProofDiagnostics => {
  const maps = buildAttestationMaps(attestations);
  const custodianAccountUpper = toUpper(process.env.NEXT_PUBLIC_CUSTODIAN_ACCOUNT);
  const dropped: Record<string, number> = {};
  let matched = 0;
  let verifiedCount = 0;
  let recordedCount = 0;

  proofs.forEach((proof) => {
    const joined = resolveJoinedAttestation(proof, maps, custodianAccountUpper);
    if (joined) {
      matched += 1;
      if (joined.status === "Verified") {
        verifiedCount += 1;
      } else if (joined.status === "Recorded") {
        recordedCount += 1;
      }
    } else {
      dropped["no-attestation"] = (dropped["no-attestation"] ?? 0) + 1;
    }
    if (!proof.sha256) {
      dropped["missing-hash"] = (dropped["missing-hash"] ?? 0) + 1;
    }
  });

  const samples = proofs.slice(0, 3).map((item) => ({
    metadataCid: item.metadataCid,
    cid: item.cid,
    status: item.status,
    hasAttestation: Boolean(resolveJoinedAttestation(item, maps, custodianAccountUpper)),
  }));

  const cidFetchErrors = attestations.filter((att) => att.metadataFetchFailed).length;
  const skippedCount = proofs.length - matched;

  return {
    timestamp: new Date().toISOString(),
    total: proofs.length,
    matched,
    unmatched: proofs.length - matched,
    verifiedCount,
    recordedCount,
    skippedCount,
    cidFetchErrors,
    droppedByReason: dropped,
    samples,
  };
};

export const deriveSpvStatus = (attestations: Attestation[]): SpvStatusSummary => {
  if (!attestations.length) {
    return { status: "Reviewing" };
  }
  const latest = [...attestations].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  )[0];
  const status = latest.status === "Verified" ? "Active" : latest.status === "Invalid" ? "Suspended" : "Reviewing";
  return {
    status,
    updatedAt: latest.ts,
  };
};

export const buildProofStats = (proofs: ProofListItem[]): ProofStats => {
  const stats: ProofStats = {
    total: proofs.length,
    verified: 0,
    pending: 0,
    invalid: 0,
  };
  proofs.forEach((proof) => {
    switch (proof.status) {
      case "Verified":
        stats.verified += 1;
        break;
      case "Invalid":
        stats.invalid += 1;
        break;
      default:
        stats.pending += 1;
        break;
    }
  });
  return stats;
};
