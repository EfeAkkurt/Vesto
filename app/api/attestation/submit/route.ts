import { NextRequest, NextResponse } from "next/server";
import { submitSignedTransaction } from "@/src/lib/custodian/attestation";
import { STELLAR_NETWORK_PASSPHRASE } from "@/src/lib/stellar/sdk";

export const runtime = "nodejs";

const FEATURE_FLAG = (process.env.NEXT_PUBLIC_ATTEST_SERVER ?? "").trim();

const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  if (FEATURE_FLAG !== "1") {
    return jsonError(403, "Server-side attestation signing is disabled.");
  }

  const secret = (process.env.CUSTODIAN_SECRET ?? "").trim();
  if (!secret) {
    return jsonError(500, "CUSTODIAN_SECRET is not configured on the server.");
  }

  let payload: { xdr?: string };
  try {
    payload = (await request.json()) as { xdr?: string };
  } catch {
    return jsonError(400, "Invalid JSON payload.");
  }

  const unsignedXdr = payload?.xdr;
  if (typeof unsignedXdr !== "string" || unsignedXdr.trim().length === 0) {
    return jsonError(400, "Unsigned transaction XDR is required.");
  }

  try {
    const { Transaction, Keypair } = await import("stellar-sdk");
    const passphrase = STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
    const transaction = new Transaction(unsignedXdr, passphrase);
    const signer = Keypair.fromSecret(secret);
    transaction.sign(signer);

    const horizonUrl = (process.env.NEXT_PUBLIC_HORIZON_URL ?? "").trim();
    if (!horizonUrl) {
      return jsonError(500, "NEXT_PUBLIC_HORIZON_URL is not configured.");
    }

    const hash = await submitSignedTransaction(horizonUrl, transaction.toXDR());
    return NextResponse.json({ hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit attestation transaction.";
    return jsonError(500, message);
  }
}
