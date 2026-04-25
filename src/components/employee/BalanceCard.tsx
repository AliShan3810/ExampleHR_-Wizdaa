"use client";

import type { TimeOffBalance } from "@/lib/types";
import { getLocationName } from "./locationNames";

export type BalanceCardProps = {
  balance: TimeOffBalance;
  isStale: boolean;
  isSyncing: boolean;
  /** Defaults to a friendly name for `balance.locationId` */
  locationName?: string;
  /** When true, pending days are labeled as optimistic in gray */
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
        "tabular-nums font-semibold text-neutral-900",
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
        "rounded-2xl border bg-white p-5 shadow-sm transition-shadow",
        isStale
          ? "border-amber-300 ring-1 ring-amber-200/80"
          : "border-neutral-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-neutral-500">Location</h3>
          <p className="text-lg font-semibold text-neutral-900">{locationName}</p>
        </div>
        {isStale ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
            Balance may be outdated
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-neutral-500">Available days</dt>
          <dd className="mt-1">
            <PulseNumber value={balance.availableDays} syncing={isSyncing} />
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Pending</dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <PulseNumber
              value={balance.pendingDays}
              syncing={isSyncing}
              className={optimisticPending ? "text-neutral-600" : undefined}
            />
            {optimisticPending && balance.pendingDays > 0 ? (
              <span className="text-xs font-medium text-neutral-500">
                (pending)
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}
