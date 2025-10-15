"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  type TooltipProps,
} from "recharts";
import type { Attestation } from "@/src/lib/mockData";
import { ChartWrapper } from "@/src/components/charts/ChartWrapper";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { formatDate } from "@/src/utils/format";

const colors: Record<Attestation["status"], string> = {
  ok: "var(--color-primary)",
  pending: "var(--color-muted)",
  late: "var(--color-destructive)",
};

type DonutAttestationsProps = {
  attestations: Attestation[];
  isLoading?: boolean;
};

type PieDatum = {
  name: string;
  status: Attestation["status"];
  value: number;
};

const buildSegments = (items: Attestation[]): PieDatum[] => {
  const counts: Record<Attestation["status"], number> = { ok: 0, pending: 0, late: 0 };
  items.forEach((item) => {
    counts[item.status] += 1;
  });
  return (Object.keys(counts) as Attestation["status"][])
    .filter((status) => counts[status] > 0)
    .map((status) => ({ name: status, status, value: counts[status] }));
};

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload as PieDatum;
  const label =
    datum.status === "ok" ? "Signed" : datum.status === "pending" ? "Pending" : "Late";
  return (
    <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs text-foreground shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">{datum.value} proof(s)</p>
    </div>
  );
};

export const DonutAttestations = ({ attestations, isLoading }: DonutAttestationsProps) => {
  const segments = useMemo(() => buildSegments(attestations), [attestations]);
  const total = attestations.length;
  const signed = segments.find((segment) => segment.status === "ok")?.value ?? 0;
  const percentSigned = total === 0 ? 0 : Math.round((signed / total) * 100);

  return (
    <ChartWrapper
      title="Attestations"
      description="Proof-of-reserve status (weekly)"
      isLoading={isLoading}
      empty={attestations.length === 0}
      emptyState={
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-semibold text-foreground/80">Attestation missing</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Custodian haftalık beyan yüklemedi. Proofs sekmesine gidin.
          </p>
        </div>
      }
      className="overflow-hidden"
    >
      <div className="grid h-full gap-6 md:grid-cols-[180px,1fr]">
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={segments.length > 1 ? 4 : 0}
                cornerRadius={8}
              >
                {segments.map((segment) => (
                  <Cell key={segment.status} fill={colors[segment.status]} stroke="none" />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-semibold text-foreground/90">{percentSigned}%</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Signed</span>
          </div>
        </div>
        <div className="space-y-3">
          {attestations.slice(0, 4).map((item) => (
            <div
              key={item.week}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-foreground/90">
                  Week {item.week} • {formatDate(item.ts)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Custodian sig: {item.status === "ok" ? "✓" : item.status === "pending" ? "Pending" : "Late"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <CopyHash hash={item.ipfs} className="border-transparent bg-transparent px-0 py-0" truncate={false} />
                <Link
                  href={`https://ipfs.io/ipfs/${item.ipfs}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-primary transition hover:underline"
                >
                  Open IPFS
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartWrapper>
  );
};
