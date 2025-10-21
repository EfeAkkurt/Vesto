export type SpvAssetCode = "XLM" | "SUSD";

export type SpvPayment = {
  hash: string;
  amount: number;
  asset: SpvAssetCode;
  createdAt: string;
  from?: string;
  to?: string;
  memo?: string | null;
};

export type SpvIncome = {
  incomeXlm: number;
  incomeSusd: number;
  opsCount: number;
  lastTxHash?: string | null;
  lastSeenCursor?: string | null;
  windowDays: 7 | 30;
  fetchedAt: string;
  payments: SpvPayment[];
};

export type SpvHolder = {
  account: string;
  balance: number;
};

export type SpvPayout = {
  account: string;
  asset: SpvAssetCode;
  amount: number;
  share: number;
};

export type SpvBalanceSummary = {
  accountId: string;
  xlm: number;
  susd: number;
  updatedAt: string;
};

export type SpvDistributionSummary = {
  totalPaid: number;
  payouts: SpvPayout[];
};

export type SpvDistributionResponse =
  | {
      ok: true;
      hash: string;
      opCount: number;
      totalPaid: number;
      payouts: SpvPayout[];
    }
  | {
      ok: false;
      reason?: string;
      error?: unknown;
    };

export type ReserveProofPayload = {
  schema: "vesto.reserve@1";
  week: number;
  reserveUSD: number;
  spvBalanceXLM: string;
  spvBalanceSUSD: string;
  asOf: string;
  lastTx: string;
  notes?: string;
};

export type ReservePublishResponse =
  | {
      ok: true;
      cid: string;
      hash: string;
      memoHashHex: string;
    }
  | {
      ok: false;
      reason?: string;
      error?: unknown;
    };
