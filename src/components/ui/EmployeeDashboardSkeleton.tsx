/**
 * Mirrors BalanceCard + form region layout while data is loading.
 */
export function EmployeeDashboardSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4" aria-busy="true" aria-label="Loading balances">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card">
        <div className="h-1 bg-gradient-to-r from-emerald-400/40 via-teal-400/40 to-cyan-400/40" />
        <div className="p-6">
          <div className="flex justify-between gap-3">
            <div className="space-y-2">
              <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-36 animate-pulse rounded-md bg-slate-200/90" />
            </div>
            <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-14 animate-pulse rounded bg-slate-200/80" />
            </div>
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="h-2.5 w-14 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-14 animate-pulse rounded bg-slate-200/80" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card">
        <div className="flex gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-emerald-100/60" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3.5 w-48 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="mt-5 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-4 h-10 max-w-[10rem] animate-pulse rounded-xl bg-gradient-to-r from-emerald-200/50 to-teal-200/50" />
      </div>
    </div>
  );
}
