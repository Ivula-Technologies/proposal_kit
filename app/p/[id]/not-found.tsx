export default function ProposalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-neutral-bg px-4 text-center">
      <h1 className="text-2xl font-bold text-brand-navy">
        Proposal not found
      </h1>
      <p className="text-sm text-neutral-muted">
        This link may have expired or the proposal was removed.
      </p>
    </div>
  );
}
