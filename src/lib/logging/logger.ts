const isProduction = process.env.NODE_ENV === "production";

const safeSerialize = (payload: unknown): string => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    return `"[unserializable:${error instanceof Error ? error.message : "unknown"}]"`;
  }
};

export const debug = (tag: string, ...rest: unknown[]): void => {
  if (isProduction) return;
  console.debug(tag, ...rest);
};

export const debugObj = (tag: string, payload: unknown): void => {
  if (isProduction) return;
  console.debug(tag, safeSerialize(payload));
};
