export type Chain = "Stellar" | "Ethereum" | "Solana";

export interface ProofRef {
  hash: string;
  url: string;
  size?: number;
  mime?: string;
  name?: string;
}

export const PROOF_TYPE_OPTIONS = [
  "Audit Report",
  "Insurance Policy",
  "Legal Agreement",
  "Ownership",
  "Appraisal",
  "Reserve Proof",
  "Bridge Proof",
  "Other",
] as const;

export type ProofType = (typeof PROOF_TYPE_OPTIONS)[number];

export type ProofStatus = "Verified" | "Recorded" | "Pending" | "Invalid";

export interface ProofItem {
  id: string;
  type: ProofType;
  asset?: string;
  status: ProofStatus;
  hash: string;
  url: string;
  date: string;
  verifiedBy?: string;
}

export interface ReservePoint {
  week: number;
  reserveUSD: number;
}

export interface BridgeTx {
  id: string;
  chainFrom: Chain;
  chainTo: Chain;
  asset: string;
  amount: number;
  hash: string;
  status: "completed" | "pending" | "failed";
  ts: string;
  explorer?: string;
}

export type AssetType = "Invoice" | "Subscription" | "Rent" | "Carbon Credit";

export interface MintResult {
  tokenId: string;
  supply: number;
  proof: ProofRef;
  metadataCid?: string;
  txHash?: string;
  destination?: string;
  requestCid?: string;
}

export interface Attestation {
  week: number;
  reserveUSD: number;
  ipfs: ProofRef;
  metadataCid: string;
  proofCid?: string;
  memoHashHex?: string;
  signedBy: string;
  signature: string;
  signatureType: "ed25519" | "manageData";
  nonce: string;
  status: "Pending" | "Recorded" | "Verified" | "Invalid";
  ts: string;
  txHash: string;
  requestCid?: string;
  signatureCount?: number;
  metadataFetchFailed?: boolean;
  metadataFailureReason?: string;
  feeXlm?: number;
  sigCount?: number;
  txSourceAccount?: string;
  requestMemoHashHex?: string;
}

export const MANAGE_DATA_SIGNATURE = "MANAGE_DATA";
