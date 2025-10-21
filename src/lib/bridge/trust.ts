import { getServer } from "@/src/lib/stellar/sdk.server";
import { SUSD } from "./asset";

export async function hasSusdTrustline(accountId: string) {
  const server = getServer() as unknown as {
    loadAccount: (
      id: string,
    ) => Promise<{
      balances: Array<{ asset_code?: string; asset_issuer?: string }>;
    }>;
  };
  const acc = await server.loadAccount(accountId);
  const asset = SUSD() as unknown as {
    code?: string;
    issuer?: string;
    getCode?: () => string;
    getIssuer?: () => string;
  };
  const code = asset.code ?? asset.getCode?.();
  const issuer = asset.issuer ?? asset.getIssuer?.();
  if (!code || !issuer) {
    throw new Error("SUSD asset configuration missing.");
  }
  return acc.balances.some(
    (balance: { asset_code?: string; asset_issuer?: string }) =>
      balance.asset_code === code && balance.asset_issuer === issuer,
  );
}
