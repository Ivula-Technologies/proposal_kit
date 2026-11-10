export default function EditorLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-neutral-border bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="h-7 w-64 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="flex flex-1 justify-center overflow-hidden bg-neutral-bg">
        <div className="w-full max-w-3xl space-y-4 bg-white p-8 shadow-sm md:my-6 md:rounded-lg md:border md:border-neutral-border">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
