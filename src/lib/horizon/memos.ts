import { Buffer } from "buffer";
import { CID } from "multiformats/cid";
import type { HorizonPayment } from "@/src/hooks/horizon";
import { debug } from "@/src/lib/logging/logger";

const toCidV1 = (raw: string): string | null => {
  try {
    const parsed = CID.parse(raw);
    const v1 = parsed.toV1().toString();
    if (parsed.version === 0 && parsed.toString() !== v1) {
      debug("[custodian:memo] CID upgraded to v1", { original: raw, upgraded: v1 });
    }
    return v1;
  } catch {
    return null;
  }
};

export const memoHashB64ToHex = (b64: string): string => Buffer.from(b64, "base64").toString("hex");

export const extractMemoCid = (payment: HorizonPayment): string | null => {
  const directMemo = payment.memo?.trim();
  if (directMemo) {
    const cid = toCidV1(directMemo);
    if (cid) return cid;
  }

  const attrMemo = payment.transaction_attr?.memo?.trim();
  if (!attrMemo) return null;

  if (payment.transaction_attr?.memo_type && payment.transaction_attr.memo_type !== "text") {
    try {
      const bytes = Buffer.from(attrMemo, "base64");
      const cid = CID.decode(bytes).toV1().toString();
      return cid;
    } catch {
      return null;
    }
  }

  return toCidV1(attrMemo);
};
