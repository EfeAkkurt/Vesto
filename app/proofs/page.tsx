"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mutate } from "swr";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { QuickAccessCards } from "@/src/components/proofs/QuickAccessCards";
import { SpvStatus } from "@/src/components/proofs/SpvStatus";
import { ReserveMiniChart } from "@/src/components/proofs/ReserveMiniChart";
import { ProofRowActions } from "@/src/components/proofs/ProofRowActions";
import { ProofsEmpty } from "@/src/components/proofs/ProofsEmpty";
import { ProofsSkeleton } from "@/src/components/proofs/ProofsSkeleton";
import { useToast } from "@/src/components/ui/Toast";
import { Loader } from "@/src/components/ui/Loader";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { useStoredProofs } from "@/src/hooks/useStoredProofs";
import { useAccountOperations, useAccountEffects } from "@/src/hooks/horizon";
import { useAttestations } from "@/src/hooks/useAttestations";
import {
  buildProofList,
  buildQuickCards,
  buildDiagnostics,
  deriveSpvStatus,
  buildProofStats,
  type ProofListItem,
  type ProofDiagnostics,
} from "@/src/lib/proofs/selectors";
import { buildReservePoints } from "@/src/lib/dashboard/transformers";
import { uploadFile, putDagCbor } from "@/src/lib/ipfs/client";
import { formatBytes, formatDateTime } from "@/src/lib/utils/format";
import { PROOF_TYPE_OPTIONS, type ProofType, type ProofStatus } from "@/src/lib/types/proofs";
import type { StoredProof } from "@/src/lib/proofs/storage";
import { CUSTODIAN_ACCOUNT } from "@/src/utils/constants";
import { refreshProofsAll } from "@/src/lib/swr/mutateBus";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const FORM_PROOF_TYPES: ProofType[] = ["Audit Report", "Insurance Policy", "Legal Agreement", "Other"];
const TYPE_FILTER_OPTIONS = ["All", ...PROOF_TYPE_OPTIONS] as const;
const STATUS_FILTER_OPTIONS: Array<ProofStatus | "all"> = ["all", "Verified", "Recorded", "Pending", "Invalid"];
const PAGE_SIZE = 10;

const STATUS_PILL_CLASS: Record<ProofStatus, string> = {
  Verified: "bg-emerald-500/10 text-emerald-300",
  Recorded: "bg-sky-400/15 text-sky-200",
  Pending: "bg-amber-400/15 text-amber-300",
  Invalid: "bg-rose-500/15 text-rose-300",
};

const mapUploadError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/401|403|unauthorized|credentials|forbidden/i.test(message)) {
    return "Storage credentials invalid (server). Check LIGHTHOUSE_API_KEY or provider limits.";
  }
  if (/too large|payload|413/i.test(message)) {
    return "File too large (max 10MB).";
  }
  if (/network|timeout|503|fetch failed/i.test(message)) {
    return "Network error — please retry shortly.";
  }
  return message || "Unexpected upload failure — try again shortly.";
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const computeSha256 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", arrayBuffer);
    return toHex(digest);
  }
  return toHex(arrayBuffer);
};

const normaliseFileName = (value?: string) => value?.trim() ?? "";

const applyDateFloor = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setHours(0, 0, 0, 0);
  return date;
};

const applyDateCeil = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setHours(23, 59, 59, 999);
  return date;
};

const matchesSearch = (proof: ProofListItem, query: string) => {
  if (!query) return true;
  const target = query.toLowerCase();
  const fields = [
    proof.title,
    proof.subtitle,
    proof.cid,
    proof.metadataCid,
    proof.hashLabel,
    proof.verifiedBy,
    proof.txHash,
  ];
  return fields.some((field) => field?.toLowerCase().includes(target));
};

const statusLabel = (status: ProofStatus) => {
  if (status === "Verified") return "Verified";
  if (status === "Recorded") return "Recorded";
  if (status === "Invalid") return "Invalid";
  return "Pending";
};

const toDownloadName = (proof: ProofListItem) => {
  const baseName =
    normaliseFileName(proof.subtitle) ||
    proof.title.replace(/\s+/g, "-").toLowerCase() ||
    "proof";
  const extension = (() => {
    const mime = proof.mime?.toLowerCase() ?? "";
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("png")) return "png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    return "bin";
  })();
  return `${baseName}-${proof.cid.slice(0, 8)}.${extension}`;
};

const ProofsPage = () => {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [formType, setFormType] = useState<ProofType | "">("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTER_OPTIONS)[number]>("All");
  const [statusFilter, setStatusFilter] = useState<ProofStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const custodianAccount = wallet.accountId ?? (CUSTODIAN_ACCOUNT || undefined);

  const storedProofs = useStoredProofs();
  const operationsResponse = useAccountOperations(custodianAccount, 200);
  const effectsResponse = useAccountEffects(custodianAccount, 120);
  const attestationState = useAttestations(custodianAccount, operationsResponse.data, effectsResponse.data);

  const proofList = useMemo<ProofListItem[]>(
    () => buildProofList(storedProofs.proofs, attestationState.data ?? []),
    [storedProofs.proofs, attestationState.data],
  );

  const quickCards = useMemo(
    () => buildQuickCards(proofList),
    [proofList],
  );

  const diagnostics = useMemo<ProofDiagnostics>(
    () => buildDiagnostics(proofList, attestationState.data ?? []),
    [proofList, attestationState.data],
  );

  const spvStatus = useMemo(
    () => deriveSpvStatus(attestationState.data ?? []),
    [attestationState.data],
  );

  const reserveSeries = useMemo(
    () => buildReservePoints(attestationState.data ?? []),
    [attestationState.data],
  );

  const stats = useMemo(
    () => buildProofStats(proofList),
    [proofList],
  );

  useEffect(() => {
    mutate("proofs:stats", stats, false);
    mutate("proofs:reserves", reserveSeries, false);
  }, [stats, reserveSeries]);

  useEffect(() => {
    setPageIndex(0);
  }, [typeFilter, statusFilter, searchTerm, startDate, endDate]);

  const initialLoading = storedProofs.isLoading && proofList.length === 0;
  const attestationsLoading = attestationState.isLoading;
  const showSkeleton = initialLoading || attestationsLoading;

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

  const filteredProofs = useMemo(() => {
    const start = startDate ? applyDateFloor(startDate) : undefined;
    const end = endDate ? applyDateCeil(endDate) : undefined;

    return proofList.filter((proof) => {
      if (typeFilter !== "All" && proof.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== "all" && proof.status !== statusFilter) {
        return false;
      }

      const uploadedAt = new Date(proof.uploadedAt);
      if (start && uploadedAt < start) return false;
      if (end && uploadedAt > end) return false;

      if (!matchesSearch(proof, searchTerm.trim())) {
        return false;
      }

      return true;
    });
  }, [proofList, typeFilter, statusFilter, searchTerm, startDate, endDate]);

  const pageCount = Math.max(1, Math.ceil(filteredProofs.length / PAGE_SIZE));
  const currentProofs = filteredProofs.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);
  const showPagination = filteredProofs.length > PAGE_SIZE;

  const proofVariants = useMemo(() => {
    if (prefersReducedMotion) {
      return { hidden: { opacity: 0 }, visible: { opacity: 1 } } as const;
    }
    return fadeInUp;
  }, [prefersReducedMotion]);

  const resetForm = () => {
    setFormType("");
    setSelectedFile(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = useCallback(
    (file: File | undefined | null) => {
      if (!file) {
        setSelectedFile(null);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: "Maximum upload size is 10MB.",
          variant: "error",
        });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      toast({
        title: "File staged",
        description: `${file.name} (${formatBytes(file.size)}) ready to upload.`,
        variant: "info",
      });
    },
    [toast],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFileSelect(file ?? null);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelect(file ?? null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDropZoneKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!formType) {
      toast({
        title: "Select proof type",
        description: "Choose the document category before uploading.",
        variant: "warning",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Attach a document",
        description: "Choose a PDF, JPG, or PNG up to 10MB.",
        variant: "warning",
      });
      return;
    }

    if (!custodianAccount) {
      toast({
        title: "Custodian required",
        description: "Configure NEXT_PUBLIC_CUSTODIAN_ACCOUNT before uploading proofs.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedAt = new Date().toISOString();
      const sha256 = await computeSha256(selectedFile);
      const fileCid = await uploadFile(selectedFile);
      const metadata = {
        schema: "vesto.proof.metadata@1",
        type: formType,
        cid: fileCid,
        uploadedAt,
        sha256,
        name: selectedFile.name,
        size: selectedFile.size,
        mime: selectedFile.type || "application/octet-stream",
      };
      const metadataCid = await putDagCbor(metadata);

      const entry: StoredProof = {
        metadataCid,
        cid: fileCid,
        type: formType,
        name: selectedFile.name,
        size: selectedFile.size,
        mime: selectedFile.type || "application/octet-stream",
        sha256,
        uploadedAt,
      };

      await storedProofs.addProof(entry);
      await refreshProofsAll();
      await mutate("dashboard:attestations");
      toast({
        title: "Proof uploaded",
        description: `${selectedFile.name} stored on IPFS.`,
        variant: "success",
      });
      resetForm();
    } catch (error) {
      console.error("Proof upload failed", error);
      toast({
        title: "Upload failed",
        description: mapUploadError(error),
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescan = async () => {
    await Promise.all([
      storedProofs.mutate(),
      operationsResponse.mutate?.(),
      effectsResponse.mutate?.(),
    ]);
  };

  const hasQuickCardData = quickCards.some((card) => card.cid);

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={proofVariants}
        transition={transitions.base}
        className="container mx-auto px-4 py-8"
      >
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Proof Management</h1>
          <p className="text-muted-foreground">
            Centralize audits, insurance certificates, and legal agreements for your reserves.
          </p>
        </header>

        <section className="space-y-6">
          <QuickAccessCards items={quickCards} isLoading={!hasQuickCardData && showSkeleton} />

          <div className="grid gap-4 lg:grid-cols-3">
            <SpvStatus status={spvStatus.status} updatedAt={spvStatus.updatedAt} className="lg:col-span-1" />
            <div className="lg:col-span-2">
              <ReserveMiniChart data={reserveSeries} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <motion.form
              onSubmit={handleSubmit}
              variants={proofVariants}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
            >
              <h2 className="text-xl font-semibold text-foreground">Submit New Proof</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload supporting documentation for your custodial assets. Files remain client-side until submitted.
              </p>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="proof-type" className="text-sm font-medium text-foreground/90">
                    Proof Type
                  </label>
                  <select
                    id="proof-type"
                    name="proofType"
                    value={formType}
                    onChange={(event) => setFormType(event.target.value as ProofType | "")}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select proof type</option>
                    {FORM_PROOF_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="proof-upload" className="mb-2 block text-sm font-medium text-foreground/90">
                    Upload Document
                  </label>
                  <label
                    htmlFor="proof-upload"
                    tabIndex={0}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onKeyDown={handleDropZoneKeyDown}
                    className={
                      "flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background/40 text-center transition " +
                      (dragActive ? "border-primary/70 bg-primary/5" : "border-border/60 hover:border-primary/60")
                    }
                  >
                    <input
                      id="proof-upload"
                      name="proof"
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="px-6">
                        <p className="text-sm font-medium text-foreground" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div className="px-6">
                        <p className="text-sm text-muted-foreground">Drag & drop or press Space/Enter to browse</p>
                        <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader size="sm" /> : "Submit proof"}
                </button>
              </div>
            </motion.form>

            <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Your Proofs</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredProofs.length} visible · {stats.verified} verified / {stats.pending} pending /{" "}
                    {stats.invalid} invalid
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDebugOpen((prev) => !prev)}
                    className="rounded-full border border-border/50 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                  >
                    {debugOpen ? "Hide Debug" : "Show Debug"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRescan();
                    }}
                    className="rounded-full border border-border/50 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                  >
                    Rescan
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="filter-type" className="text-xs font-semibold text-muted-foreground">
                    Type
                  </label>
                  <select
                    id="filter-type"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as (typeof TYPE_FILTER_OPTIONS)[number])}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {TYPE_FILTER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "All" ? "All types" : option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="filter-status" className="text-xs font-semibold text-muted-foreground">
                    Status
                  </label>
                  <select
                    id="filter-status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as ProofStatus | "all")}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "All statuses" : option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="filter-start" className="text-xs font-semibold text-muted-foreground">
                    From date
                  </label>
                  <input
                    id="filter-start"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="filter-end" className="text-xs font-semibold text-muted-foreground">
                    To date
                  </label>
                  <input
                    id="filter-end"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="filter-search" className="text-xs font-semibold text-muted-foreground">
                  Search
                </label>
                <input
                  id="filter-search"
                  type="search"
                  placeholder="Search by CID, hash, custodian, or tx hash"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {debugOpen ? (
                <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Limit: {storedProofs.proofs.length}</span>
                    <span>Total proofs: {diagnostics.total}</span>
                    <span>Matched attestations: {diagnostics.matched}</span>
                    <span>Unmatched: {diagnostics.unmatched}</span>
                    <span>Last query: {formatDateTime(diagnostics.timestamp)}</span>
                    <span>Horizon: {process.env.NEXT_PUBLIC_HORIZON_URL ?? "—"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span>Verified: {diagnostics.verifiedCount}</span>
                    <span>Recorded: {diagnostics.recordedCount}</span>
                    <span>Skipped: {diagnostics.skippedCount}</span>
                    <span>CID fetch errors: {diagnostics.cidFetchErrors}</span>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-foreground/80">
                    {`{ verifiedCount: ${diagnostics.verifiedCount}, recordedCount: ${diagnostics.recordedCount}, skippedCount: ${diagnostics.skippedCount}, cidFetchErrors: ${diagnostics.cidFetchErrors} }`}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span>Operations: {attestationOpsDiagnostics.total}</span>
                    <span>Payments: {attestationOpsDiagnostics.payments}</span>
                    <span>Manage data: {attestationOpsDiagnostics.manageData}</span>
                    <span>Memo (text/hash/none): {attestationMemoSummary}</span>
                  </div>
                  <div className="mt-3">
                    <p className="font-medium text-foreground/80">Dropped reasons</p>
                    <ul className="mt-1 space-y-1">
                      {Object.keys(diagnostics.droppedByReason).length === 0 ? (
                        <li className="text-foreground/60">No drops recorded.</li>
                      ) : (
                        Object.entries(diagnostics.droppedByReason).map(([reason, count]) => (
                          <li key={reason} className="flex items-center justify-between gap-4">
                            <span className="capitalize text-foreground/70">{reason.replace(/-/g, " ")}</span>
                            <span className="font-mono text-foreground">{count}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  {process.env.NODE_ENV !== "production" ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setPeekOpen((prev) => !prev)}
                        className="rounded-full border border-border/50 px-3 py-1 text-[11px] font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
                      >
                        {peekOpen ? "Hide Horizon JSON" : "Peek Horizon JSON"}
                      </button>
                      {peekOpen ? (
                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-border/40 bg-background/60 p-3 text-[11px] text-foreground/80">
                          {JSON.stringify((operationsResponse.data ?? []).slice(0, 5), null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                {showSkeleton ? (
                  <ProofsSkeleton />
                ) : currentProofs.length === 0 ? (
                  <ProofsEmpty />
                ) : (
                  currentProofs.map((proof) => (
                    <article
                      key={proof.id || proof.cid}
                      className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/40 px-4 py-4 transition hover:border-primary/40"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{proof.title}</h3>
                            <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground" title={proof.metadataCid}>
                              CID {proof.cid.slice(0, 8)}…
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground" title={proof.subtitle}>
                            {proof.subtitle}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_PILL_CLASS[proof.status]}`}
                        >
                          {statusLabel(proof.status)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="uppercase tracking-wide">Hash</span>
                            <CopyHash value={proof.hashLabel} />
                          </div>
                          <div>
                            <span className="uppercase tracking-wide">Verified by </span>
                            <span className="font-medium text-foreground">
                              {proof.verifiedBy ?? "—"}
                            </span>
                          </div>
                          <div title={proof.verifiedAtLabel ?? formatDateTime(proof.uploadedAt)}>
                            {proof.verifiedAtLabel ?? formatDateTime(proof.uploadedAt)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ProofRowActions
                            url={proof.gatewayUrl}
                            hash={proof.hashLabel}
                            fileName={toDownloadName(proof)}
                          />
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {showPagination ? (
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>
                    Page {pageIndex + 1} of {pageCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
                      className="rounded-full border border-border/50 px-3 py-1 transition hover:border-primary/60 hover:text-primary disabled:opacity-50"
                      disabled={pageIndex === 0}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageIndex((prev) => Math.min(prev + 1, pageCount - 1))}
                      className="rounded-full border border-border/50 px-3 py-1 transition hover:border-primary/60 hover:text-primary disabled:opacity-50"
                      disabled={pageIndex >= pageCount - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </motion.div>
    </LayoutShell>
  );
};

export default ProofsPage;
