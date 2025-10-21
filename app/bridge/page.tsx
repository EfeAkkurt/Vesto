"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/src/components/ui/Toast";
import { Button } from "@/components/ui/button";
import { Loader } from "@/src/components/ui/Loader";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { CopyHash } from "@/src/components/ui/CopyHash";
import {
  useBridgeLocks,
  useBridgeMints,
  useBridgeRedeems,
  useBridgeStats,
} from "@/src/hooks/useBridge";
import {
  refreshBridgeAll,
  refreshDashboardAll,
  refreshProofsAll,
} from "@/src/lib/swr/mutateBus";
import type { BridgeLock, BridgeMint, BridgeRedeem } from "@/src/lib/types/bridge";
import {
  formatDateTime,
  formatNumber,
  shortAddress,
  shortHash,
} from "@/src/lib/utils/format";
import {
  BRIDGE_PUBLIC_ACCOUNT,
  IPFS_GATEWAY,
  STELLAR_NET,
  SUSD_PUBLIC_CODE,
  SUSD_PUBLIC_ISSUER,
  isBridgeEnvConfigured,
  getBridgeEnvDiagnostics,
} from "@/src/utils/constants";
import { enableSusdTrustline } from "@/src/lib/bridge/changeTrust.client";

type TabKey = "locks" | "mints" | "redeems";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "locks", label: "Locks" },
  { key: "mints", label: "Mints" },
  { key: "redeems", label: "Redeems" },
];

const debugEnabled = process.env.NEXT_PUBLIC_DEBUG === "1";

const explorerBase =
  STELLAR_NET?.toLowerCase() === "mainnet"
    ? "https://stellar.expert/explorer/public/tx/"
    : "https://stellar.expert/explorer/testnet/tx/";

const toExplorerUrl = (hash: string) => `${explorerBase}${hash}`;
const toMetadataUrl = (cid: string) => `${IPFS_GATEWAY}/${cid}`;

const formatFee = (fee: number | undefined) => {
  if (!fee || !Number.isFinite(fee)) return "0.0000000";
  return fee.toFixed(7);
};

const defaultStats = {
  totalLockedXlm: "0.0000000",
  totalMintedSusd: "0.0000000",
  totalRedeemedSusd: "0.0000000",
  ops7d: 0,
  ops30d: 0,
};

const SectionCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <div className="rounded-2xl border border-border/40 bg-card/60 px-4 py-5">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
  </div>
);

const BadgeLabel = ({ tone, children }: { tone: "lock" | "mint" | "redeem"; children: string }) => {
  const palette =
    tone === "lock"
      ? "bg-sky-500/15 text-sky-300"
      : tone === "mint"
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-amber-500/15 text-amber-200";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${palette}`}>{children}</span>;
};

const StatusBadge = ({ status }: { status: "Verified" | "Recorded" | "Invalid" }) => {
  const palette =
    status === "Verified"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "Recorded"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-rose-500/15 text-rose-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${palette}`}>{status}</span>;
};

const DataRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    <span className="font-medium uppercase tracking-wide">{label}</span>
    <span className="font-mono text-foreground/90">{value}</span>
  </div>
);

const ActionLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    target="_blank"
    rel="noreferrer"
    className="text-xs font-semibold text-primary transition hover:text-primary/80"
  >
    {label}
  </Link>
);

type BridgeListItemProps = {
  variant: "lock" | "mint" | "redeem";
  status: "Verified" | "Recorded" | "Invalid";
  memoHashHex?: string;
  feeXlm?: number;
  sigs?: number;
  account?: string;
  createdAt?: string;
  amount?: string;
  assetLabel?: string;
  subtitle?: string;
  metadataCid: string;
  proofCid?: string;
  txHash: string;
  metadataError?: string;
};

const BridgeListItem = ({
  variant,
  status,
  memoHashHex,
  feeXlm,
  sigs,
  account,
  createdAt,
  amount,
  assetLabel,
  subtitle,
  metadataCid,
  proofCid,
  txHash,
  metadataError,
}: BridgeListItemProps) => (
  <li className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <BadgeLabel tone={variant}>{variant.toUpperCase()}</BadgeLabel>
        <StatusBadge status={status} />
        {amount ? (
          <span className="text-sm font-semibold text-foreground">
            {formatNumber(Number.parseFloat(amount), 2)} {assetLabel ?? ""}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <ActionLink href={toExplorerUrl(txHash)} label="Open in StellarExpert" />
        <ActionLink href={toMetadataUrl(metadataCid)} label="Open metadata" />
        {proofCid ? <ActionLink href={toMetadataUrl(proofCid)} label="Open proof" /> : null}
      </div>
    </div>
    {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    {metadataError && status !== "Verified" ? (
      <p className="text-xs text-rose-300">
        Metadata: {metadataError}
      </p>
    ) : null}
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {memoHashHex ? <DataRow label="Memo" value={shortHash(memoHashHex, 6, 6)} /> : null}
      <DataRow label="Fee" value={`${formatFee(feeXlm)} XLM`} />
      <DataRow
        label="Signed by"
        value={`${shortAddress(account ?? BRIDGE_PUBLIC_ACCOUNT)} • ${sigs ?? 0} sig`}
      />
      <DataRow label="Recorded" value={createdAt ? formatDateTime(createdAt) : "—"} />
    </div>
  </li>
);

const useSubmittingState = () => {
  const [isSubmitting, setSubmitting] = useState(false);
  const wrap = async (callback: () => Promise<void>) => {
    if (isSubmitting) return;
    setSubmitting(true);
    try {
      await callback();
    } finally {
      setSubmitting(false);
    }
  };
  return { isSubmitting, wrap };
};

const BridgePage = () => {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { toast } = useToast();
  const bridgeConfigured = isBridgeEnvConfigured;
  const missingBridgeEnv = bridgeConfigured ? [] : getBridgeEnvDiagnostics().missing;

  const [activeTab, setActiveTab] = useState<TabKey>("locks");

  const [lockAmount, setLockAmount] = useState("");
  const [lockAsset, setLockAsset] = useState<"XLM" | "SUSD">("XLM");
  const [lockRecipient, setLockRecipient] = useState("");

  const [mintAmount, setMintAmount] = useState("");
  const [mintTarget, setMintTarget] = useState("");
  const [mintProofCid, setMintProofCid] = useState("");
  const [trustlineMissing, setTrustlineMissing] = useState(false);
  const [trustlineChecking, setTrustlineChecking] = useState(false);
  const [trustlineEnabling, setTrustlineEnabling] = useState(false);

  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemRecipient, setRedeemRecipient] = useState("");

  useEffect(() => {
    setTrustlineMissing(false);
  }, [mintTarget]);

  const lockSubmit = useSubmittingState();
  const { wrap: wrapMintSubmit, isSubmitting: mintSubmitting } = useSubmittingState();
  const redeemSubmit = useSubmittingState();

  const {
    data: locks,
    isLoading: locksLoading,
    error: locksError,
  } = useBridgeLocks();
  const {
    data: mints,
    isLoading: mintsLoading,
    error: mintsError,
  } = useBridgeMints();
  const {
    data: redeems,
    isLoading: redeemsLoading,
    error: redeemsError,
  } = useBridgeRedeems();
  const { data: stats, isLoading: statsLoading } = useBridgeStats();

  const currentList = useMemo(() => {
    switch (activeTab) {
      case "mints":
        return mints ?? [];
      case "redeems":
        return redeems ?? [];
      case "locks":
      default:
        return locks ?? [];
    }
  }, [activeTab, locks, mints, redeems]);

  const statsData = stats ?? defaultStats;

  const checkSusdTrustline = useCallback(
    async (accountId: string) => {
      const target = accountId.trim();
      if (!target) return false;
      setTrustlineChecking(true);
      try {
        const response = await fetch("/api/bridge/trustline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: target }),
        });
        if (!response.ok) {
          throw new Error("Trustline check failed.");
        }
        const json = (await response.json()) as { hasTrustline?: boolean };
        const hasTrustline = Boolean(json.hasTrustline);
        if (debugEnabled) {
          console.debug("[bridge:trustline]", { accountId: target, hasTrustline });
        }
        setTrustlineMissing(!hasTrustline);
        return hasTrustline;
      } catch (error) {
        console.error("[bridge:trustline:check]", error);
        toast({
          title: "Trustline check failed",
          description: "Unable to verify SUSD trustline. Please retry.",
          variant: "error",
        });
        return false;
      } finally {
        setTrustlineChecking(false);
      }
    },
    [toast],
  );

  const handleLockSubmit = () =>
    lockSubmit.wrap(async () => {
      if (!bridgeConfigured) {
        toast({
          title: "Bridge not configured",
          description: "Set the NEXT_PUBLIC_* bridge environment variables to enable locking.",
          variant: "warning",
        });
        return;
      }
      if (!lockAmount || Number.isNaN(Number.parseFloat(lockAmount))) {
        toast({
          title: "Check amount",
          description: "Specify the amount to lock.",
          variant: "error",
        });
        return;
      }
      if (!lockRecipient.trim()) {
        toast({
          title: "Recipient required",
          description: "Provide the destination EVM address.",
          variant: "error",
        });
        return;
      }
      try {
        const response = await fetch("/api/bridge/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: lockAmount,
            asset: lockAsset,
            recipient: lockRecipient,
            chain: "EVM",
          }),
        });
        const json = (await response.json()) as
          | { hash: string; cid: string; memoHashHex: string }
          | { error: { code?: string; message?: string; hint?: string } };
        if (!response.ok || "error" in json) {
          const err = "error" in json ? json.error : undefined;
          toast({
            title: "Lock failed",
            description: err?.hint ?? err?.message ?? "Unable to submit lock transaction.",
            variant: "error",
          });
          return;
        }
        toast({
          title: "Lock submitted",
          description: `Tx ${shortHash(json.hash, 6, 6)} anchored.`,
          variant: "success",
        });
        setLockAmount("");
        setLockRecipient("");
        if (json.cid) {
          setMintProofCid(json.cid);
        }
        await refreshBridgeAll();
        await refreshProofsAll();
        await refreshDashboardAll();
      } catch (error) {
        console.error("[bridge:lock]", error);
        toast({
          title: "Lock failed",
          description: "Unexpected error while submitting lock.",
          variant: "error",
        });
      }
    });

  const handleMintSubmit = useCallback(() => {
    return wrapMintSubmit(async () => {
      if (!bridgeConfigured) {
        toast({
          title: "Bridge not configured",
          description: "Configure bridge environment variables before minting.",
          variant: "warning",
        });
        return;
      }
      if (!mintAmount || Number.isNaN(Number.parseFloat(mintAmount))) {
        toast({
          title: "Check amount",
          description: "Specify the amount to mint.",
          variant: "error",
        });
        return;
      }
      if (!mintTarget.trim()) {
        toast({
          title: "Target required",
          description: "Provide the Stellar account to receive SUSD.",
          variant: "error",
        });
        return;
      }
      if (!mintProofCid.trim()) {
        toast({
          title: "Proof CID required",
          description: "Enter the CID from the corresponding lock proof.",
          variant: "error",
        });
        return;
      }
      const trustlineOk = await checkSusdTrustline(mintTarget);
      if (!trustlineOk) {
        toast({
          title: "SUSD trustline required",
          description: "Enable the SUSD asset before minting.",
          variant: "warning",
        });
        return;
      }
      setTrustlineMissing(false);
      try {
        const response = await fetch("/api/bridge/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: mintAmount,
            targetAccount: mintTarget,
            evmLockProofCid: mintProofCid,
            lockProofCid: mintProofCid,
          }),
        });
        const json = (await response.json()) as
          | { hash: string; cid: string; memoHashHex: string }
          | { error: { code?: string; message?: string; hint?: string } };
        if (!response.ok || "error" in json) {
          const err = "error" in json ? json.error : undefined;
          const hint = err?.hint ?? "";
          const message = err?.message ?? "";
          const trustlineError =
            hint.includes("op_no_trust") || message.includes("op_no_trust") || hint.includes("trustline_missing");
          if (trustlineError) {
            setTrustlineMissing(true);
            toast({
              title: "Trustline missing",
              description: `Target account must enable trustline to SUSD (issuer ${SUSD_PUBLIC_ISSUER}). Click “Enable SUSD”.`,
              variant: "error",
            });
            return;
          }
          toast({
            title: "Mint failed",
            description: hint || message || "Unable to submit mint transaction.",
            variant: "error",
          });
          return;
        }
        toast({
          title: "Mint submitted",
          description: `Tx ${shortHash(json.hash, 6, 6)} recorded.`,
          variant: "success",
        });
        setTrustlineMissing(false);
        setMintAmount("");
        setMintTarget("");
        setMintProofCid("");
        await refreshBridgeAll();
        await refreshProofsAll();
        await refreshDashboardAll();
      } catch (error) {
        console.error("[bridge:mint]", error);
        toast({
          title: "Mint failed",
          description: "Unexpected error while submitting mint.",
          variant: "error",
        });
      }
    });
  }, [
    bridgeConfigured,
    checkSusdTrustline,
    mintAmount,
    mintProofCid,
    mintTarget,
    toast,
    wrapMintSubmit,
  ]);

  const handleEnableTrustline = useCallback(async () => {
    const target = mintTarget.trim();
    if (!target) {
      toast({
        title: "Target required",
        description: "Enter the Stellar account before enabling SUSD.",
        variant: "warning",
      });
      return;
    }
    if (trustlineEnabling) return;
    setTrustlineEnabling(true);
    try {
      await enableSusdTrustline({ accountId: target });
      toast({
        title: "Trustline enabled",
        description: "SUSD trustline created successfully.",
        variant: "success",
      });
      const verified = await checkSusdTrustline(target);
      if (verified) {
        setTrustlineMissing(false);
        // retry mint automatically with current form values
        setTimeout(() => {
          void handleMintSubmit();
        }, 0);
      }
    } catch (error) {
      console.error("[bridge:trustline:enable]", error);
      toast({
        title: "Enable failed",
        description: error instanceof Error ? error.message : "Unable to submit change trust transaction.",
        variant: "error",
      });
    } finally {
      setTrustlineEnabling(false);
    }
  }, [mintTarget, trustlineEnabling, checkSusdTrustline, toast, handleMintSubmit]);

  const handleRedeemSubmit = () =>
    redeemSubmit.wrap(async () => {
      if (!bridgeConfigured) {
        toast({
          title: "Bridge not configured",
          description: "Configure bridge environment variables before redeeming.",
          variant: "warning",
        });
        return;
      }
      if (!redeemAmount || Number.isNaN(Number.parseFloat(redeemAmount))) {
        toast({
          title: "Check amount",
          description: "Specify the amount to redeem.",
          variant: "error",
        });
        return;
      }
      if (!redeemRecipient.trim()) {
        toast({
          title: "Recipient required",
          description: "Provide the EVM recipient for redemption.",
          variant: "error",
        });
        return;
      }
      try {
        const response = await fetch("/api/bridge/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: redeemAmount,
            evmRecipient: redeemRecipient,
          }),
        });
        const json = (await response.json()) as
          | { hash: string; cid: string; memoHashHex: string }
          | { error: { code?: string; message?: string; hint?: string } };
        if (!response.ok || "error" in json) {
          const err = "error" in json ? json.error : undefined;
          toast({
            title: "Redeem failed",
            description: err?.hint ?? err?.message ?? "Unable to submit redeem transaction.",
            variant: "error",
          });
          return;
        }
        toast({
          title: "Redeem submitted",
          description: `Tx ${shortHash(json.hash, 6, 6)} recorded.`,
          variant: "success",
        });
        setRedeemAmount("");
        setRedeemRecipient("");
        await refreshBridgeAll();
        await refreshProofsAll();
        await refreshDashboardAll();
      } catch (error) {
        console.error("[bridge:redeem]", error);
        toast({
          title: "Redeem failed",
          description: "Unexpected error while submitting redeem request.",
          variant: "error",
        });
      }
    });

  const renderList = () => {
    if (locksError || mintsError || redeemsError) {
      return (
        <div className="rounded-2xl border border-border/40 bg-border/10 p-6 text-sm text-rose-300">
          Failed to load bridge history. Refresh the page to retry.
        </div>
      );
    }
    if (locksLoading || mintsLoading || redeemsLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      );
    }
    if (!currentList.length) {
      return (
        <div className="rounded-2xl border border-border/40 bg-border/10 p-6 text-sm text-muted-foreground">
          No {activeTab} recorded yet. Submit a {activeTab.slice(0, -1)} request to populate the timeline.
        </div>
      );
    }

    return (
      <ul className="space-y-3">
        {currentList.map((item) => {
          if (activeTab === "locks") {
            const record = item as BridgeLock;
            return (
              <BridgeListItem
                key={record.id}
                variant="lock"
                status={record.status}
                memoHashHex={record.memoHashHex}
                feeXlm={record.feeXlm}
                sigs={record.sigs}
                account={record.account}
                createdAt={record.createdAt}
                amount={record.amount}
                assetLabel={record.asset}
                subtitle={`Recipient · ${record.recipient}`}
                metadataCid={record.proofCid}
                proofCid={record.proofCid}
                txHash={record.id}
                metadataError={record.metadataError}
              />
            );
          }
          if (activeTab === "mints") {
            const record = item as BridgeMint;
            return (
              <BridgeListItem
                key={record.id}
                variant="mint"
                status={record.status}
                memoHashHex={record.memoHashHex}
                feeXlm={record.feeXlm}
                sigs={record.sigs}
                account={BRIDGE_PUBLIC_ACCOUNT}
                createdAt={record.createdAt}
                amount={record.amount}
                assetLabel="SUSD"
                subtitle={`Target · ${record.targetAccount}`}
                metadataCid={record.proofCid}
                proofCid={record.proofCid}
                txHash={record.id}
                metadataError={record.metadataError}
              />
            );
          }
          const record = item as BridgeRedeem;
          return (
            <BridgeListItem
              key={record.id}
              variant="redeem"
              status={record.status}
              memoHashHex={record.memoHashHex}
              feeXlm={record.feeXlm}
              sigs={record.sigs}
              account={BRIDGE_PUBLIC_ACCOUNT}
              createdAt={record.createdAt}
              amount={record.amount}
              assetLabel="SUSD"
              subtitle={`Recipient · ${record.recipient || "Pending metadata fetch"}`}
              metadataCid={record.proofCid}
              proofCid={record.proofCid}
              txHash={record.id}
              metadataError={record.metadataError}
            />
          );
        })}
      </ul>
    );
  };

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Bridge Control Center</h1>
          <p className="text-muted-foreground">
            Lock XLM or SUSD, mint synthetic SUSD, and redeem back to EVM with full on-chain auditability.
          </p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border/40 bg-card/60 px-4 py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Bridge Account</p>
            <div className="mt-2 text-sm text-foreground">
              {bridgeConfigured && BRIDGE_PUBLIC_ACCOUNT ? (
                <CopyHash value={BRIDGE_PUBLIC_ACCOUNT} />
              ) : (
                <span className="text-xs text-muted-foreground">Set NEXT_PUBLIC_BRIDGE_ACCOUNT</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Server-signed operations originate from this account.</p>
          </div>
          <SectionCard
            title="Locked (XLM)"
            value={`${statsData.totalLockedXlm}`}
            subtitle="Aggregate locks recorded on chain"
          />
          <SectionCard
            title="Minted (SUSD)"
            value={`${statsData.totalMintedSusd}`}
            subtitle={`Issuer · ${SUSD_PUBLIC_CODE}/${shortAddress(SUSD_PUBLIC_ISSUER)}`}
          />
          <SectionCard
            title="Ops (7d / 30d)"
            value={`${statsData.ops7d} / ${statsData.ops30d}`}
            subtitle="Recent bridge activity windows"
          />
        </section>

        {!bridgeConfigured ? (
          <section className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100" role="alert">
            <p className="font-semibold uppercase tracking-wide">Bridge configuration required</p>
            <p className="mt-1">
              Provide the following environment variables to enable bridge operations:
              {" "}
              <span className="font-mono">{missingBridgeEnv.join(", ") || "(none)"}</span>.
            </p>
            <p className="mt-1 text-xs text-amber-200">Pages remain accessible, but Lock/Mint/Redeem will stay disabled until configuration is complete.</p>
          </section>
        ) : null}

        <section className="mb-10 grid gap-6 lg:grid-cols-3">
          <form
            className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/60 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLockSubmit();
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Lock assets (Stellar → EVM)</h2>
              <p className="text-xs text-muted-foreground">Anchor a lock intent and publish metadata to IPFS.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Asset</label>
              <select
                value={lockAsset}
                onChange={(event) => setLockAsset(event.target.value as "XLM" | "SUSD")}
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="XLM">XLM</option>
                <option value="SUSD">SUSD</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.0000001"
                min="0"
                value={lockAmount}
                onChange={(event) => setLockAmount(event.target.value)}
                placeholder="0.0"
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">EVM recipient</label>
              <input
                type="text"
                value={lockRecipient}
                onChange={(event) => setLockRecipient(event.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <Button type="submit" disabled={lockSubmit.isSubmitting || !bridgeConfigured}>
              {lockSubmit.isSubmitting ? <Loader /> : "Lock"}
            </Button>
          </form>

          <form
            className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/60 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleMintSubmit();
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Mint SUSD (EVM → Stellar)</h2>
              <p className="text-xs text-muted-foreground">Link an EVM proof CID and mint synthetic SUSD on Stellar.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.0000001"
                min="0"
                value={mintAmount}
                onChange={(event) => setMintAmount(event.target.value)}
                placeholder="0.0"
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Target account (GA…)</label>
              <input
                type="text"
                value={mintTarget}
                onChange={(event) => setMintTarget(event.target.value)}
                placeholder="GA..."
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Lock proof CID</label>
              <input
                type="text"
                value={mintProofCid}
                onChange={(event) => setMintProofCid(event.target.value)}
                placeholder="bafy..."
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            {trustlineMissing ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-amber-100">SUSD trustline required</p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={trustlineEnabling || trustlineChecking}
                    onClick={() => {
                      void handleEnableTrustline();
                    }}
                  >
                    {trustlineEnabling ? <Loader /> : "Enable SUSD"}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-amber-200">
                  Add the SUSD asset (issuer {SUSD_PUBLIC_ISSUER}) to the target account before minting.
                </p>
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={mintSubmitting || !bridgeConfigured || trustlineEnabling || trustlineChecking}
            >
              {mintSubmitting ? <Loader /> : "Mint"}
            </Button>
          </form>

          <form
            className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/60 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleRedeemSubmit();
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Redeem SUSD (Stellar → EVM)</h2>
              <p className="text-xs text-muted-foreground">
                Record a redeem intent and publish the metadata CID for downstream release.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.0000001"
                min="0"
                value={redeemAmount}
                onChange={(event) => setRedeemAmount(event.target.value)}
                placeholder="0.0"
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">EVM recipient</label>
              <input
                type="text"
                value={redeemRecipient}
                onChange={(event) => setRedeemRecipient(event.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <Button type="submit" disabled={redeemSubmit.isSubmitting || !bridgeConfigured}>
              {redeemSubmit.isSubmitting ? <Loader /> : "Redeem"}
            </Button>
          </form>
        </section>

        <section className="mb-12 rounded-2xl border border-border/40 bg-card/60 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Bridge activity</h2>
              <p className="text-xs text-muted-foreground">
                Every request is recorded on Stellar with a memo hash tied to its IPFS metadata.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-border/40 text-muted-foreground hover:bg-border/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {renderList()}
        </section>

        {debugEnabled ? (
          <section className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-xs text-muted-foreground">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">Debug snapshot</h3>
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-1 text-xs"
                onClick={() => {
                  console.group("[bridge:debug]");
                  console.table({
                    locks: locks?.length ?? 0,
                    mints: mints?.length ?? 0,
                    redeems: redeems?.length ?? 0,
                    locked: statsData.totalLockedXlm,
                    minted: statsData.totalMintedSusd,
                    redeemed: statsData.totalRedeemedSusd,
                  });
                  console.groupEnd();
                  toast({
                    title: "Debug data logged",
                    description: "Inspect the console for bridge snapshot details.",
                    variant: "info",
                  });
                }}
              >
                Log snapshot
              </Button>
            </div>
            <p>
              Locks: {locks?.length ?? 0} · Mints: {mints?.length ?? 0} · Redeems: {redeems?.length ?? 0} · Stats fetched:{" "}
              {statsLoading ? "pending" : "ready"}
            </p>
          </section>
        ) : null}
      </div>
    </LayoutShell>
  );
};

export default BridgePage;
