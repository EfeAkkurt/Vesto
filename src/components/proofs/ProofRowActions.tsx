"use client";

import { useState } from "react";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { Loader } from "@/src/components/ui/Loader";
import { useToast } from "@/src/components/ui/Toast";
import { downloadFromGateway, openInGateway } from "@/src/lib/utils/ipfs";

export type ProofRowActionsProps = {
  url: string;
  hash: string;
  fileName?: string;
};

export const ProofRowActions = ({ url, hash, fileName }: ProofRowActionsProps) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleView = () => {
    if (!url) return;
    openInGateway(url);
    toast({
      title: "Opening proof",
      description: "View document in IPFS gateway",
      variant: "info",
      duration: 2500,
    });
  };

  const handleDownload = async () => {
    try {
      if (!url) return;
      setDownloading(true);
      await downloadFromGateway(url, fileName ?? `${hash.slice(0, 8)}.bin`);
      toast({
        title: "Download started",
        description: "Your proof is downloading",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to download proof", error);
      toast({
        title: "Download failed",
        description: "Unable to download from IPFS. Retry shortly.",
        variant: "error",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleView}
        disabled={!url}
        className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/40 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-60"
      >
        <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M3 8s2.5-4 5-4 5 4 5 4-2.5 4-5 4-5-4-5-4z" />
          <circle cx="8" cy="8" r="1.5" />
        </svg>
        View
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading || !url}
        className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/40 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-60"
      >
        {downloading ? <Loader size="sm" /> : (
          <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M8 3v7" strokeLinecap="round" />
            <path d="M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 12h10" strokeLinecap="round" />
          </svg>
        )}
        Download
      </button>
      <CopyHash value={hash} />
    </div>
  );
};
