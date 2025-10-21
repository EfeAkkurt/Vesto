import { formatDateTime } from "@/src/lib/utils/format";
import { shortAddress } from "@/src/lib/utils/text";

export type CustodianInfoProps = {
  name: string;
  wallet: string;
  signatureCount: number;
  lastSignedAt?: string;
};

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export const CustodianInfo = ({ name, wallet, signatureCount, lastSignedAt }: CustodianInfoProps) => {
  const initials = initialsFromName(name) || "?";
  return (
    <div className="grid grid-cols-[auto,1fr,auto] items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
        {initials}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">Wallet: {shortAddress(wallet)}</p>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">{signatureCount} signatures</p>
        <p>{lastSignedAt ? formatDateTime(lastSignedAt) : "Awaiting first signature"}</p>
      </div>
    </div>
  );
};
