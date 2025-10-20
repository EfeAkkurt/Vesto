const debugEnabled = process.env.NEXT_PUBLIC_DEBUG === "1";

const safeSerialize = (payload: unknown): string => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    return `"[unserializable:${error instanceof Error ? error.message : "unknown"}]"`;
  }
};

export const debug = (tag: string, ...rest: unknown[]): void => {
  if (!debugEnabled) return;
  console.debug(tag, ...rest);
};

export const debugObj = (tag: string, payload: unknown): void => {
  if (!debugEnabled) return;
  console.debug(tag, safeSerialize(payload));
};
