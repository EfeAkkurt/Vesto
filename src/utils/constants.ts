export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: "dashboard" | "tokenize" | "custodian" | "proofs" | "bridge";
};

const horizonCandidate = (process.env.NEXT_PUBLIC_HORIZON_URL ?? "").trim();
if (!horizonCandidate) {
  throw new Error("NEXT_PUBLIC_HORIZON_URL is required.");
}
export const HORIZON = horizonCandidate;

const networkCandidate = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "").trim();
if (!networkCandidate) {
  throw new Error("NEXT_PUBLIC_STELLAR_NETWORK is required.");
}
export const STELLAR_NET = networkCandidate;

const requiredEnv = [
  ["NEXT_PUBLIC_CUSTODIAN_ACCOUNT", process.env.NEXT_PUBLIC_CUSTODIAN_ACCOUNT],
  ["NEXT_PUBLIC_ISSUER_ACCOUNT", process.env.NEXT_PUBLIC_ISSUER_ACCOUNT],
  ["NEXT_PUBLIC_TOKEN_ASSET_CODE", process.env.NEXT_PUBLIC_TOKEN_ASSET_CODE],
  ["NEXT_PUBLIC_TOKEN_ASSET_ISSUER", process.env.NEXT_PUBLIC_TOKEN_ASSET_ISSUER],
] as const;

const missingEnv = requiredEnv
  .map(([key, value]) => [key, value?.trim() ?? ""] as const)
  .filter(([, value]) => value.length === 0)
  .map(([key]) => key);

if (missingEnv.length) {
  const message = `Missing required environment variables: ${missingEnv.join(", ")}`;
  if (typeof window !== "undefined") {
    console.warn(message);
  }
  throw new Error(message);
}

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
