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

export const refreshBridgeAll = async () => {
  await Promise.all([
    mutate("bridge:locks"),
    mutate("bridge:mints"),
    mutate("bridge:redeems"),
    mutate("bridge:stats"),
  ]);
};

export const refreshSpvAll = async () => {
  await Promise.all([
    mutate("spv:balance"),
    mutate("spv:income|7"),
    mutate("spv:income|30"),
    mutate("spv:holders"),
  ]);
};
