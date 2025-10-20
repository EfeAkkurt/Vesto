import { mutate } from "swr";

export const refreshDashboardAll = async () => {
  await Promise.all([
    mutate("dashboard:kpis"),
    mutate("dashboard:attestations"),
    mutate("dashboard:reserves"),
  ]);
};

export const refreshProofsAll = async () => {
  await Promise.all([
    mutate("proofs:list"),
    mutate("proofs:stats"),
    mutate("proofs:reserves"),
  ]);
};
