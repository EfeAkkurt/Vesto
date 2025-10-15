"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { useWallet } from "@/src/hooks/useWallet";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useToast } from "@/components/ui/toast";

export default function CustodianPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const { push } = useToast();

  const mockRequests = [
    {
      id: "REQ001",
      assetName: "Manhattan Property A",
      assetType: "Real Estate",
      value: "$2,500,000",
      status: "pending",
      submittedBy: "GBCX...7F2A",
      submittedAt: "2024-01-15",
    },
    {
      id: "REQ002",
      assetName: "Gold Bullion #1234",
      assetType: "Commodities",
      value: "$500,000",
      status: "pending",
      submittedBy: "GABC...9D3E",
      submittedAt: "2024-01-14",
    },
    {
      id: "REQ003",
      assetName: "Tech Startup Shares",
      assetType: "Private Equity",
      value: "$1,000,000",
      status: "approved",
      submittedBy: "GBDX...4B2C",
      submittedAt: "2024-01-13",
    },
  ];

  const handleApprove = (requestId: string) => {
    push({
      title: "Request approved",
      description: `Tokenization request ${requestId} has been approved`,
      variant: "success",
    });
  };

  const handleReject = (requestId: string) => {
    push({
      title: "Request rejected",
      description: `Tokenization request ${requestId} has been rejected`,
      variant: "error",
    });
  };

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={transitions.base}
        className="container mx-auto px-4 py-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Custodian Portal</h1>
          <p className="text-muted-foreground">Review and manage asset tokenization requests</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-border/40">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "pending"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending ({mockRequests.filter(r => r.status === "pending").length})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "approved"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "rejected"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {mockRequests
            .filter(request => activeTab === "all" || request.status === activeTab)
            .map((request, index) => (
              <motion.div
                key={request.id}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{request.assetName}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                          : request.status === "approved"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Asset Type</p>
                        <p className="font-medium">{request.assetType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-medium">{request.value}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted By</p>
                        <p className="font-mono text-xs">{request.submittedBy}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium">{request.submittedAt}</p>
                      </div>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-border/40 hover:bg-destructive/10 hover:text-destructive transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
        </div>

        {mockRequests.filter(r => r.status === activeTab).length === 0 && (
          <motion.div
            variants={fadeInUp}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">No {activeTab} requests found</p>
          </motion.div>
        )}
      </motion.div>
    </LayoutShell>
  );
}