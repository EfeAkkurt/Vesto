"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/src/components/ui/Toast";
import { CustodianInfo } from "@/src/components/custodian/CustodianInfo";
import { UploadAttestation } from "@/src/components/custodian/UploadAttestation";
import { AttestationTimeline } from "@/src/components/custodian/AttestationTimeline";
import { AttestationDrawer } from "@/src/components/custodian/AttestationDrawer";
import type { AssetType, Attestation } from "@/src/lib/types/proofs";
import { formatUSD, formatDate } from "@/src/lib/utils/format";

const statusBadge: Record<"pending" | "approved" | "rejected", string> = {
  pending: "bg-amber-400/15 text-amber-200",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-rose-400/15 text-rose-300",
};

type RequestStatus = "pending" | "approved" | "rejected";

type TokenizationRequest = {
  id: string;
  assetName: string;
  assetType: AssetType;
  valueUSD: number;
  submittedBy: string;
  submittedAt: string; // ISO
  status: RequestStatus;
};

const initialRequests: TokenizationRequest[] = [
  {
    id: "REQ-4821",
    assetName: "Invoice Pool Series A",
    assetType: "Invoice",
    valueUSD: 420_000,
    submittedBy: "GBCX6XBDF1S9J7F2A",
    submittedAt: "2024-01-15T14:10:00.000Z",
    status: "pending",
  },
  {
    id: "REQ-4822",
    assetName: "Subscription Receivables B",
    assetType: "Subscription",
    valueUSD: 310_500,
    submittedBy: "GAKJ8FFL2MN9Q3ZT",
    submittedAt: "2024-01-14T09:42:00.000Z",
    status: "approved",
  },
  {
    id: "REQ-4823",
    assetName: "Downtown Lease Reserve",
    assetType: "Rent",
    valueUSD: 510_000,
    submittedBy: "GBRD5SA19SLY8PQC",
    submittedAt: "2024-01-12T17:23:00.000Z",
    status: "pending",
  },
  {
    id: "REQ-4824",
    assetName: "Carbon Offset Batch 004",
    assetType: "Carbon Credit",
    valueUSD: 220_000,
    submittedBy: "GBLG7VC5WXRT12MN",
    submittedAt: "2024-01-11T11:05:00.000Z",
    status: "rejected",
  },
];

const initialAttestations: Attestation[] = [
  {
    week: 41,
    reserveUSD: 512_000,
    ipfs: { hash: "QmQuarterlyProof41", url: "https://ipfs.io/ipfs/QmQuarterlyProof41" },
    signedBy: "GBCX6XBDF1S9J7F2A",
    status: "Verified",
    ts: "2024-01-14T16:45:00.000Z",
  },
  {
    week: 40,
    reserveUSD: 498_500,
    ipfs: { hash: "QmQuarterlyProof40", url: "https://ipfs.io/ipfs/QmQuarterlyProof40" },
    signedBy: "GBCX6XBDF1S9J7F2A",
    status: "Pending",
    ts: "2024-01-07T13:20:00.000Z",
  },
  {
    week: 39,
    reserveUSD: 485_250,
    ipfs: { hash: "QmQuarterlyProof39", url: "https://ipfs.io/ipfs/QmQuarterlyProof39" },
    signedBy: "GAKJ8FFL2MN9Q3ZT",
    status: "Late",
    ts: "2023-12-30T18:05:00.000Z",
  },
];

const assetTypeOptions: Array<AssetType | "All"> = ["All", "Invoice", "Subscription", "Rent", "Carbon Credit"];

export default function CustodianPage() {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [requests, setRequests] = useState<TokenizationRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<RequestStatus | "all">("pending");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<AssetType | "All">("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [attestations, setAttestations] = useState<Attestation[]>(initialAttestations);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);

  const sortedAttestations = useMemo(
    () => [...attestations].sort((a, b) => b.week - a.week),
    [attestations],
  );

  const nextWeek = (sortedAttestations[0]?.week ?? 0) + 1;

  const filteredRequests = useMemo(() => {
    const min = minValue ? Number.parseFloat(minValue) : null;
    const max = maxValue ? Number.parseFloat(maxValue) : null;
    return requests.filter((request) => {
      const matchesTab = activeTab === "all" ? true : request.status === activeTab;
      if (!matchesTab) return false;
      if (typeFilter !== "All" && request.assetType !== typeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!request.assetName.toLowerCase().includes(term) && !request.id.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (min !== null && !(request.valueUSD >= min)) return false;
      if (max !== null && !(request.valueUSD <= max)) return false;
      if (dateFilter) {
        const isoDate = request.submittedAt.slice(0, 10);
        if (isoDate !== dateFilter) return false;
      }
      return true;
    });
  }, [requests, activeTab, typeFilter, searchTerm, minValue, maxValue, dateFilter]);

  const pendingCount = requests.filter((request) => request.status === "pending").length;

  const clearSelection = () => setSelectedRequests([]);

  const toggleSelection = (id: string) => {
    setSelectedRequests((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const approveRequests = (ids: string[]) => {
    if (ids.length === 0) return;
    setRequests((prev) =>
      prev.map((request) => (ids.includes(request.id) ? { ...request, status: "approved" } : request)),
    );
    toast({
      title: "Requests approved",
      description: `${ids.length} request${ids.length === 1 ? "" : "s"} moved to Approved`,
      variant: "success",
    });
    clearSelection();
  };

  const rejectRequest = (id: string) => {
    setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status: "rejected" } : request)));
    toast({ title: "Request rejected", description: `${id} marked as rejected`, variant: "error" });
  };

  const handleDrawerOpen = (item: Attestation) => {
    setSelectedAttestation(item);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedAttestation(null);
  };


  useEffect(() => {
    if (activeTab !== "pending") {
      clearSelection();
    }
  }, [activeTab]);

  const walletAddress = wallet.address ?? "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

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
          <p className="text-muted-foreground">Review tokenization requests, sign attestations, and manage reserve transparency.</p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <motion.section
            variants={prefersReducedMotion ? undefined : fadeInUp}
            transition={transitions.base}
            className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    activeTab === "pending" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setActiveTab("approved")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    activeTab === "approved" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setActiveTab("rejected")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    activeTab === "rejected" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Rejected
                </button>
                <button
                  onClick={() => setActiveTab("all")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    activeTab === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">Type</label>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as AssetType | "All")}
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
                <label className="font-medium text-foreground">Min value</label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(event) => setMinValue(event.target.value)}
                  placeholder="100000"
                  className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">Max value</label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(event) => setMaxValue(event.target.value)}
                  placeholder="600000"
                  className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <div className="mt-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by asset or request ID"
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            {activeTab === "pending" && selectedRequests.length > 0 ? (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
                <span>{selectedRequests.length} selected</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => approveRequests(selectedRequests)}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  >
                    Approve selected
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {filteredRequests.map((request) => {
                const isSelected = selectedRequests.includes(request.id);
                return (
                  <motion.article
                    key={request.id}
                    variants={prefersReducedMotion ? undefined : fadeInUp}
                    transition={transitions.base}
                    className="rounded-xl border border-border/50 bg-background/40 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {request.status === "pending" ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(request.id)}
                              className="h-4 w-4 rounded border-border/50 bg-background"
                            />
                          ) : null}
                          <h3 className="text-lg font-semibold text-foreground">{request.assetName}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[request.status]}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide">Type</p>
                            <p className="text-foreground">{request.assetType}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide">Value</p>
                            <p className="text-foreground">{formatUSD(request.valueUSD)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide">Submitted</p>
                            <p className="text-foreground">{formatDate(request.submittedAt)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Submitted by {request.submittedBy}</p>
                      </div>
                      <div className="flex flex-col gap-2 text-sm">
                        {request.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => approveRequests([request.id])}
                              className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:bg-primary/90"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectRequest(request.id)}
                              className="rounded-lg border border-border/60 px-4 py-2 font-semibold text-foreground transition hover:border-rose-400 hover:text-rose-300"
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>

            {filteredRequests.length === 0 ? (
              <div className="mt-10 rounded-xl border border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
                No requests match the current filters.
              </div>
            ) : null}
          </motion.section>

          <motion.aside
            variants={prefersReducedMotion ? undefined : fadeInUp}
            transition={transitions.base}
            className="space-y-6"
          >
            <CustodianInfo
              name="Stellar Prime Custody"
              wallet={walletAddress}
              signatureCount={attestations.length}
              lastSignedAt={sortedAttestations.find((att) => att.status === "Verified")?.ts}
            />
            <UploadAttestation
              wallet={walletAddress}
              nextWeek={nextWeek}
              onUploaded={(att) => setAttestations((prev) => [att, ...prev])}
            />
            <AttestationTimeline items={sortedAttestations} onOpen={handleDrawerOpen} />
          </motion.aside>
        </div>
      </motion.div>

      <AttestationDrawer open={drawerOpen} onClose={handleDrawerClose} item={selectedAttestation} />
    </LayoutShell>
  );
}
