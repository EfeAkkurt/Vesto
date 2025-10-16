export type FormatUSDOptions = {
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const defaultUsdOptions: Required<Omit<FormatUSDOptions, "compact">> = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatUSD = (value: number, options: FormatUSDOptions = {}): string => {
  if (Number.isNaN(value)) return "$0.00";
  if (options.compact) {
    return compactUsdFormatter.format(value);
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.minimumFractionDigits ?? defaultUsdOptions.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits ?? defaultUsdOptions.maximumFractionDigits,
  });

  return formatter.format(value);
};

export const formatNumber = (value: number, precision = 0): string => {
  if (Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
};

export const formatPercent = (value: number, precision = 1): string => {
  if (Number.isNaN(value)) return "0%";
  return `${value.toFixed(precision)}%`;
};

export const formatDate = (iso: string): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
};

export const formatDateTime = (iso: string): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
};

const ellipsize = (value: string, head = 6, tail = 4): string => {
  if (!value) return "";
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
};

export const shortHash = (hash: string, head = 6, tail = 4) => ellipsize(hash, head, tail);

export const shortAddress = (address: string, head = 6, tail = 4) => ellipsize(address, head, tail);

export const formatBytes = (bytes?: number): string => {
  if (!bytes || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

export const formatDirection = (from: string, to: string): string => `${from} → ${to}`;

export const pluralize = (value: number, unit: string): string =>
  `${value} ${value === 1 ? unit : `${unit}s`}`;

export const formatCurrency = (value: number, options?: FormatUSDOptions) => formatUSD(value, options);


export const maskPercent = (value: string): string => {
  if (value === undefined || value === null) return "";
  const sanitized = value.toString().replace(/[^0-9.]/g, "");
  if (!sanitized) return "";
  const [head, ...rest] = sanitized.split(".");
  const decimals = rest.join("");
  const normalized = decimals ? `${head}.${decimals}` : head;
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return "";
  const clamped = Math.min(Math.max(parsed, 0), 100);
  const fixed = clamped.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};
