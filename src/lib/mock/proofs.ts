import type { ProofItem, ReservePoint } from "@/src/lib/types/proofs";

export const quickAccessProofs = [
  {
    title: "Audit Report" as const,
    desc: "Independent attestation covering custodial reserves and liabilities",
    url: "ipfs://QmAuditReport1234567890",
    hash: "QmAuditReport1234567890",
  },
  {
    title: "Insurance Policy" as const,
    desc: "Coverage certificate for custodial wallets and operational risk",
    url: "ipfs://QmInsurancePolicy0987654321",
    hash: "QmInsurancePolicy0987654321",
  },
  {
    title: "Legal Agreement" as const,
    desc: "Master trust agreement outlining SPV structure and investor rights",
    url: "ipfs://QmLegalAgreementabcdef1234",
    hash: "QmLegalAgreementabcdef1234",
  },
];

export const proofsMock: ProofItem[] = [
  {
    id: "proof-01",
    type: "Audit Report",
    asset: "Quarterly RWA Portfolio",
    status: "Verified",
    hash: "0x7f9a4d2c9b01e8f6c3b2c19642a1ff13fbc2af76",
    url: "ipfs://QmAuditReportQuarterly2024Q1",
    date: "2024-01-08T14:12:00.000Z",
    verifiedBy: "Prime Custodian",
  },
  {
    id: "proof-02",
    type: "Insurance Policy",
    asset: "Custodial Wallet Coverage",
    status: "Pending",
    hash: "0x9c1d5a7f3b2e1c4a6d7e8f9b0c1d2e3f4a5b6c7d",
    url: "ipfs://QmKycInsuranceRider2024",
    date: "2024-01-12T09:45:00.000Z",
    verifiedBy: "Underwriter Pending",
  },
  {
    id: "proof-03",
    type: "Legal Agreement",
    asset: "SPV Series 2024-01",
    status: "Verified",
    hash: "0x3f4e2d1c9b8a7e6d5c4b3a291817161514131211",
    url: "ipfs://QmSpvSeriesTerms202401",
    date: "2024-01-05T17:28:00.000Z",
    verifiedBy: "Stellar Legal",
  },
];

export const reserveSeries: ReservePoint[] = [
  { week: 1, reserveUSD: 486000 },
  { week: 2, reserveUSD: 492500 },
  { week: 3, reserveUSD: 507400 },
  { week: 4, reserveUSD: 514200 },
];

export const spvStatusMock = {
  active: true,
  lastUpdated: "2024-01-15T14:32:00.000Z",
};
