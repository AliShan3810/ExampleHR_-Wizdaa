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
  initialRequestedDays?: number;
  errorMessage?: string;
  onSubmit: (payload: RequestFormSubmitPayload) => void | Promise<void>;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function FormHeaderIcon() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-700 ring-1 ring-emerald-500/20">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    </div>
  );
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

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/25";

  return (
    <form
      className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card"
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
      <div className="flex items-start gap-3">
        <FormHeaderIcon />
        <div>
          <h3 className="text-base font-semibold text-slate-900">Request time off</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            HCM will confirm your balance when you submit.
          </p>
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-700"
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
          className={`${inputClass} max-w-[10rem] tabular-nums`}
        />
        {overLimit ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600" role="alert">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            You can request at most {availableDays} day{availableDays === 1 ? "" : "s"} at this
            location.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
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
            className={inputClass}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
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
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor={`${formId}-reason`}
        >
          Reason <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id={`${formId}-reason`}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClass}
          placeholder="e.g. family trip, appointment…"
        />
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
        >
          {isSubmitting ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
  );
}
