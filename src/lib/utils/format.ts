const parseNumeric = (value: number | string): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return Number.NaN;
    const normalized = trimmed.replace(/,/g, "");
    return Number.parseFloat(normalized);
  }
  return Number.NaN;
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_COMPACT_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatUSD = (value: number | string): string => {
  const numeric = parseNumeric(value);
  if (!Number.isFinite(numeric)) return "$0.00";
  return USD_FORMATTER.format(numeric);
};

export const formatUSDCompact = (value: number | string): string => {
  const numeric = parseNumeric(value);
  if (!Number.isFinite(numeric)) return "$0";
  return USD_COMPACT_FORMATTER.format(numeric);
};

const trimTrailingZeros = (value: string): string => {
  if (!value.includes(".")) return value;
  return value.replace(/(\.\d*?[1-9])0+$|\.0+$/u, "$1").replace(/\.$/, "");
};

export const formatXLM = (value: number | string): string => {
  const numeric = parseNumeric(value);
  if (!Number.isFinite(numeric)) return "0";
  const fixed = numeric.toFixed(7);
  const trimmed = trimTrailingZeros(fixed);
  return trimmed.length > 0 ? trimmed : "0";
};

export const formatPct = (value: number | string, fractionDigits = 0): string => {
  const numeric = parseNumeric(value);
  if (!Number.isFinite(numeric)) return "0%";
  const clamped = Math.max(0, Math.min(1, numeric));
  const formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return formatter.format(clamped);
};

export const formatNumber = (value: number, precision = 0): string => {
  if (Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
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

export const formatCurrency = (value: number | string) => formatUSD(value);

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

export const parseAmountToStroops = (value?: string | number): number => {
  if (value === undefined || value === null) return 0;
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 10_000_000);
};

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const RELATIVE_TIME_DIVISIONS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.34524, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

export const formatRelativeTime = (iso: string): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const [divisor, unit] of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < divisor) {
      return RELATIVE_TIME_FORMATTER.format(Math.round(duration), unit);
    }
    duration /= divisor;
  }
  return RELATIVE_TIME_FORMATTER.format(0, "second");
};
