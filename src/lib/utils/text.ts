const ellipsize = (value: string, left = 6, right = 6): string => {
  if (!value) return "";
  if (value.length <= left + right) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
};

export const shortHash = (value: string, left = 6, right = 6): string => ellipsize(value, left, right);

export const shortAddress = (value: string, left = 6, right = 6): string => ellipsize(value, left, right);

export const shortCid = (value: string, left = 6, right = 6): string => ellipsize(value, left, right);
