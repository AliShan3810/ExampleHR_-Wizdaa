"use client";

import type { TimeOffBalance } from "@/lib/types";
import { getLocationName } from "./locationNames";

export type BalanceCardProps = {
  balance: TimeOffBalance;
  isStale: boolean;
  isSyncing: boolean;
  locationName?: string;
  optimisticPending?: boolean;
};

function PulseNumber({
  value,
  syncing,
  suffix,
  className,
}: {
  value: number;
  syncing: boolean;
  suffix?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "tabular-nums text-2xl font-bold tracking-tight text-slate-900",
        syncing ? "animate-pulse" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {value}
      {suffix}
    </span>
  );
}

export function BalanceCard({
  balance,
  locationName: locationNameProp,
  isStale,
  isSyncing,
  optimisticPending = false,
}: BalanceCardProps) {
  const locationName = locationNameProp ?? getLocationName(balance.locationId);
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-card",
        isStale
          ? "border-amber-200/90 ring-2 ring-amber-100/80"
          : "border-slate-200/90",
      ].join(" ")}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-90"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Location
          </h3>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{locationName}</p>
        </div>
        {isStale ? (
          <span className="shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 shadow-sm">
            Balance may be outdated
          </span>
        ) : null}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Available</dt>
          <dd className="mt-1">
            <PulseNumber value={balance.availableDays} syncing={isSyncing} />
            <span className="ml-0.5 text-sm font-medium text-slate-500">days</span>
          </dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Pending</dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <PulseNumber
              value={balance.pendingDays}
              syncing={isSyncing}
              className={optimisticPending ? "text-slate-600" : undefined}
            />
            <span className="text-sm font-medium text-slate-500">days</span>
            {optimisticPending && balance.pendingDays > 0 ? (
              <span className="w-full text-xs font-medium text-slate-500">(pending)</span>
            ) : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}
