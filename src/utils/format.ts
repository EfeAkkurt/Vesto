const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number, options?: { compact?: boolean }) => {
  if (options?.compact) {
    const compactFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    });
    return compactFormatter.format(value);
  }
  return currencyFormatter.format(value);
};

export const formatNumber = (value: number, precision?: number) => {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: precision ?? 0,
    maximumFractionDigits: precision ?? 1,
  });
  return formatter.format(value);
};

export const formatPercent = (value: number, precision = 1) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return formatter.format(value / 100);
};

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso),
  );

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export const shortAddress = (address: string) =>
  address.length <= 12 ? address : `${address.slice(0, 6)}...${address.slice(-4)}`;

export const shortHash = (hash: string) =>
  hash.length <= 12 ? hash : `${hash.slice(0, 6)}...${hash.slice(-4)}`;
