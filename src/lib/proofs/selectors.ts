"use client";

import { getViaGateway } from "@/src/lib/ipfs/client";
import type { Attestation, ProofStatus, ProofType } from "@/src/lib/types/proofs";
import type { StoredProof } from "@/src/lib/proofs/storage";
import { formatDate, formatDateTime, formatRelativeTime } from "@/src/lib/utils/format";
import { shortHash } from "@/src/lib/utils/format";

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
  Other: "Additional documentation supplied by the custodian.",
};

const PRIMARY_CARD_TYPES: ProofType[] = ["Audit Report", "Insurance Policy", "Legal Agreement"];

const normalizeStatus = (status?: ProofStatus): ProofStatus => {
  if (status === "Verified" || status === "Invalid") return status;
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

const toProofStatus = (att?: Attestation | null): ProofStatus => {
  if (!att) return "Pending";
  if (att.status === "Invalid") return "Invalid";
  if (att.status === "Verified") return "Verified";
  return "Pending";
};

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

export const buildProofList = (stored: StoredProof[], attestations: Attestation[]): ProofListItem[] => {
  const { byCid, byMetadata } = buildAttestationMaps(attestations);
  const list = stored.map<ProofListItem>((entry) => {
    const attestation = byCid.get(entry.cid) ?? byMetadata.get(entry.metadataCid) ?? null;
    const status = toProofStatus(attestation);
    const uploaded = formatUploadedAt(entry.uploadedAt || attestation?.ts || new Date().toISOString());
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
      verifiedBy: attestation?.signedBy,
      verifiedAt: attestation?.ts,
      verifiedAtLabel: attestation?.ts ? formatDateTime(attestation.ts) : undefined,
      txHash: attestation?.txHash,
      gatewayUrl: getViaGateway(entry.cid),
      size: entry.size,
      mime: entry.mime,
      source: "local",
    };
  });

  return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
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
  const { byCid, byMetadata } = buildAttestationMaps(attestations);
  const dropped: Record<string, number> = {};
  let matched = 0;

  proofs.forEach((proof) => {
    const hasAttestation = byCid.has(proof.cid) || byMetadata.has(proof.metadataCid);
    if (hasAttestation) {
      matched += 1;
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
    hasAttestation: Boolean(byCid.has(item.cid) || byMetadata.has(item.metadataCid)),
  }));

  return {
    timestamp: new Date().toISOString(),
    total: proofs.length,
    matched,
    unmatched: proofs.length - matched,
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
