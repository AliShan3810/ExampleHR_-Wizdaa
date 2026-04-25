"use client";

import { useId, useState } from "react";

export type RequestFormSubmitPayload = {
  requestedDays: number;
  startDate: string;
  endDate: string;
  reason?: string;
};

export type RequestFormProps = {
  employeeId: string;
  locationId: string;
  availableDays: number;
  isSubmitting?: boolean;
  /** For stories/tests when initial value should exceed a low cap */
  initialRequestedDays?: number;
  /** Shown when the last submit failed (e.g. HCM error) */
  errorMessage?: string;
  onSubmit: (payload: RequestFormSubmitPayload) => void | Promise<void>;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function RequestForm({
  employeeId,
  locationId,
  availableDays,
  isSubmitting = false,
  initialRequestedDays = 1,
  errorMessage,
  onSubmit,
}: RequestFormProps) {
  const formId = useId();
  const [requestedDays, setRequestedDays] = useState(initialRequestedDays);
  const [startDate, setStartDate] = useState(todayInputValue);
  const [endDate, setEndDate] = useState(todayInputValue);
  const [reason, setReason] = useState("");

  const overLimit = requestedDays > availableDays;
  const canSubmit = requestedDays > 0 && !overLimit && !isSubmitting;
  const endForSubmit = endDate >= startDate ? endDate : startDate;

  return (
    <form
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        await onSubmit({
          requestedDays,
          startDate,
          endDate: endForSubmit,
          reason: reason.trim() || undefined,
        });
      }}
    >
      <input type="hidden" name="employeeId" value={employeeId} readOnly />
      <input type="hidden" name="locationId" value={locationId} readOnly />
      <h3 className="text-base font-semibold text-neutral-900">Request time off</h3>

      <div>
        <label
          className="block text-sm font-medium text-neutral-700"
          htmlFor={`${formId}-days`}
        >
          Number of days
        </label>
        <input
          id={`${formId}-days`}
          type="number"
          min={1}
          max={Math.max(availableDays, requestedDays)}
          value={requestedDays}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isNaN(v)) return;
            setRequestedDays(v);
          }}
          className="mt-1 w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        {overLimit ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            You can request at most {availableDays} day{availableDays === 1 ? "" : "s"} at this
            location.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="block text-sm font-medium text-neutral-700"
            htmlFor={`${formId}-start`}
          >
            From
          </label>
          <input
            id={`${formId}-start`}
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value > endDate) {
                setEndDate(e.target.value);
              }
            }}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-neutral-700"
            htmlFor={`${formId}-end`}
          >
            To
          </label>
          <input
            id={`${formId}-end`}
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-neutral-700"
          htmlFor={`${formId}-reason`}
        >
          Reason (optional)
        </label>
        <textarea
          id={`${formId}-reason`}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          placeholder="e.g. family trip"
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
        >
          {isSubmitting ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
  );
}
