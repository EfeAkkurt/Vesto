export const ProofsEmpty = () => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 px-6 py-10 text-center">
    <span className="text-4xl" role="img" aria-label="No proofs">
      📄
    </span>
    <h3 className="mt-4 text-lg font-semibold text-foreground">No proofs yet — upload your first document above.</h3>
    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
      Once your custodian reviews a submission, the status will update automatically from Pending to Verified.
    </p>
  </div>
);
