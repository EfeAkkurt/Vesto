"use client";

import { motion } from "framer-motion";
import { Layers3, ShieldCheck, Wallet, PieChart, GitBranch, FileCheck, Share2 } from "lucide-react";
import FeatureRevealCard from "@/components/FeatureRevealCard";

const features = [
  {
    title: "RWA Tokenization",
    accent: "#ADD015",
    icon: <Layers3 className="h-4 w-4" />,
    content: (
      <>
        <p className="mb-2">
          Convert cashflow-producing contracts and physical assets into programmable on-chain units with full audit trails.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Mint vRWA tokens with attested NAV snapshots</li>
          <li>Lifecycle automation for issuance, transfers, and redemptions</li>
        </ul>
      </>
    ),
  },
  {
    title: "Custodian Attestation",
    accent: "#7E88E6",
    icon: <ShieldCheck className="h-4 w-4" />,
    content: (
      <>
        <p className="mb-2">
          Streamline proof-of-reserve workflows with weekly attestations and instant investor visibility.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Direct SPV submissions via secure IPFS uploads</li>
          <li>Automated status tracking and discrepancy alerts</li>
        </ul>
      </>
    ),
  },
  {
    title: "Wallet & Role System",
    accent: "#5B5BD6",
    icon: <Wallet className="h-4 w-4" />,
    content: (
      <>
        <p className="mb-2">
          Granular permissions for treasury, compliance, and investor teams using Freighter-native authentication.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Role-based signing and delegation</li>
          <li>Session management with live network health</li>
        </ul>
      </>
    ),
  },
  {
    title: "Transparency UI",
    accent: "#4DD0E1",
    icon: <PieChart className="h-4 w-4" />,
    content: (
      <>
        <p className="mb-2">
          Give LPs and auditors real-time dashboards for reserves, payouts, and proof statuses without spreadsheets.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Custom KPIs with drill-down charts</li>
          <li>Data provenance linked to attestation proofs</li>
        </ul>
      </>
    ),
  },
  {
    title: "Bridge & Stablecoin Integration",
    accent: "#8BD67C",
    icon: <GitBranch className="h-4 w-4" />,
    content: (
      <>
        <p className="mb-2">
          Move liquidity between Stellar, Ethereum, and Solana with governance-controlled mint/burn flows.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Progress tracking modal for relay steps</li>
          <li>Protocol-ready hooks for automated treasury actions</li>
        </ul>
      </>
    ),
  },
  {
    title: "Proofs & Audits Dashboard",
    accent: "#9F7DFC",
    icon: <FileCheck className="h-4 w-4" />,
    content: (
      <>
        <p className="mb-2">
          Centralize legal, insurance, and compliance evidence with live hash verification and download flows.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Quick IPFS access and integrity checks</li>
          <li>Toast-backed actions for downloads and copies</li>
        </ul>
      </>
    ),
  },
  {
    title: "SPV & Revenue Distribution",
    accent: "#F6B74A",
    icon: <Share2 className="h-4 w-4" />,
    content: (
      <>
        <p className="mb-2">
          Simulate distributions, surface holder metrics, and orchestrate payouts with auditable event logs.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Mock execution flows for treasury rehearsals</li>
          <li>Live toast confirmations and updated proofs</li>
        </ul>
      </>
    ),
  },
];

export function ServicesSection() {
  return (
    <section className="relative overflow-hidden bg-black py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <h2 className="text-4xl font-bold text-white md:text-6xl">What Vesto Delivers</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-400">
            Infrastructure to tokenize, govern, and report on real-world assets with institutional-grade controls.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ title, accent, icon, content }) => (
            <FeatureRevealCard key={title} title={title} accent={accent} icon={icon}>
              {content}
            </FeatureRevealCard>
          ))}
        </div>
      </div>
    </section>
  );
}
