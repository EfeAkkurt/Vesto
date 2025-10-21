'use client';

import { getBrowser } from "@/src/lib/stellar/sdk.client";
import { Networks, TransactionBuilder, Operation, Asset, Account } from "@stellar/stellar-sdk";
import { SUSD } from "./asset";

export async function enableSusdTrustline({ accountId }: { accountId: string }) {
  const { freighter } = getBrowser();
  const network =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
  const serverUrl = process.env.NEXT_PUBLIC_HORIZON_URL!;
  const source = accountId;
  const accountResponse = await fetch(`${serverUrl}/accounts/${source}`);
  if (!accountResponse.ok) {
    throw new Error("Failed to load account for trustline.");
  }
  const acc = await accountResponse.json();
  const asset = SUSD();
  if (!(asset instanceof Asset)) {
    throw new Error("Invalid SUSD asset.");
  }
  const account = new Account(acc.account_id, acc.sequence);
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: network })
    .addOperation(
      Operation.changeTrust({
        asset,
      }),
    )
    .setTimeout(60)
    .build();

  const xdr = tx.toXDR();
  const { signedTxXdr } = await freighter.signTransaction(xdr, { networkPassphrase: network });
  const res = await fetch(`${serverUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: signedTxXdr }),
  });
  if (!res.ok) {
    throw new Error("change_trust submit failed");
  }
  return true;
}
