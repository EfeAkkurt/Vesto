import { EmptyState } from "@/src/components/shared/EmptyState";

export const ProofsEmpty = () => (
  <EmptyState
    title="No proofs yet"
    hint="Upload a document above to start the audit trail."
    icon={<span role="img" aria-label="No proofs">📄</span>}
  />
);
