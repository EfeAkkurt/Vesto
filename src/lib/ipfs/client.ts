import { create } from "ipfs-http-client";
import { CID } from "multiformats/cid";
import { encode, decode } from "cborg";
import { IPFS_ENDPOINT } from "@/src/utils/constants";

export const ipfs = create({ url: IPFS_ENDPOINT });

export const uploadFile = async (file: Blob): Promise<string> => {
  const result = await ipfs.add(file, {
    cidVersion: 1,
    rawLeaves: true,
  });
  return result.cid.toV1().toString();
};

export const putDagCbor = async (value: unknown): Promise<string> => {
  const canonical = decode(encode(value));
  const cid = await ipfs.dag.put(canonical, {
    storeCodec: "dag-cbor",
    hashAlg: "sha2-256",
  });
  return CID.asCID(cid)?.toV1().toString() ?? cid.toString();
};

export const getViaGateway = (cid: string): string => `https://ipfs.io/ipfs/${cid}`;
