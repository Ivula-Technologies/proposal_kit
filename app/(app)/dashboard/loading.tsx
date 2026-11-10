export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mb-6 h-10 w-80 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] animate-pulse rounded-lg border border-neutral-border bg-white p-4"
          >
            <div className="h-4 w-1/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
