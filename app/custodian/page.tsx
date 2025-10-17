"use client";

import { useMemo, useState } from "react";
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
import { SubmissionModal } from "@/src/components/custodian/SubmissionModal";
import type { Attestation } from "@/src/lib/types/proofs";
import { formatUSD, formatDate } from "@/src/lib/utils/format";
import { useAccountPayments, useAccountEffects } from "@/src/hooks/horizon";
import { useAttestations } from "@/src/hooks/useAttestations";
import { useTokenizationRequests } from "@/src/hooks/useTokenizationRequests";
import type { TokenizationRequest } from "@/src/lib/custodian/requests";
import { CUSTODIAN_ACCOUNT } from "@/src/utils/constants";
import { CopyHash } from "@/src/components/ui/CopyHash";

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

const assetTypeOptions: Array<TokenizationRequest["assetType"] | "All"> = [
  "All",
  "Invoice",
  "Subscription",
  "Rent",
  "Carbon Credit",
];

const statusFilterOptions: Array<RequestStatus | "all"> = ["pending", "approved", "rejected", "all"];

const EMPTY_REQUESTS_HELPER = "No tokenization requests match the current filters.";

const CustodianPage = () => {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const custodianAccount = wallet.accountId ?? CUSTODIAN_ACCOUNT;

  const paymentsResponse = useAccountPayments(custodianAccount, 60);
  const effectsResponse = useAccountEffects(custodianAccount, 60);
  const attestationState = useAttestations(custodianAccount, paymentsResponse.data, effectsResponse.data);
  const attestations = useMemo(() => attestationState.data ?? [], [attestationState.data]);

  const { requests: rawRequests, isLoading: requestsLoading } = useTokenizationRequests(custodianAccount, 60);

  const [typeFilter, setTypeFilter] = useState<TokenizationRequest["assetType"] | "All">("All");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const attestationByRequestCid = useMemo(() => {
    const map = new Map<string, Attestation>();
    attestations.forEach((att) => {
      if (att.requestCid) {
        map.set(att.requestCid, att);
      }
    });
    return map;
  }, [attestations]);

  const enrichedRequests = useMemo<EnrichedRequest[]>(() => {
    return rawRequests.map((request) => {
      const att = attestationByRequestCid.get(request.metadataCid);
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
  }, [attestationByRequestCid, rawRequests]);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return enrichedRequests.filter((request) => {
      if (typeFilter !== "All" && request.assetType !== typeFilter) {
        return false;
      }
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      if (dateFilter) {
        const sameDay = request.submittedAt.slice(0, 10) === dateFilter;
        if (!sameDay) return false;
      }
      if (!query) return true;
      return (
        request.assetName.toLowerCase().includes(query) ||
        request.metadataCid.toLowerCase().includes(query) ||
        request.proofCid.toLowerCase().includes(query)
      );
    });
  }, [dateFilter, enrichedRequests, searchTerm, statusFilter, typeFilter]);

  const pendingCount = enrichedRequests.filter((request) => request.status === "pending").length;

  const [selectedRequest, setSelectedRequest] = useState<EnrichedRequest | null>(null);
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submission, setSubmission] = useState<Attestation | null>(null);

  const handleAttestationOpen = (attestation: Attestation) => {
    setSelectedAttestation(attestation);
    setDrawerOpen(true);
  };

  const handleAttestationClose = () => {
    setDrawerOpen(false);
    setSelectedAttestation(null);
  };

  const handleSubmission = async (attestation: Attestation) => {
    setSubmission(attestation);
    setSelectedRequest(null);
    await Promise.all([paymentsResponse.mutate?.(), effectsResponse.mutate?.()]);
  };

  const walletAddress = custodianAccount;

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
              <span className="text-xs text-muted-foreground">
                Tracking {enrichedRequests.length} on-chain request{enrichedRequests.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">Type</label>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as TokenizationRequest["assetType"] | "All")}
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

            <div className="mt-6 space-y-4">
              {requestsLoading ? (
                <div className="rounded-xl border border-border/50 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  Loading on-chain requests…
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="rounded-xl border border-border/50 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  {EMPTY_REQUESTS_HELPER}
                </div>
              ) : (
                filteredRequests.map((request) => {
                  const badgeClass = REQUEST_STATUS_BADGE[request.status];
                  const isSelected = selectedRequest?.metadataCid === request.metadataCid;
                  return (
                    <div
                      key={request.metadataCid}
                      className={`rounded-xl border ${
                        isSelected ? "border-primary/60 bg-primary/5" : "border-border/50 bg-background/40"
                      } p-5 transition`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-foreground">{request.assetName}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                              {REQUEST_STATUS_LABEL[request.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Submitted {formatDate(request.submittedAt)} · Issuer {request.issuer}
                          </p>
                        </div>
                        <div className="text-right text-sm text-foreground">
                          <p className="font-semibold">{formatUSD(request.valueUSD)}</p>
                          <p className="text-xs text-muted-foreground">Expected Yield {request.expectedYieldPct ?? 0}%</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                        <div className="space-y-1">
                          <span className="font-medium text-foreground/80">Memo CID</span>
                          <CopyHash value={request.metadataCid} />
                        </div>
                        <div className="space-y-1">
                          <span className="font-medium text-foreground/80">Proof</span>
                          <CopyHash value={request.proofCid} />
                        </div>
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
              signatureCount={attestations.filter((att) => att.status === "Verified").length}
              lastSignedAt={attestations.find((att) => att.status === "Verified")?.ts}
            />
            <UploadAttestation
              accountId={wallet.accountId}
              connected={wallet.connected}
              preferredDestination={custodianAccount}
              nextWeek={attestations[0]?.week ? attestations[0].week + 1 : 1}
              request={selectedRequest}
              onRequestCleared={() => setSelectedRequest(null)}
              onUploaded={(att) => {
                toast({
                  title: "Attestation submitted",
                  description: `Week ${att.week} broadcasted to Horizon.`,
                  variant: "success",
                });
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
      <AttestationDrawer open={drawerOpen} onClose={handleAttestationClose} item={selectedAttestation} />
    </LayoutShell>
  );
};

export default CustodianPage;
