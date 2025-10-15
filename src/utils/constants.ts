export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: "dashboard" | "tokenize" | "custodian" | "proofs" | "bridge";
};

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
