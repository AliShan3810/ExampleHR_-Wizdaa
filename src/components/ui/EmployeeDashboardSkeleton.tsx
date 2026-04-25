/**
 * Mirrors BalanceCard + form region layout while data is loading.
 */
export function EmployeeDashboardSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4" aria-busy="true" aria-label="Loading balances">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
            <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="h-7 w-28 animate-pulse rounded-full bg-neutral-100" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
            <div className="h-8 w-12 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
            <div className="h-8 w-12 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-neutral-100" />
        <div className="mt-4 h-10 w-full max-w-[10rem] animate-pulse rounded-lg bg-emerald-200/60" />
      </div>
    </div>
  );
}
