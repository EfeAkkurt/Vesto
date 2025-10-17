import { CID } from "multiformats/cid";
import { encode, decode } from "cborg";
import { IPFS_ENDPOINT } from "@/src/utils/constants";

type IpfsModule = typeof import("ipfs-http-client");
type IpfsClient = Awaited<ReturnType<IpfsModule["create"]>>;

let ipfsClientPromise: Promise<IpfsClient> | null = null;

const getIpfs = async (): Promise<IpfsClient> => {
  if (typeof window === "undefined") {
    throw new Error("IPFS client is only available in the browser environment");
  }

  if (!ipfsClientPromise) {
    ipfsClientPromise = import("ipfs-http-client").then(({ create }) => create({ url: IPFS_ENDPOINT }));
  }

  return ipfsClientPromise;
};

export const uploadFile = async (file: Blob): Promise<string> => {
  const ipfs = await getIpfs();
  const result = await ipfs.add(file, {
    cidVersion: 1,
    rawLeaves: true,
  });
  return result.cid.toV1().toString();
};

export const putDagCbor = async (value: unknown): Promise<string> => {
  const ipfs = await getIpfs();
  const canonical = decode(encode(value));
  const cid = await ipfs.dag.put(canonical, {
    storeCodec: "dag-cbor",
    hashAlg: "sha2-256",
  });
  return CID.asCID(cid)?.toV1().toString() ?? cid.toString();
};

export const getViaGateway = (cid: string): string => `https://ipfs.io/ipfs/${cid}`;
