import { CUSTODIAN_ACCOUNT } from "@/src/utils/constants";
import type { SpvHolder } from "@/src/lib/types/spv";

export const getHolders = async (): Promise<SpvHolder[]> => {
  const custodian = CUSTODIAN_ACCOUNT.trim();
  if (!custodian) {
    return [];
  }
  return [
    {
      account: custodian,
      balance: 1,
    },
  ];
};
