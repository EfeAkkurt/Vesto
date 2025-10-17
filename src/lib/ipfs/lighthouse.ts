import lighthouse from "@lighthouse-web3/sdk";
import { encode, decode } from "cborg";
import { toCidV1String } from "@/src/lib/ipfs/cid";

export const DEFAULT_GATEWAY = "https://gateway.lighthouse.storage/ipfs/";

export class LighthouseUploadError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LighthouseUploadError";
    this.status = status;
  }
}

const normaliseGateway = (gateway?: string): string => {
  const base = (gateway ?? DEFAULT_GATEWAY).trim() || DEFAULT_GATEWAY;
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const buildUrl = (gateway: string, cid: string): string => `${normaliseGateway(gateway)}/${cid}`;

const textEncoder = new TextEncoder();

const mapError = (error: unknown): LighthouseUploadError => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown Lighthouse error";

  if (/unauthorized|invalid api key|invalid bearer|missing api key|bearer token/i.test(message)) {
    return new LighthouseUploadError(401, "Lighthouse API key invalid/unauthorized.");
  }

  if (/forbidden|not allowed|insufficient/i.test(message)) {
    return new LighthouseUploadError(403, "Lighthouse API key invalid/unauthorized.");
  }

  if (error instanceof TypeError || /network|fetch failed|timeout/i.test(message)) {
    return new LighthouseUploadError(503, "Lighthouse network error.");
  }

  return new LighthouseUploadError(500, `IPFS upload failed: ${message}`);
};

type UploadResponse = {
  data?: {
    Hash?: string;
    hash?: string;
    Name?: string;
  };
};

const extractCid = (response: UploadResponse): string => {
  const raw = response?.data?.Hash ?? response?.data?.hash;
  if (!raw) {
    throw new LighthouseUploadError(500, "IPFS upload failed: missing CID in Lighthouse response.");
  }
  return toCidV1String(raw);
};

export type FileUploadResult = {
  cid: string;
  url: string;
};

export type DagUploadResult = {
  cid: string;
  url: string;
};

export async function lighthouseUploadFile(
  file: Blob,
  apiKey: string,
  gateway?: string,
): Promise<FileUploadResult> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const response = (await lighthouse.uploadBuffer(bytes, apiKey, 1)) as UploadResponse;
    const cid = extractCid(response);
    return { cid, url: buildUrl(gateway ?? DEFAULT_GATEWAY, cid) };
  } catch (error) {
    throw mapError(error);
  }
}

export async function lighthouseUploadDagCbor(
  payload: unknown,
  apiKey: string,
  gateway?: string,
): Promise<DagUploadResult> {
  try {
    const canonical = decode(encode(payload));
    const json = JSON.stringify(canonical);
    const bytes = textEncoder.encode(json);
    const response = (await lighthouse.uploadBuffer(bytes, apiKey, 1)) as UploadResponse;
    const cid = extractCid(response);
    return { cid, url: buildUrl(gateway ?? DEFAULT_GATEWAY, cid) };
  } catch (error) {
    throw mapError(error);
  }
}
