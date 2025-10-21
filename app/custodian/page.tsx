"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { CustodianInfo } from "@/src/components/custodian/CustodianInfo";
import { UploadAttestation } from "@/src/components/custodian/UploadAttestation";
import { AttestationTimeline } from "@/src/components/custodian/AttestationTimeline";
import { AttestationDrawer } from "@/src/components/custodian/AttestationDrawer";
import { SubmissionModal } from "@/src/components/custodian/SubmissionModal";
import type { Attestation } from "@/src/lib/types/proofs";
import type { AttestationMetadata } from "@/src/lib/custodian/schema";
import { formatUSD, formatDateTime, formatXlm } from "@/src/lib/utils/format";
import { useAccountOperations, useAccountEffects } from "@/src/hooks/horizon";
import { useAttestations } from "@/src/hooks/useAttestations";
import { useTokenizationRequests } from "@/src/hooks/useTokenizationRequests";
import type { TokenizationRequest } from "@/src/lib/custodian/requests";
import { CUSTODIAN_ACCOUNT, HORIZON, STELLAR_NET } from "@/src/utils/constants";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { StellarExpertWidgetDialog } from "@/src/components/stellar/StellarExpertWidgetDialog";
import { resolveExpertNetwork } from "@/src/lib/stellar/expert";
import { getViaGateway } from "@/src/lib/ipfs/client";

type RequestStatus = "pending" | "approved" | "rejected";

type EnrichedRequest = TokenizationRequest & {
  status: RequestStatus;
  attestation?: Attestation;
};

const REQUEST_STATUS_BADGE: Record<RequestStatus, string> = {
  pending: "bg-amber-400/15 text-amber-200",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-rose-400/15 text-rose-300",
};

const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Attested",
  rejected: "Invalid",
};

const assetTypeOptions = ["All", "Invoice", "Subscription", "Rent", "Carbon Credit", "Unknown"] as const;

type AssetTypeFilter = (typeof assetTypeOptions)[number];

const MEMO_BADGES: Record<"cid" | "hash", { label: string; className: string }> = {
  cid: { label: "CID", className: "bg-lime-400/20 text-lime-200" },
  hash: { label: "HASH-ONLY", className: "bg-amber-400/20 text-amber-200" },
};

const statusFilterOptions: Array<RequestStatus | "all"> = ["pending", "approved", "rejected", "all"];

const EMPTY_REQUESTS_HELPER = "No tokenization requests match the current filters.";

const maskAccountId = (value?: string) => {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
};

const CustodianPage = () => {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const prefersReducedMotion = useReducedMotion();

  const custodianAccount = wallet.accountId ?? CUSTODIAN_ACCOUNT;

  const operationsResponse = useAccountOperations(custodianAccount, 120);
  const effectsResponse = useAccountEffects(custodianAccount, 60);
const attestationState = useAttestations(custodianAccount, operationsResponse.data, effectsResponse.data);
const rawAttestations = useMemo(() => attestationState.data ?? [], [attestationState.data]);
const [attestationOverrides, setAttestationOverrides] = useState<Map<string, Partial<Attestation>>>(new Map());
useEffect(() => {
  if (!attestationOverrides.size) return;
  setAttestationOverrides((prev) => {
    let changed = false;
    const next = new Map(prev);
    rawAttestations.forEach((att) => {
      const override = next.get(att.metadataCid);
      if (!override) return;
      const statusMatch = override.status ? override.status === att.status : true;
      const reserveMatch = override.reserveUSD !== undefined ? override.reserveUSD === att.reserveUSD : true;
      const timestampMatch = override.ts !== undefined ? override.ts === att.ts : true;
      if (statusMatch && reserveMatch && timestampMatch) {
        next.delete(att.metadataCid);
        changed = true;
      }
    });
    return changed ? next : prev;
  });
}, [rawAttestations, attestationOverrides]);
  const attestations = useMemo(() => {
    if (attestationOverrides.size === 0) return rawAttestations;
    return rawAttestations.map((att) => {
      const override = attestationOverrides.get(att.metadataCid);
      if (!override) return att;
      return { ...att, ...override };
    });
  }, [rawAttestations, attestationOverrides]);

  const {
    items: rawRequests,
    diagnostics,
    isLoading: requestsLoading,
    error: requestsError,
    rescan,
  } = useTokenizationRequests(custodianAccount);

  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("All");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [expertTxHash, setExpertTxHash] = useState<string | null>(null);
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const expertNetwork = resolveExpertNetwork(STELLAR_NET);
  const expertExplorerBase =
    expertNetwork === "PUBLIC"
      ? "https://stellar.expert/explorer/public/tx/"
      : "https://stellar.expert/explorer/testnet/tx/";

  const attestationMaps = useMemo(() => {
    const byRequest = new Map<string, Attestation>();
    const byMemoHash = new Map<string, Attestation>();
    attestations.forEach((att) => {
      if (att.requestCid) {
        byRequest.set(att.requestCid, att);
      }
      if (att.memoHashHex) {
        byMemoHash.set(att.memoHashHex.toLowerCase(), att);
      }
    });
    return { byRequest, byMemoHash };
  }, [attestations]);

  const enrichedRequests = useMemo<EnrichedRequest[]>(() => {
    return rawRequests.map((request) => {
      const att =
        request.memo.kind === "cid"
          ? attestationMaps.byRequest.get(request.memo.value)
          : attestationMaps.byMemoHash.get(request.memo.value.toLowerCase());
      let status: RequestStatus = "pending";
      if (att) {
        status = att.status === "Verified" ? "approved" : att.status === "Invalid" ? "rejected" : "pending";
      }
      return {
        ...request,
        status,
        attestation: att,
      } satisfies EnrichedRequest;
    });
  }, [attestationMaps, rawRequests]);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return enrichedRequests.filter((request) => {
      const metadataType = request.meta?.type ?? "Unknown";
      if (typeFilter !== "All" && metadataType !== typeFilter) {
        return false;
      }
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      if (dateFilter) {
        const sameDay = request.createdAt.slice(0, 10) === dateFilter;
        if (!sameDay) return false;
      }
      if (!query) return true;
      const candidates: Array<string | undefined> = [
        request.meta?.name,
        request.memo.kind === "cid" ? request.memo.value : undefined,
        request.meta?.proofCid,
        request.memo.kind === "hash" ? request.memo.value : undefined,
        request.txHash,
        request.from,
      ];
      return candidates.some((value) => value?.toLowerCase().includes(query));
    });
  }, [dateFilter, enrichedRequests, searchTerm, statusFilter, typeFilter]);

  const pendingCount = enrichedRequests.filter((request) => request.status === "pending").length;
  const totalRequests = enrichedRequests.length;
  const manageDataSignatureSummary = useMemo(() => {
    const operations = operationsResponse.data ?? [];
    const now = Date.now();
    const windowStart = now - 30 * 24 * 60 * 60 * 1000;
    let count = 0;
    let lastTimestamp = 0;

    operations.forEach((operation) => {
      if (operation.type !== "manage_data") return;
      const name = typeof operation.name === "string" ? operation.name : "";
      if (name !== "vesto.attestation.cid" && name !== "vesto.attestation") return;
      const created = new Date(operation.created_at).getTime();
      if (Number.isNaN(created) || created < windowStart) return;
      count += 1;
      if (created > lastTimestamp) {
        lastTimestamp = created;
      }
    });

    return {
      count,
      lastTs: lastTimestamp > 0 ? new Date(lastTimestamp).toISOString() : undefined,
    };
  }, [operationsResponse.data]);

  const latestAttestation = attestations[0];
  const attestationSignatureCount = latestAttestation?.signatureCount ?? 0;
  const totalSignatures =
    attestationSignatureCount > 0 ? attestationSignatureCount : manageDataSignatureSummary.count;
  const lastSignatureTimestamp = latestAttestation?.ts ?? manageDataSignatureSummary.lastTs;

  const [selectedRequest, setSelectedRequest] = useState<EnrichedRequest | null>(null);
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submission, setSubmission] = useState<Attestation | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const refreshThrottleRef = useRef(0);

  const handleAttestationOpen = (attestation: Attestation) => {
    setSelectedAttestation(attestation);
    setDrawerOpen(true);
  };

  const handleAttestationClose = () => {
    setDrawerOpen(false);
    setSelectedAttestation(null);
  };

  const operationsMutate = operationsResponse.mutate;
  const effectsMutate = effectsResponse.mutate;

  const handleAttestationStatusUpdate = useCallback(
    (
      metadataCid: string,
      status: Attestation["status"],
      payload?: { reserveAmount?: number; timestamp?: string; metadata?: AttestationMetadata },
    ) => {
      setSelectedAttestation((current) =>
        current && current.metadataCid === metadataCid
          ? {
              ...current,
              status,
              reserveUSD: payload?.reserveAmount ?? current.reserveUSD,
              ts: payload?.timestamp ?? current.ts,
            }
          : current,
      );
      setAttestationOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(metadataCid) ?? {};
        const updated: Partial<Attestation> = {
          ...existing,
          status,
        };
        if (payload?.reserveAmount !== undefined) {
          updated.reserveUSD = payload.reserveAmount;
        }
        if (payload?.timestamp) {
          updated.ts = payload.timestamp;
        }
        next.set(metadataCid, updated);
        return next;
      });
      const now = Date.now();
      const shouldRefresh = now - refreshThrottleRef.current >= 2000;
      if (!shouldRefresh) {
        return;
      }
      refreshThrottleRef.current = now;
      const tasks = [
        operationsMutate?.(),
        effectsMutate?.(),
        rescan(),
      ].filter(Boolean) as Promise<unknown>[];
      if (tasks.length) {
        void Promise.allSettled(tasks);
      }
    },
    [operationsMutate, effectsMutate, rescan],
  );

  const handleSubmission = async (attestation: Attestation) => {
    setSubmission(attestation);
    setSelectedRequest(null);
    const refreshers = [
      operationsResponse.mutate?.(),
      effectsResponse.mutate?.(),
      rescan(),
    ].filter(Boolean) as Promise<unknown>[];
    if (refreshers.length) {
      await Promise.all(refreshers);
    }
  };

  const walletAddress = custodianAccount;
  useEffect(() => {
    if (!debugOpen) {
      setPeekOpen(false);
    }
  }, [debugOpen]);

  const dropReasonEntries = useMemo(
    () =>
      Object.entries(diagnostics.droppedByReason)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [diagnostics.droppedByReason],
  );
  const memoTypeSummary = `${diagnostics.memoSummary.cid} CID / ${diagnostics.memoSummary.hash} HASH`;
  const lastQueryDisplay = diagnostics.timestamp
    ? new Date(diagnostics.timestamp).toLocaleString()
    : "—";

  const attestationOpsDiagnostics = useMemo(() => {
    const operations = operationsResponse.data ?? [];
    const memoSummary = { text: 0, hash: 0, none: 0 };
    operations.forEach((operation) => {
      const memoType =
        operation.transaction_attr?.memo_type ??
        ((operation as unknown as { transaction?: { memo_type?: string | null } }).transaction?.memo_type ?? null);
      if (memoType === "text") {
        memoSummary.text += 1;
      } else if (memoType === "hash") {
        memoSummary.hash += 1;
      } else {
        memoSummary.none += 1;
      }
    });
    return {
      total: operations.length,
      payments: operations.filter((operation) => operation.type === "payment").length,
      manageData: operations.filter((operation) => operation.type === "manage_data").length,
      memoSummary,
    };
  }, [operationsResponse.data]);

  const attestationMemoSummary = `${attestationOpsDiagnostics.memoSummary.text} TEXT / ${attestationOpsDiagnostics.memoSummary.hash} HASH / ${attestationOpsDiagnostics.memoSummary.none} NONE`;
  const maskedCustodian = maskAccountId(diagnostics.account);
  const debugSamples = diagnostics.samples.slice(0, 5);
  const requestsErrorMessage = requestsError
    ? requestsError instanceof Error
      ? requestsError.message
      : String(requestsError)
    : "";
  const showRequestsError = Boolean(requestsErrorMessage && debugOpen);

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate="visible"
        variants={prefersReducedMotion ? undefined : fadeInUp}
        transition={transitions.base}
        className="container mx-auto px-4 py-8"
      >
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Custodian Portal</h1>
          <p className="text-muted-foreground">
            Review tokenization requests, sign attestations, and maintain reserve transparency straight from Horizon & IPFS.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
          <motion.section
            variants={prefersReducedMotion ? undefined : fadeInUp}
            transition={transitions.base}
            className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                {statusFilterOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setStatusFilter(option)}
                    className={`rounded-full px-3 py-1 font-semibold transition ${
                      statusFilter === option ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    type="button"
                  >
                    {option === "all" ? "All" : REQUEST_STATUS_LABEL[option]}
                    {option === "pending" ? ` (${pendingCount})` : null}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {totalRequests > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Tracking {totalRequests} on-chain request{totalRequests === 1 ? "" : "s"}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void rescan();
                  }}
                  className="rounded-full border border-border/50 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  Rescan
                </button>
                <button
                  type="button"
                  onClick={() => setDebugOpen((prev) => !prev)}
                  className="rounded-full border border-border/50 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  {debugOpen ? "Hide Debug" : "Show Debug"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">Type</label>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as AssetTypeFilter)}
                  className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
                >
                  {assetTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">Submitted date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="sm:col-span-2 xl:col-span-2">
                <label className="font-medium text-foreground">Search</label>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by asset name, CID, or proof hash"
                  className="mt-1 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            {showRequestsError ? (
              <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                Failed to refresh custodian requests ({requestsErrorMessage || "unknown error"}). Please rescan or try again shortly.
              </p>
            ) : null}

            {debugOpen ? (
              <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-background/40 p-4 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span>Custodian: {maskedCustodian || "—"}</span>
                  <span>Network: {STELLAR_NET}</span>
                  <span>Horizon: {HORIZON}</span>
                  <span>Limit: {diagnostics.limit}</span>
                  <span>Last Query: {lastQueryDisplay}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span>Total payments: {diagnostics.horizonCount}</span>
                  <span>Accepted: {diagnostics.acceptedCount}</span>
                  <span>Memo types: {memoTypeSummary}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span>Attestation ops: {attestationOpsDiagnostics.total}</span>
                  <span>Payments: {attestationOpsDiagnostics.payments}</span>
                  <span>Manage data: {attestationOpsDiagnostics.manageData}</span>
                  <span>Memo (text/hash/none): {attestationMemoSummary}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-foreground/70">
                  <span>• Under-stroop: {diagnostics.dropSummary.underStroop}</span>
                  <span>• No memo: {diagnostics.dropSummary.noMemo}</span>
                  <span>• Invalid CID: {diagnostics.dropSummary.invalidCid}</span>
                  <span>• Invalid DAG: {diagnostics.dropSummary.invalidDag}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground/80">Dropped reasons</p>
                  <ul className="mt-1 space-y-1">
                    {dropReasonEntries.length
                      ? dropReasonEntries.map(([reason, count]) => (
                          <li key={reason} className="flex items-center justify-between gap-4">
                            <span className="capitalize text-foreground/70">{reason.replace(/-/g, " ")}</span>
                            <span className="font-mono text-foreground">{count}</span>
                          </li>
                        ))
                      : <li className="text-foreground/50">No drops recorded.</li>}
                  </ul>
                </div>
                <div>
                  <button
                    type="button"
                    aria-expanded={peekOpen}
                    aria-controls="custodian-peek-json"
                    onClick={() => setPeekOpen((prev) => !prev)}
                    className="rounded-full border border-border/50 px-3 py-1 text-[11px] font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
                  >
                    {peekOpen ? "Hide Horizon JSON" : "Peek Horizon JSON"}
                  </button>
                  {peekOpen ? (
                    <pre
                      id="custodian-peek-json"
                      className="mt-2 max-h-64 overflow-auto rounded-lg border border-border/40 bg-background/50 p-3 text-[11px] font-mono text-foreground/70"
                    >
                      {JSON.stringify(debugSamples, null, 2)}
                    </pre>
                  ) : null}
                </div>
                {debugSamples.length ? (
                  <div>
                    <p className="font-medium text-foreground/80">Sample payments</p>
                    <ul className="mt-1 space-y-1 font-mono text-[11px] text-foreground/70">
                      {debugSamples.map((sample) => (
                        <li key={sample.id} className="break-all">
                          {sample.transaction_hash.slice(0, 8)}… · to {maskAccountId(sample.to)} · {sample.amount ?? "?"} · memo {sample.transaction?.memo_type ?? "none"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {requestsLoading ? (
                <div className="rounded-xl border border-border/50 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  Loading on-chain requests…
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="rounded-xl border border-border/50 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  {totalRequests === 0 ? "No on-chain tokenization requests yet." : EMPTY_REQUESTS_HELPER}
                </div>
              ) : (
                filteredRequests.map((request) => {
                  const badgeClass = REQUEST_STATUS_BADGE[request.status];
                  const selectedKey = selectedRequest
                    ? (selectedRequest.memo.kind === "cid"
                        ? selectedRequest.memo.value
                        : selectedRequest.memo.kind === "hash"
                          ? selectedRequest.memo.value
                          : selectedRequest.txHash)
                    : null;
                  const requestKey = request.memo.kind === "cid" || request.memo.kind === "hash"
                    ? request.memo.value
                    : request.txHash;
                  const isSelected = selectedKey != null && selectedKey === requestKey;
                  const metadataLoaded = request.metadataStatus === "loaded" && request.meta;
                  const metadataError = request.metadataStatus === "error" ? request.metadataError : undefined;
                  const isHashOnly = request.memo.kind === "hash";
                  const title = metadataLoaded
                    ? request.meta?.name ?? "Token request"
                    : isHashOnly
                      ? "Request (hash-only)"
                      : "Request";
                  const issuerLabel = request.from;
                  const submittedAt = request.createdAt;
                  const identifierLabel = request.memo.kind === "cid" ? "Memo CID" : "Memo Hash";
                  const identifierValue = request.memo.value;
                  const metadataLink = request.memo.kind === "cid" ? getViaGateway(request.memo.value) : undefined;
                  const proofValue = metadataLoaded ? request.meta?.proofCid : undefined;
                  const proofLabel = metadataLoaded ? "Proof CID" : undefined;
                  const valueDisplay = metadataLoaded
                    ? formatUSD(request.meta?.valueUsd ?? 0)
                    : formatXlm(request.amount);
                  const yieldDisplay =
                    metadataLoaded && request.meta?.expectedYieldPct != null
                      ? `Expected Yield ${request.meta.expectedYieldPct}%`
                      : "Asset XLM";
                  const memoBadge = MEMO_BADGES[request.memo.kind];
                  const showLiveAction = request.status === "pending" && Boolean(request.txHash);
                  return (
                    <div
                      key={requestKey}
                      className={`rounded-xl border ${
                        isSelected ? "border-primary/60 bg-primary/5" : "border-border/50 bg-background/40"
                      } p-5 transition`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-foreground">{title}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                              {REQUEST_STATUS_LABEL[request.status]}
                            </span>
                            {memoBadge ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${memoBadge.className}`}>
                                {memoBadge.label}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Submitted {formatDateTime(submittedAt)} · From {issuerLabel}
                          </p>
                          {metadataError ? (
                            <p className="mt-2 text-xs text-amber-400">
                              Metadata unavailable ({metadataError}). You can proceed with attestation using memo reference.
                            </p>
                          ) : null}
                          {request.metadataStatus === "missing" && !metadataLoaded ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Hash-only reference detected. Provide attestation referencing the memo hash below (base64 memo decoded to hex).
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right text-sm text-foreground">
                          <p className="font-semibold">{valueDisplay}</p>
                          <p className="text-xs text-muted-foreground">{yieldDisplay}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                        {identifierValue ? (
                          <div className="space-y-1">
                            <span className="font-medium text-foreground/80">{identifierLabel}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <CopyHash value={identifierValue} />
                              {metadataLink ? (
                                <button
                                  type="button"
                                  onClick={() => window.open(metadataLink, "_blank", "noopener,noreferrer")}
                                  className="rounded-full border border-border/40 px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                                >
                                  Open CID
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        {proofLabel && proofValue ? (
                          <div className="space-y-1">
                            <span className="font-medium text-foreground/80">{proofLabel}</span>
                            <CopyHash value={proofValue} />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="font-medium text-foreground/80">Transaction</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => window.open(`${expertExplorerBase}${request.txHash}`, "_blank", "noopener,noreferrer")}
                                className="flex w-fit items-center gap-2 rounded-full border border-border/40 px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                              >
                                View on Explorer
                                <span className="font-mono text-[10px] text-muted-foreground">{request.txHash.slice(0, 8)}…</span>
                              </button>
                              {showLiveAction ? (
                                <button
                                  type="button"
                                  aria-label="Open live transaction widget"
                                  title="Open live transaction widget"
                                  onClick={() => {
                                    setExpertTxHash(request.txHash);
                                    setExpertDialogOpen(true);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-[11px] font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                                >
                                  <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M4 4h8v8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M4 12 12 4" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          disabled={request.status === "approved"}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            request.status === "approved"
                              ? "cursor-not-allowed border border-border/40 text-muted-foreground"
                              : "border border-primary/40 text-primary hover:border-primary/60 hover:text-primary"
                          }`}
                        >
                          {request.status === "approved" ? "Attested" : isSelected ? "Responding" : "Respond"}
                        </button>
                        {request.attestation ? (
                          <button
                            type="button"
                            onClick={() => handleAttestationOpen(request.attestation!)}
                            className="rounded-full border border-border/50 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                          >
                            View Attestation
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.section>

          <motion.aside
            variants={prefersReducedMotion ? undefined : fadeInUp}
            transition={transitions.base}
            className="space-y-6"
          >
            <CustodianInfo
              name="Stellar Prime Custody"
              wallet={walletAddress}
              signatureCount={totalSignatures}
              lastSignedAt={lastSignatureTimestamp}
            />
            <UploadAttestation
              accountId={wallet.accountId}
              connected={wallet.connected}
              nextWeek={attestations[0]?.week ? attestations[0].week + 1 : 1}
              request={selectedRequest}
              onRequestCleared={() => setSelectedRequest(null)}
              onUploaded={(att) => {
                handleSubmission(att).catch(() => {
                  /* ignore */
                });
              }}
            />
            <AttestationTimeline items={attestations} onOpen={handleAttestationOpen} />
          </motion.aside>
        </div>
      </motion.div>

      <SubmissionModal open={submission !== null} attestation={submission} onClose={() => setSubmission(null)} />
      <AttestationDrawer
        open={drawerOpen}
        onClose={handleAttestationClose}
        item={selectedAttestation}
        onStatusUpdate={handleAttestationStatusUpdate}
      />
      {expertTxHash ? (
        <StellarExpertWidgetDialog
          txHash={expertTxHash}
          network={expertNetwork}
          open={expertDialogOpen}
          onClose={() => {
            setExpertDialogOpen(false);
            setExpertTxHash(null);
          }}
        />
      ) : null}
    </LayoutShell>
  );
};

export default CustodianPage;
