"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/src/components/ui/Toast";
import { KpiCard } from "@/src/components/cards/KpiCard";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { useSpvBalance, useSpvHolders, useSpvIncome } from "@/src/hooks/useSpv";
import { useAccountOperations } from "@/src/hooks/horizon";
import { useReserveProofs } from "@/src/hooks/useReserveProofs";
import {
  refreshDashboardAll,
  refreshProofsAll,
  refreshSpvAll,
} from "@/src/lib/swr/mutateBus";
import { buildReserveJson } from "@/src/lib/spv/reserve";
import type {
  ReserveProofPayload,
  SpvDistributionResponse as SpvDistributionResponseType,
  ReservePublishResponse,
  SpvHolder,
  SpvPayout,
} from "@/src/lib/types/spv";
import {
  CUSTODIAN_ACCOUNT,
  getSpvAccount,
  getSusdAssetOrNull,
  isSpvSignerConfigured,
} from "@/src/utils/constants";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatXlm,
  shortAddress,
  shortHash,
} from "@/src/lib/utils/format";

const spvAccountId = getSpvAccount();
const susdAsset = getSusdAssetOrNull();
const debugEnabled = process.env.NEXT_PUBLIC_DEBUG === "1";

type DistributionReceipt = {
  asset: "XLM" | "SUSD";
  hash: string;
  totalPaid: number;
  opCount: number;
  payouts: SpvPayout[];
  recordedAt: string;
};

type ReserveReceipt = {
  cid: string;
  hash: string;
  memoHashHex: string;
  recordedAt: string;
};

const describeDistributionReason = (reason?: string) => {
  switch (reason) {
    case "missing-spv-secret":
      return "Server signer is not configured (SPV_SECRET missing).";
    case "missing-spv-account":
      return "SPV account is not configured on the server.";
    case "missing-susd-asset":
      return "SUSD asset configuration is missing on the server.";
    case "no-income":
      return "There is no income available for the selected window.";
    case "no-holders":
      return "No holders are configured for this SPV.";
    default:
      return "Distribution failed on the server.";
  }
};

const describeReserveReason = (reason?: string) => {
  switch (reason) {
    case "missing-spv-secret":
      return "Server signer is not configured (SPV_SECRET missing).";
    case "missing-spv-account":
      return "SPV account is not configured on the server.";
    case "invalid-payload":
      return "Reserve payload is malformed.";
    case "missing-payload":
      return "Reserve payload was not provided.";
    default:
      return "Reserve publishing failed on the server.";
  }
};


const computeShare = (holder: SpvHolder, holders: SpvHolder[]): number => {
  const total = holders.reduce((sum, item) => sum + Math.max(0, item.balance), 0);
  if (total <= 0) return 0;
  return holder.balance / total;
};

const ensureHolders = (holders: SpvHolder[] | undefined): SpvHolder[] => holders?.filter((h) => h.balance > 0) ?? [];

const toExplorerUrl = (hash: string) => {
  const base =
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "").trim().toLowerCase() === "mainnet"
      ? "https://stellar.expert/explorer/public/tx/"
      : "https://stellar.expert/explorer/testnet/tx/";
  return `${base}${hash}`;
};

const formatRelativeLabel = (iso?: string) => {
  if (!iso) return "recently";
  return formatDateTime(iso);
};

const actionHeaders = "flex items-center justify-between rounded-2xl border border-border/40 bg-card/50 px-4 py-3";

const HolderTable = ({
  holders,
}: {
  holders: SpvHolder[];
}) => {
  if (!holders.length) {
    return (
      <div className="rounded-2xl border border-border/40 bg-border/10 p-6 text-sm text-muted-foreground">
        No holders detected. Configure holder balances to enable distributions.
      </div>
    );
  }

  const total = holders.reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/60">
      <table className="min-w-full divide-y divide-border/40 text-sm">
        <thead className="bg-border/10 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Account</th>
            <th className="px-4 py-3 text-right font-semibold">Balance</th>
            <th className="px-4 py-3 text-right font-semibold">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {holders.map((holder) => {
            const share = computeShare(holder, holders);
            return (
              <tr key={holder.account} className="text-foreground/90">
                <td className="px-4 py-3 font-mono text-xs">{shortAddress(holder.account)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(holder.balance, 2)}</td>
                <td className="px-4 py-3 text-right text-primary">{formatPercent(share * 100, 2)}</td>
              </tr>
            );
          })}
          <tr className="bg-border/5 text-foreground/80">
            <td className="px-4 py-3 font-semibold">Total</td>
            <td className="px-4 py-3 text-right font-semibold">{formatNumber(total, 2)}</td>
            <td className="px-4 py-3 text-right font-semibold">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const IncomeSummary = ({
  income,
}: {
  income: ReturnType<typeof useSpvIncome>["data"];
}) => {
  if (!income) {
    return <Skeleton className="h-32 w-full" />;
  }
  const hasSusd = income.incomeSusd > 0 && Boolean(susdAsset);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">XLM income</p>
        <p className="mt-2 text-2xl font-semibold text-primary">
          {income.incomeXlm > 0 ? formatXlm(income.incomeXlm) : "0 XLM"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Window · {income.windowDays} days</p>
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {hasSusd ? `${susdAsset!.code} income` : "USD projection"}
        </p>
        <p className="mt-2 text-2xl font-semibold text-primary">
          {hasSusd ? formatCurrency(income.incomeSusd) : formatCurrency(income.incomeXlm)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ops counted · {income.opsCount} · Last tx {income.lastTxHash ? formatDateTime(income.fetchedAt) : "—"}
        </p>
      </div>
    </div>
  );
};

const useDistributionEligibility = (walletAccount?: string | null) => {
  const trimmed = walletAccount?.trim() ?? "";
  if (!trimmed) return isSpvSignerConfigured;
  if (trimmed === spvAccountId) return true;
  if (trimmed === CUSTODIAN_ACCOUNT.trim()) return true;
  return isSpvSignerConfigured;
};

const SpvPage = () => {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { toast } = useToast();
  const router = useRouter();

  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const balanceState = useSpvBalance();
  const incomeState = useSpvIncome(windowDays);
  const holdersState = useSpvHolders();

  const operationsResponse = useAccountOperations(spvAccountId, 120);
  const reserveState = useReserveProofs(operationsResponse.data);

  const [distributionBusy, setDistributionBusy] = useState<"XLM" | "SUSD" | null>(null);
  const [reserveBusy, setReserveBusy] = useState(false);
  const [reserveNotes, setReserveNotes] = useState("");
  const [reservePreview, setReservePreview] = useState<ReserveProofPayload | null>(null);
  const [lastDistribution, setLastDistribution] = useState<DistributionReceipt | null>(null);
  const [lastReserve, setLastReserve] = useState<ReserveReceipt | null>(null);

  const holders = ensureHolders(holdersState.data);
  const eligible = useDistributionEligibility(wallet.accountId);

  const latestReserve = useMemo(() => reserveState.data?.[0], [reserveState.data]);

  const generateReservePreview = () => {
    if (!balanceState.data) {
      toast({
        title: "Balance unavailable",
        description: "Fetch SPV balances before generating the reserve payload.",
        variant: "error",
      });
      return;
    }
    const payload = buildReserveJson({
      balance: balanceState.data,
      lastTx: incomeState.data?.lastTxHash ?? latestReserve?.txHash ?? "",
      notes: reserveNotes || undefined,
    });
    setReservePreview(payload);
    toast({
      title: "Reserve payload drafted",
      description: "Review the JSON below, then publish to IPFS + Stellar.",
    });
  };

  const handleDistribution = async (asset: "XLM" | "SUSD") => {
    const income = incomeState.data;
    if (!income) {
      toast({ title: "Income unavailable", description: "Income snapshot still loading.", variant: "error" });
      return;
    }
    if (!holders.length) {
      toast({
        title: "No holders configured",
        description: "At least one holder is required to build the distribution transaction.",
        variant: "error",
      });
      return;
    }
    setDistributionBusy(asset);
    try {
      const response = await fetch("/api/spv/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          memo: `SPV ${asset} distribution ${formatDate(new Date().toISOString())}`,
          windowDays,
        }),
      });
      const payload = (await response.json().catch(() => null)) as SpvDistributionResponseType | null;
      if (!response.ok || !payload) {
        throw new Error(`Distribution failed (${response.status}).`);
      }
      if (!payload.ok) {
        const detail = describeDistributionReason(payload.reason);
        const extra = payload.error ? ` (${String(payload.error)})` : "";
        throw new Error(`${detail}${extra}`);
      }
      const receipt: DistributionReceipt = {
        asset,
        hash: payload.hash,
        totalPaid: payload.totalPaid,
        opCount: payload.opCount,
        payouts: payload.payouts,
        recordedAt: new Date().toISOString(),
      };
      setLastDistribution(receipt);
      const totalLabel = asset === "XLM" ? formatXlm(receipt.totalPaid) : formatCurrency(receipt.totalPaid);
      toast({
        title: `${asset} distribution broadcast`,
        description: `Paid ${totalLabel} to ${receipt.opCount} holders — ${shortHash(receipt.hash, 6, 6)} on-chain.`,
      });
      await Promise.all([refreshDashboardAll(), refreshProofsAll(), refreshSpvAll()]);
    } catch (error) {
      toast({
        title: "Distribution failed",
        description: error instanceof Error ? error.message : "Unexpected error while distributing.",
        variant: "error",
      });
    } finally {
      setDistributionBusy(null);
    }
  };

  const publishReserve = async () => {
    if (!reservePreview) {
      toast({
        title: "No payload drafted",
        description: "Generate the reserve payload before publishing.",
        variant: "error",
      });
      return;
    }
    setReserveBusy(true);
    try {
      const response = await fetch("/api/spv/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: reservePreview }),
      });
      const payload = (await response.json().catch(() => null)) as ReservePublishResponse | null;
      if (!response.ok || !payload) {
        throw new Error(`Reserve publish failed (${response.status}).`);
      }
      if (!payload.ok) {
        const detail = describeReserveReason(payload.reason);
        const extra = payload.error ? ` (${String(payload.error)})` : "";
        throw new Error(`${detail}${extra}`);
      }
      const receipt: ReserveReceipt = {
        cid: payload.cid,
        hash: payload.hash,
        memoHashHex: payload.memoHashHex,
        recordedAt: new Date().toISOString(),
      };
      setLastReserve(receipt);
      toast({
        title: "Reserve proof published",
        description: `CID ${shortHash(receipt.cid, 6, 6)} anchored · tx ${shortHash(receipt.hash, 6, 6)}.`,
      });
      setReservePreview(null);
      setReserveNotes("");
      await Promise.all([refreshProofsAll(), refreshDashboardAll(), refreshSpvAll()]);
    } catch (error) {
      toast({
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Unexpected error while publishing reserve proof.",
        variant: "error",
      });
    } finally {
      setReserveBusy(false);
    }
  };

  const balanceCards = useMemo(() => {
    if (balanceState.isLoading || !balanceState.data) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      );
    }

    const data = balanceState.data;

    const cards: Array<{
      key: string;
      title: string;
      value: number;
      suffix?: "USD" | "%";
      precision?: number;
      description: string;
    }> = [
      {
        key: "xlm",
        title: "SPV Balance · XLM",
        value: data.xlm,
        precision: 4,
        description: `Ledger updated ${formatRelativeLabel(data.updatedAt)}`,
      },
      {
        key: "reserve-usd",
        title: susdAsset ? `SPV Balance · ${susdAsset.code}` : "Projected Reserve USD",
        value: susdAsset ? data.susd : data.xlm,
        suffix: "USD",
        description: susdAsset ? `Issuer ${shortAddress(susdAsset.issuer)}` : "Using native balance as proxy",
      },
    ];

    if (latestReserve?.metadata?.reserveUSD != null) {
      cards.push({
        key: "reserve",
        title: "Last Reserve USD",
        value: latestReserve.metadata.reserveUSD,
        suffix: "USD",
        description: latestReserve.metadata.asOf
          ? `As of ${formatDateTime(latestReserve.metadata.asOf)}`
          : "Awaiting timestamp",
      });
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item) => (
          <KpiCard
            key={item.key}
            title={item.title}
            description={item.description}
            value={item.value}
            suffix={item.suffix}
            precision={item.precision}
            delta={0}
            trend="flat"
            isLoading={false}
            updatedAt={data.updatedAt}
          />
        ))}
      </div>
    );
  }, [balanceState, latestReserve]);

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Special Purpose Vehicle</h1>
            <p className="text-sm text-muted-foreground">
              Monitor reserve inflows, distribute weekly revenue, and notarize proofs on-chain.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refreshSpvAll()}>
              Refresh data
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/proofs")}>
              View proofs
            </Button>
          </div>
        </header>

        {balanceCards}

        <section className="space-y-4">
          <div className={actionHeaders}>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Income window</h2>
              <p className="text-xs text-muted-foreground">
                Select the time horizon used for the distribution split.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-border/50 bg-border/10 p-1">
              {[7, 30].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    windowDays === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => setWindowDays(value as 7 | 30)}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>
          <IncomeSummary income={incomeState.data} />
        </section>

        <section className="space-y-4">
          <div className={actionHeaders}>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Holders</h2>
              <p className="text-xs text-muted-foreground">
                Distribution weight is proportional to holder balance.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Total holders: {holders.length}
            </span>
          </div>
          {holdersState.isLoading ? <Skeleton className="h-32 w-full rounded-2xl" /> : <HolderTable holders={holders} />}
        </section>

        <section className="space-y-4">
          <div className={actionHeaders}>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Distribute income</h2>
              <p className="text-xs text-muted-foreground">
                Builds a multi-payment transaction from the SPV account to each holder.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!eligible || distributionBusy === "SUSD" || distributionBusy === "XLM"}
                onClick={() => handleDistribution("XLM")}
              >
                {distributionBusy === "XLM" ? "Distributing…" : "Distribute XLM"}
              </Button>
              {susdAsset ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!eligible || distributionBusy === "XLM" || distributionBusy === "SUSD"}
                  onClick={() => handleDistribution("SUSD")}
                >
                  {distributionBusy === "SUSD" ? "Distributing…" : `Distribute ${susdAsset.code}`}
                </Button>
              ) : null}
            </div>
          </div>
          {!eligible ? (
            <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              Connect the SPV or Custodian Freighter account to authorize distributions, or configure SPV_SIGNER_SECRET
              on the server for automated signing.
            </p>
          ) : null}
          {lastDistribution ? (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-xs">
              <p className="font-semibold text-primary">Last distribution · {formatDateTime(lastDistribution.recordedAt)}</p>
              <p className="mt-1 text-foreground/80">
                Paid {lastDistribution.asset === "XLM" ? formatXlm(lastDistribution.totalPaid) : formatCurrency(lastDistribution.totalPaid)} to {lastDistribution.opCount} holders.
              </p>
              <div className="mt-2 flex items-center gap-2 text-foreground/80">
                <CopyHash value={lastDistribution.hash} />
                <Link href={toExplorerUrl(lastDistribution.hash)} className="text-primary underline" target="_blank">
                  Explorer
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className={actionHeaders}>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Weekly reserve proof</h2>
              <p className="text-xs text-muted-foreground">
                Upload reserve metadata to Lighthouse and anchor the CID on Stellar via manage_data.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={generateReservePreview}>
                Generate JSON
              </Button>
              <Button size="sm" disabled={reserveBusy || !reservePreview} onClick={publishReserve}>
                {reserveBusy ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
          <textarea
            value={reserveNotes}
            onChange={(event) => setReserveNotes(event.target.value)}
            placeholder="Optional notes for this reserve snapshot"
            className="w-full rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-sm text-foreground/90 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={3}
          />
          {reservePreview ? (
            <pre className="overflow-auto rounded-2xl border border-border/60 bg-card/70 p-4 text-xs text-foreground/90">
              {JSON.stringify(reservePreview, null, 2)}
            </pre>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-border/10 p-6 text-sm text-muted-foreground">
              Draft the payload to review the JSON before publishing.
            </div>
          )}
          {lastReserve ? (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-xs">
              <p className="font-semibold text-primary">Latest publish · {formatDateTime(lastReserve.recordedAt)}</p>
              <div className="mt-2 flex items-center gap-2 text-foreground/80">
                <span className="text-muted-foreground">CID</span>
                <CopyHash value={lastReserve.cid} />
                <Link
                  href={`${process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.lighthouse.storage/ipfs"}/${lastReserve.cid}`}
                  target="_blank"
                  className="text-primary underline"
                >
                  Gateway
                </Link>
              </div>
              <div className="mt-1 flex items-center gap-2 text-foreground/80">
                <span className="text-muted-foreground">Tx</span>
                <CopyHash value={lastReserve.hash} />
                <Link href={toExplorerUrl(lastReserve.hash)} target="_blank" className="text-primary underline">
                  Explorer
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        {debugEnabled ? (
          <section className="rounded-2xl border border-border/40 bg-border/10 p-6 text-xs text-foreground/80">
            <h3 className="text-sm font-semibold text-foreground">Debug</h3>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Income snapshot</dt>
                <dd>
                  {JSON.stringify(
                    {
                      window: incomeState.data?.windowDays,
                      incomeXlm: incomeState.data?.incomeXlm,
                      incomeSusd: incomeState.data?.incomeSusd,
                      ops: incomeState.data?.opsCount,
                      fetchedAt: incomeState.data?.fetchedAt,
                    },
                    null,
                    2,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Latest reserve</dt>
                <dd>
                  {JSON.stringify(
                    {
                      cid: latestReserve?.cid,
                      status: latestReserve?.status,
                      memoHash: latestReserve?.memoHashHex,
                      asOf: latestReserve?.metadata?.asOf,
                    },
                    null,
                    2,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>
    </LayoutShell>
  );
};

export default SpvPage;
