export type BridgeLock = {
  id: string;
  amount: string;
  asset: "XLM" | "SUSD";
  chain: "EVM";
  recipient: string;
  proofCid: string;
  memoHashHex: string;
  account: string;
  createdAt: string;
  feeXlm: number;
  sigs: number;
  status: "Verified" | "Recorded" | "Invalid";
  metadataError?: string;
};

export type BridgeMint = {
  id: string;
  amount: string;
  asset: "SUSD";
  targetAccount: string;
  proofCid: string;
  memoHashHex: string;
  createdAt: string;
  feeXlm: number;
  sigs: number;
  status: "Verified" | "Recorded" | "Invalid";
  metadataError?: string;
};

export type BridgeRedeem = {
  id: string;
  amount: string;
  asset: "SUSD";
  targetChain: "EVM";
  recipient: string;
  burnTx?: string;
  proofCid: string;
  memoHashHex: string;
  createdAt: string;
  feeXlm: number;
  sigs: number;
  status: "Verified" | "Recorded" | "Invalid";
  metadataError?: string;
};

export type BridgeStats = {
  totalLockedXlm: string;
  totalMintedSusd: string;
  totalRedeemedSusd: string;
  ops7d: number;
  ops30d: number;
};
