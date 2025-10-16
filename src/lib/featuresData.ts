export type FeatureItem = {
  id: string;
  title: string;
  desc: string;
  icon: string;
};

export const features: FeatureItem[] = [
  {
    id: "rwa",
    title: "RWA Tokenization",
    desc: "Tokenize invoices, subscriptions, and revenue streams with on-chain controls.",
    icon: "Layers",
  },
  {
    id: "custody",
    title: "Custodian Attestation",
    desc: "Weekly proofs with signed attestations and IPFS-backed evidence.",
    icon: "ShieldCheck",
  },
  {
    id: "wallets",
    title: "Wallet & Roles",
    desc: "Role-based permissions and multi-sig ready operations.",
    icon: "Users",
  },
  {
    id: "transparency",
    title: "Transparency UI",
    desc: "Live reserve, audits, and verifiable links in one dashboard.",
    icon: "Eye",
  },
  {
    id: "bridge",
    title: "Bridge & Stablecoin",
    desc: "Cross-chain transfers with stablecoin rails and fee transparency.",
    icon: "Shuffle",
  },
  {
    id: "proofs",
    title: "Proofs & Audits",
    desc: "IPFS documents, hashes, and verifiers with download and view.",
    icon: "FileCheck2",
  },
  {
    id: "spv",
    title: "SPV & Distribution",
    desc: "Structured payouts to holders with audit trail and metrics.",
    icon: "Share2",
  },
];
