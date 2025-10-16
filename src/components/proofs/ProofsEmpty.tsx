export const ProofsEmpty = () => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 px-6 py-10 text-center">
    <span className="text-4xl" role="img" aria-label="No proofs">
      📄
    </span>
    <h3 className="mt-4 text-lg font-semibold text-foreground">No proofs yet</h3>
    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
      Upload documents using the panel on the left to kick off your verification workflow.
    </p>
  </div>
);
