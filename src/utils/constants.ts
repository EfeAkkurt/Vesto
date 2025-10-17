export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: "dashboard" | "tokenize" | "custodian" | "proofs" | "bridge";
};

export const HORIZON = process.env.NEXT_PUBLIC_HORIZON_URL!;
export const STELLAR_NET = process.env.NEXT_PUBLIC_STELLAR_NETWORK!;

const DEFAULT_IPFS_GATEWAY = "https://gateway.lighthouse.storage/ipfs/";

const gatewayCandidate =
  (process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? process.env.IPFS_GATEWAY ?? DEFAULT_IPFS_GATEWAY) as string;
const trimmedGateway = gatewayCandidate.trim() || DEFAULT_IPFS_GATEWAY;
export const IPFS_GATEWAY = trimmedGateway.endsWith("/") ? trimmedGateway.slice(0, -1) : trimmedGateway;
export const CUSTODIAN_ACCOUNT = process.env.NEXT_PUBLIC_CUSTODIAN_ACCOUNT?.trim() ?? "";
export const ISSUER_ACCOUNT = process.env.NEXT_PUBLIC_ISSUER_ACCOUNT?.trim() ?? "";
export const TOKEN_ASSET_CODE = process.env.NEXT_PUBLIC_TOKEN_ASSET_CODE?.trim() ?? "";
export const TOKEN_ASSET_ISSUER = process.env.NEXT_PUBLIC_TOKEN_ASSET_ISSUER?.trim() ?? "";

export const SIDEBAR_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "tokenize", label: "Tokenize", href: "/tokenize", icon: "tokenize" },
  { key: "custodian", label: "Custodian", href: "/custodian", icon: "custodian" },
  { key: "proofs", label: "Proofs", href: "/proofs", icon: "proofs" },
  { key: "bridge", label: "Bridge", href: "/bridge", icon: "bridge" },
];

export const TX_TYPE_LABELS: Record<string, string> = {
  MINT: "Mint",
  BURN: "Burn",
  DIST: "Distribution",
  ATTEST: "Attestation",
};

export const TX_STATUS_BADGE: Record<string, { label: string; tone: "success" | "pending" | "failed" }> = {
  success: { label: "Success", tone: "success" },
  pending: { label: "Pending", tone: "pending" },
  failed: { label: "Failed", tone: "failed" },
};

export const NETWORK_OPTIONS = [
  { label: "Testnet", value: "TestNet" as const },
  { label: "Mainnet", value: "Mainnet" as const },
];
