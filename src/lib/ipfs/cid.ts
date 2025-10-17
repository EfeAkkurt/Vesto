import { CID } from "multiformats/cid";

export const toCidV1String = (value: string): string => {
  if (!value) return value;
  try {
    const cid = CID.parse(value);
    return cid.toV1().toString();
  } catch {
    return value;
  }
};
