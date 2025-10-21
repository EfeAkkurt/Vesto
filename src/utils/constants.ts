export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: "dashboard" | "tokenize" | "custodian" | "proofs" | "bridge" | "spv";
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

const bridgeAccountCandidate = (
  process.env.BRIDGE_ACCOUNT ??
  process.env.NEXT_PUBLIC_BRIDGE_ACCOUNT ??
  ""
) as string;

const trimmedBridgeAccount = bridgeAccountCandidate.trim();
const trimmedPublicBridgeAccount = (process.env.NEXT_PUBLIC_BRIDGE_ACCOUNT ?? trimmedBridgeAccount).trim();
const rawBridgeNetwork = (process.env.NEXT_PUBLIC_BRIDGE_NETWORK ?? "").trim();

export const BRIDGE_ACCOUNT = trimmedBridgeAccount;
export const BRIDGE_PUBLIC_ACCOUNT = trimmedPublicBridgeAccount;
export const BRIDGE_NETWORK = rawBridgeNetwork || "TESTNET";

export const SUSD_PUBLIC_CODE = (process.env.NEXT_PUBLIC_SUSD_CODE ?? "").trim();
export const SUSD_PUBLIC_ISSUER = (process.env.NEXT_PUBLIC_SUSD_ISSUER ?? "").trim();
export const USDC_ISSUER = (process.env.NEXT_PUBLIC_USDC_ISSUER ?? "").trim();

const bridgeEnvMissing = [] as string[];
if (!BRIDGE_PUBLIC_ACCOUNT) bridgeEnvMissing.push("NEXT_PUBLIC_BRIDGE_ACCOUNT");
if (!SUSD_PUBLIC_CODE) bridgeEnvMissing.push("NEXT_PUBLIC_SUSD_CODE");
if (!SUSD_PUBLIC_ISSUER) bridgeEnvMissing.push("NEXT_PUBLIC_SUSD_ISSUER");
if (!USDC_ISSUER) bridgeEnvMissing.push("NEXT_PUBLIC_USDC_ISSUER");

export const isBridgeEnvConfigured = bridgeEnvMissing.length === 0;
export const getBridgeEnvDiagnostics = () => ({ missing: [...bridgeEnvMissing] });

const spvAccountCandidate = (
  process.env.SPV_ACCOUNT ??
  process.env.NEXT_PUBLIC_SPV_ACCOUNT ??
  ""
)?.trim() ?? "";

if (!spvAccountCandidate) {
  throw new Error("SPV_ACCOUNT is required.");
}

const publicSpvAccountCandidate = (process.env.NEXT_PUBLIC_SPV_ACCOUNT ?? spvAccountCandidate).trim() || spvAccountCandidate;
const susdAssetCode = (
  process.env.SUSD_ASSET_CODE ??
  process.env.NEXT_PUBLIC_SUSD_CODE ??
  ""
).trim();
const susdIssuer = (
  process.env.SUSD_ISSUER ??
  process.env.NEXT_PUBLIC_SUSD_ISSUER ??
  ""
).trim();
const spvSignerConfigured = (process.env.SPV_SIGNER_SECRET ?? "").trim().length > 0;

export const getSpvAccount = (): string => publicSpvAccountCandidate;

export const getSusdAssetOrNull = (): { code: string; issuer: string } | null => {
  if (!susdAssetCode || !susdIssuer) return null;
  return { code: susdAssetCode, issuer: susdIssuer };
};
export const isSpvSignerConfigured = spvSignerConfigured;

export const SIDEBAR_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "tokenize", label: "Tokenize", href: "/tokenize", icon: "tokenize" },
  { key: "custodian", label: "Custodian", href: "/custodian", icon: "custodian" },
  { key: "proofs", label: "Proofs", href: "/proofs", icon: "proofs" },
  { key: "spv", label: "SPV", href: "/spv", icon: "spv" },
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
