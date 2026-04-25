function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card">
      <div className="h-0.5 bg-slate-200" />
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="flex gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3.5 w-44 max-w-full animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-24 w-full animate-pulse rounded-xl bg-emerald-50/80 sm:max-w-[13rem]" />
        </div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <div className="h-10 w-24 animate-pulse rounded-xl bg-emerald-100/80" />
          <div className="h-10 w-20 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function ManagerPendingSkeleton() {
  return (
    <ul className="space-y-4" aria-busy="true" aria-label="Loading pending requests">
      <li>
        <CardSkeleton />
      </li>
      <li>
        <CardSkeleton />
      </li>
    </ul>
  );
}
