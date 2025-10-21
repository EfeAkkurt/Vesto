export const getHorizonServer = async (): Promise<unknown> => {
  if (typeof window === "undefined") {
    const { getServer } = await import("@/src/lib/stellar/sdk.server");
    return getServer();
  }
  const { getServer } = await import("@/src/lib/stellar/sdk.client");
  return getServer();
};
