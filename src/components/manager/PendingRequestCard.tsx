"use client";

import type { TimeOffBalance, TimeOffRequest } from "@/lib/types";
import { getLocationName } from "../employee/locationNames";
import { getEmployeeInitials, getEmployeeName } from "./employeeNames";

export type PendingRequestCardProps = {
  request: TimeOffRequest;
  currentBalance: TimeOffBalance;
  isFetchingBalance: boolean;
  onApprove: () => void | Promise<void>;
  onDeny: () => void | Promise<void>;
  isApproving: boolean;
  isDenying: boolean;
};

function formatSubmitted(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PendingRequestCard({
  request,
  currentBalance,
  isFetchingBalance,
  onApprove,
  onDeny,
  isApproving,
  isDenying,
}: PendingRequestCardProps) {
  const liveBalance = isFetchingBalance;
  const hasSnapshot = request.availableDaysAtSnapshot !== undefined;
  const balanceDrifted =
    hasSnapshot &&
    currentBalance.availableDays !== request.availableDaysAtSnapshot;
  const actionBusy = isApproving || isDenying;
  const initials = getEmployeeInitials(request.employeeId);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card transition-shadow hover:shadow-md"
      data-request-id={request.id}
    >
      <div className="h-0.5 bg-gradient-to-r from-slate-200 via-emerald-400/50 to-teal-400/50" aria-hidden />
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-bold text-white shadow-inner"
              aria-hidden
            >
              {initials}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {getEmployeeName(request.employeeId)}
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                {getLocationName(request.locationId)} &middot; {request.requestedDays}{" "}
                {request.requestedDays === 1 ? "day" : "days"} requested
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Submitted {formatSubmitted(request.submittedAt)}
              </p>
            </div>
          </div>
          <div className="w-full min-w-0 rounded-xl border border-emerald-100/90 bg-gradient-to-b from-emerald-50/90 to-white px-4 py-3 sm:max-w-[13rem] sm:text-right">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-end">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800/80">
                Live balance
              </p>
              {balanceDrifted ? (
                <span
                  className="inline-flex max-w-full items-center rounded-full border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                  title="Current balance no longer matches the value when this request was submitted"
                >
                  Balance changed since request
                </span>
              ) : null}
            </div>
            <p
              className={[
                "mt-1 tabular-nums text-2xl font-bold tracking-tight text-slate-900",
                liveBalance ? "animate-pulse" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {currentBalance.availableDays}{" "}
              <span className="text-sm font-medium text-slate-500">days avail.</span>
            </p>
            <p
              className={[
                "text-sm text-slate-600",
                liveBalance ? "animate-pulse" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {currentBalance.pendingDays} pending
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => {
              void onApprove();
            }}
            disabled={actionBusy}
            className="inline-flex min-h-10 min-w-[6.5rem] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/15 transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isApproving ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => {
              void onDeny();
            }}
            disabled={actionBusy}
            className="inline-flex min-h-10 min-w-[6.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isDenying ? "Denying…" : "Deny"}
          </button>
        </div>
      </div>
    </article>
  );
}
