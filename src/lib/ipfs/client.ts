import { IPFS_GATEWAY } from "@/src/utils/constants";

const ensureBrowser = () => {
  if (typeof window === "undefined") {
    throw new Error("IPFS client helpers are only available in the browser");
  }
};

const extractErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `IPFS request failed (${response.status})`;
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // Ignore JSON parsing errors; fall back to status text.
  }

  return response.statusText ? `${fallback}: ${response.statusText}` : fallback;
};

const parseCid = (payload: unknown): string => {
  if (payload && typeof payload === "object" && "cid" in payload && typeof (payload as { cid?: unknown }).cid === "string") {
    return (payload as { cid: string }).cid;
  }
  throw new Error("IPFS response did not include a CID");
};

export const uploadFile = async (file: Blob): Promise<string> => {
  ensureBrowser();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/ipfs/file", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const data = (await response.json()) as unknown;
  return parseCid(data);
};

export const putDagCbor = async (value: unknown): Promise<string> => {
  ensureBrowser();

  const response = await fetch("/api/ipfs/dag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const data = (await response.json()) as unknown;
  return parseCid(data);
};

export const getViaGateway = (cid: string): string => `${IPFS_GATEWAY}/${cid}`;
