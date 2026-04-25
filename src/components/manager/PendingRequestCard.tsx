"use client";

import type { TimeOffBalance, TimeOffRequest } from "@/lib/types";
import { getLocationName } from "../employee/locationNames";
import { getEmployeeName } from "./employeeNames";

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

  return (
    <article
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
      data-request-id={request.id}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            {getEmployeeName(request.employeeId)}
          </h3>
          <p className="text-sm text-neutral-600">
            {getLocationName(request.locationId)} · {request.requestedDays}{" "}
            {request.requestedDays === 1 ? "day" : "days"} requested
          </p>
          <p className="text-xs text-neutral-500">
            Submitted {formatSubmitted(request.submittedAt)}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Live balance
            </p>
            {balanceDrifted ? (
              <span
                className="inline-flex max-w-full items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
                title="Current balance no longer matches the value when this request was submitted"
              >
                Balance changed since request
              </span>
            ) : null}
          </div>
          <p
            className={[
              "tabular-nums text-lg font-semibold text-neutral-900",
              liveBalance ? "animate-pulse" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {currentBalance.availableDays} days available
          </p>
          <p
            className={[
              "text-sm text-neutral-600",
              liveBalance ? "animate-pulse" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {currentBalance.pendingDays} days pending
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void onApprove();
          }}
          disabled={actionBusy}
          className="inline-flex min-w-[5.5rem] items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApproving ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => {
            void onDeny();
          }}
          disabled={actionBusy}
          className="inline-flex min-w-[5.5rem] items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDenying ? "Denying…" : "Deny"}
        </button>
      </div>
    </article>
  );
}
