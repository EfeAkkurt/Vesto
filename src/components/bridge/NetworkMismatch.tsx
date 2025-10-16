import type { Chain } from "@/src/lib/types/proofs";

export type NetworkMismatchProps = {
  walletChain: Chain | null;
  selectedChain: Chain;
  onSwitch?: () => void;
};

export const NetworkMismatch = ({ walletChain, selectedChain, onSwitch }: NetworkMismatchProps) => {
  if (!walletChain || walletChain === selectedChain) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <p>
        Wallet is on <span className="font-semibold">{walletChain}</span>, switch to <span className="font-semibold">{selectedChain}</span> to proceed.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        className="rounded-full border border-amber-300/40 px-3 py-1 font-semibold text-amber-100 transition hover:bg-amber-500/20"
      >
        Switch
      </button>
    </div>
  );
};
