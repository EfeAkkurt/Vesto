const DEFAULT_GATEWAY = "https://ipfs.io/ipfs/";

type FormatResult = {
  url: string;
  hash: string;
};

const stripHash = (value: string) => value.replace(/^ipfs:\/\//, "").replace(/^\//, "");

export const formatIpfs = (urlOrHash: string): FormatResult => {
  const raw = urlOrHash.trim();
  if (!raw) {
    return { url: DEFAULT_GATEWAY, hash: "" };
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const segments = url.pathname.split("/").filter(Boolean);
      const hash = segments[segments.length - 1] ?? raw;
      return { url: url.toString(), hash };
    } catch (error) {
      console.warn("Invalid IPFS URL provided", error);
      return { url: DEFAULT_GATEWAY, hash: stripHash(raw) };
    }
  }

  const hash = stripHash(raw);
  const url = `${DEFAULT_GATEWAY}${hash}`;
  return { url, hash };
};

export const openInGateway = (url: string) => {
  const { url: target } = formatIpfs(url);
  if (typeof window === "undefined") return;
  window.open(target, "_blank", "noopener,noreferrer");
};

export const downloadFromGateway = async (url: string, name?: string): Promise<void> => {
  const { url: target, hash } = formatIpfs(url);
  const response = await fetch(target);

  if (!response.ok) {
    throw new Error(`Failed to download asset from gateway (${response.status})`);
  }

  const blob = await response.blob();

  if (typeof window === "undefined") return;

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = name ?? `${hash || "ipfs-asset"}.bin`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
};
