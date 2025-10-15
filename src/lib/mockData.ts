export type Kpi = {
  portfolioUSD: number;
  minted: number;
  coverage: number;
  holders: number;
  updatedAt: string;
};

export type NumericKpiKey = Exclude<keyof Kpi, "updatedAt">;

export type KpiMetric = {
  key: NumericKpiKey;
  label: string;
  description: string;
  suffix?: string;
  precision?: number;
  delta: number;
  trend: "up" | "down" | "flat";
};

export type Holding = {
  asset: string;
  type: "RWA" | "SUSD";
  category: "Invoice" | "Rent" | "Subscription" | "Stablecoin";
  amount: number;
  usd: number;
  changePct: number;
};

export type AttestationStatus = "ok" | "pending" | "late";

export type Attestation = {
  week: number;
  ipfs: string;
  signedBy: string;
  status: AttestationStatus;
  ts: string;
};

export type TxType = "MINT" | "BURN" | "DIST" | "ATTEST";
export type TxStatus = "success" | "pending" | "failed";

export type Transaction = {
  ts: string;
  type: TxType;
  asset: string;
  amount: number;
  hash: string;
  status: TxStatus;
};

export type ReservePoint = {
  date: string;
  reserveUSD: number;
  payoutProjected: number;
};

export type PayoutHistory = {
  date: string;
  amount: number;
  asset: string;
  ipfs: string;
};

export type PayoutSchedule = {
  nextPayoutDate: string;
  nextAmount: number;
  asset: string;
  windowDays: number;
  note: string;
  history: PayoutHistory[];
};

export type StellarNetwork = "TestNet" | "Mainnet";

export type NetworkHealth = {
  network: StellarNetwork;
  horizonHealthy: boolean;
  latencyMs: number;
  lastHorizonCheck: string;
};

export type WalletState = {
  status: "disconnected" | "connecting" | "wrong-network" | "connected";
  address?: string;
  network?: StellarNetwork;
  balanceUSD?: number;
  balanceNative?: number;
  permissions?: string[];
  lastSignIn?: string;
  preferredNetwork: StellarNetwork;
};

export const kpi: Kpi = {
  portfolioUSD: 52600,
  minted: 17,
  coverage: 96,
  holders: 21,
  updatedAt: "2024-10-19T09:12:00.000Z",
};

export const kpiMetrics: KpiMetric[] = [
  {
    key: "portfolioUSD",
    label: "Portfolio Value",
    description: "Total RWA + stablecoin holdings",
    suffix: "USD",
    delta: 5.2,
    trend: "up",
  },
  {
    key: "minted",
    label: "Minted Tokens",
    description: "Outstanding RWA supply",
    delta: 1.1,
    trend: "up",
  },
  {
    key: "coverage",
    label: "Reserve Coverage",
    description: "Reserve vs outstanding liabilities",
    suffix: "%",
    precision: 0,
    delta: -0.6,
    trend: "down",
  },
  {
    key: "holders",
    label: "Active Holders",
    description: "Distinct addresses holding Vesto RWAs",
    delta: 2.0,
    trend: "up",
  },
];

export const holdings: Holding[] = [
  {
    asset: "Invoice Pool A",
    type: "RWA",
    category: "Invoice",
    amount: 125,
    usd: 18250,
    changePct: 3.4,
  },
  {
    asset: "Rental Stream B",
    type: "RWA",
    category: "Rent",
    amount: 86,
    usd: 14980,
    changePct: 1.2,
  },
  {
    asset: "Subscription SPV C",
    type: "RWA",
    category: "Subscription",
    amount: 58,
    usd: 11240,
    changePct: -0.8,
  },
  {
    asset: "USDC Treasury",
    type: "SUSD",
    category: "Stablecoin",
    amount: 21000,
    usd: 21000,
    changePct: 0.3,
  },
];

export const attestations: Attestation[] = [
  {
    week: 41,
    signedBy: "Prime Custodian",
    ipfs: "QmQ1Wv...f2k",
    status: "ok",
    ts: "2024-10-13T18:40:00.000Z",
  },
  {
    week: 40,
    signedBy: "Prime Custodian",
    ipfs: "QmXe8c...9sm",
    status: "ok",
    ts: "2024-10-06T19:02:00.000Z",
  },
  {
    week: 39,
    signedBy: "Prime Custodian",
    ipfs: "QmPk31...4aa",
    status: "pending",
    ts: "2024-09-29T17:28:00.000Z",
  },
  {
    week: 38,
    signedBy: "Prime Custodian",
    ipfs: "QmTzb9...2lm",
    status: "late",
    ts: "2024-09-22T18:11:00.000Z",
  },
];

export const transactions: Transaction[] = [
  {
    ts: "2024-10-19T09:11:00.000Z",
    type: "MINT",
    asset: "Invoice Pool A",
    amount: 2500,
    hash: "2c11d8a...f90",
    status: "success",
  },
  {
    ts: "2024-10-18T21:37:00.000Z",
    type: "DIST",
    asset: "USDC",
    amount: 860,
    hash: "ab7dd21...5ea",
    status: "pending",
  },
  {
    ts: "2024-10-17T14:05:00.000Z",
    type: "ATTEST",
    asset: "Reserve Proof",
    amount: 0,
    hash: "4f9bb13...4ac",
    status: "success",
  },
  {
    ts: "2024-10-16T11:54:00.000Z",
    type: "MINT",
    asset: "Subscription SPV C",
    amount: 1400,
    hash: "7d31367...fa1",
    status: "success",
  },
  {
    ts: "2024-10-15T08:20:00.000Z",
    type: "BURN",
    asset: "Invoice Pool A",
    amount: 500,
    hash: "e113bb4...1d9",
    status: "failed",
  },
];

export const reservePoints: ReservePoint[] = [
  { date: "2024-08-12", reserveUSD: 38200, payoutProjected: 540 },
  { date: "2024-08-26", reserveUSD: 40100, payoutProjected: 590 },
  { date: "2024-09-09", reserveUSD: 42780, payoutProjected: 620 },
  { date: "2024-09-23", reserveUSD: 45120, payoutProjected: 680 },
  { date: "2024-10-07", reserveUSD: 48700, payoutProjected: 710 },
  { date: "2024-10-14", reserveUSD: 50200, payoutProjected: 740 },
  { date: "2024-10-21", reserveUSD: 52500, payoutProjected: 800 },
  { date: "2024-10-28", reserveUSD: 54100, payoutProjected: 860 },
];

export const payoutSchedule: PayoutSchedule = {
  nextPayoutDate: "2024-10-21",
  nextAmount: 120,
  asset: "USDC",
  windowDays: 2,
  note: "Custodian review required before triggering manual distribution.",
  history: [
    {
      date: "2024-10-07",
      amount: 115,
      asset: "USDC",
      ipfs: "QmDist1",
    },
    {
      date: "2024-09-23",
      amount: 110,
      asset: "USDC",
      ipfs: "QmDist2",
    },
    {
      date: "2024-09-09",
      amount: 107,
      asset: "USDC",
      ipfs: "QmDist3",
    },
  ],
};

export const networkHealth: NetworkHealth = {
  network: "TestNet",
  horizonHealthy: true,
  latencyMs: 184,
  lastHorizonCheck: "2024-10-19T09:05:00.000Z",
};

export const walletState: WalletState = {
  status: "connected",
  address: "GBZXN7PIRZGNMHGAABCD5EXAMPLEVESTO",
  network: "TestNet",
  preferredNetwork: "TestNet",
  balanceUSD: 21340,
  balanceNative: 980,
  permissions: ["signTransaction", "signMessage"],
  lastSignIn: "2024-10-18T19:24:00.000Z",
};

export const walletStateMainnet: WalletState = {
  status: "connected",
  address: "GBMAINNETMOCKADDRESS123456789ABCDEFG",
  network: "Mainnet",
  preferredNetwork: "Mainnet",
  balanceUSD: 58760,
  balanceNative: 1420,
  permissions: ["signTransaction", "signMessage"],
  lastSignIn: "2024-10-18T19:24:00.000Z",
};
