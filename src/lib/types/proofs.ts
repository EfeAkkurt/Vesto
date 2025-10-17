export type Chain = "Stellar" | "Ethereum" | "Solana";

export interface ProofRef {
  hash: string;
  url: string;
  size?: number;
  mime?: string;
}

export type ProofType =
  | "Audit Report"
  | "Insurance Policy"
  | "Legal Agreement"
  | "Ownership"
  | "Appraisal"
  | "Other";

export type ProofStatus = "Verified" | "Pending" | "Rejected";

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
}

export interface Attestation {
  week: number;
  reserveUSD: number;
  ipfs: ProofRef;
  metadataCid: string;
  signedBy: string;
  signature: string;
  signatureType: "ed25519";
  nonce: string;
  status: "Pending" | "Verified" | "Invalid";
  ts: string;
  txHash: string;
}
