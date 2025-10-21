import type { Attestation } from "@/src/lib/types/proofs";

export const CUSTODIAN_STATUS_THEME: Record<
  Attestation["status"],
  { badge: string; dot: string }
> = {
  Verified: {
    badge: "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  Recorded: {
    badge: "border border-sky-400/30 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
  },
  Pending: {
    badge: "border border-amber-400/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  Invalid: {
    badge: "border border-rose-400/30 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
};
