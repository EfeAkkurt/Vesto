import { CID } from "multiformats/cid";
import type { HorizonPayment } from "@/src/hooks/horizon";
import { Buffer } from "buffer";

export const extractMemoCid = (payment: HorizonPayment): string | null => {
  const directMemo = payment.memo?.trim();
  if (directMemo) {
    try {
      CID.parse(directMemo);
      return directMemo;
    } catch {
      // ignore
    }
  }

  const attrMemo = payment.transaction_attr?.memo?.trim();
  if (!attrMemo) return null;

  if (payment.transaction_attr?.memo_type && payment.transaction_attr.memo_type !== "text") {
    try {
      const bytes = Buffer.from(attrMemo, "base64");
      const cid = CID.decode(bytes).toString();
      return cid;
    } catch {
      return null;
    }
  }

  try {
    CID.parse(attrMemo);
    return attrMemo;
  } catch {
    return null;
  }
};
