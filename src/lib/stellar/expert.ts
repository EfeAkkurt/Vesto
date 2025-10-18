export type StellarExpertNetwork = "PUBLIC" | "TESTNET";

const WIDGET_BASE: Record<StellarExpertNetwork, string> = {
  PUBLIC: "https://stellar.expert/widget/public/tx/info/",
  TESTNET: "https://stellar.expert/widget/testnet/tx/info/",
};

const encodeTxHash = (hash: string): string => {
  const trimmed = hash.trim();
  if (!trimmed) {
    throw new Error("Transaction hash is required to render the StellarExpert widget.");
  }
  return encodeURIComponent(trimmed);
};

export const buildExpertTxWidgetUrl = (hash: string, network: StellarExpertNetwork): string => {
  const base = WIDGET_BASE[network];
  return `${base}${encodeTxHash(hash)}`;
};

export const resolveExpertNetwork = (value?: string): StellarExpertNetwork => {
  const normalised = (value ?? "").trim().toUpperCase();
  return normalised === "PUBLIC" || normalised === "MAINNET" ? "PUBLIC" : "TESTNET";
};
