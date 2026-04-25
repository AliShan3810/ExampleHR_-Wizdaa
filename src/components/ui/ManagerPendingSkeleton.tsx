function CardSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-52 max-w-full animate-pulse rounded bg-neutral-100" />
          <div className="h-3 w-40 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="space-y-2 sm:text-right">
          <div className="ml-auto h-4 w-24 animate-pulse rounded bg-neutral-100" />
          <div className="ml-auto h-7 w-28 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-9 w-24 animate-pulse rounded-md bg-emerald-100" />
        <div className="h-9 w-20 animate-pulse rounded-md bg-neutral-100" />
      </div>
    </div>
  );
}

export function ManagerPendingSkeleton() {
  return (
    <ul className="space-y-3" aria-busy="true" aria-label="Loading pending requests">
      <li>
        <CardSkeleton />
      </li>
      <li>
        <CardSkeleton />
      </li>
    </ul>
  );
}
