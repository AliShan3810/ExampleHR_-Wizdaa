"use client";

import type { TimeOffRequest } from "@/lib/types";

export type RequestStatusBannerProps = {
  request: TimeOffRequest | null;
  hcmConflict?: boolean;
};

const base =
  "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-sm";

function StatusIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg" aria-hidden>
      {children}
    </span>
  );
}

export function RequestStatusBanner({
  request,
  hcmConflict = false,
}: RequestStatusBannerProps) {
  if (hcmConflict) {
    return (
      <div
        className={`${base} border-red-200/90 bg-gradient-to-r from-red-50 to-orange-50/80 text-red-950`}
        role="status"
        aria-live="polite"
      >
        <StatusIcon>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-base">
            !
          </span>
        </StatusIcon>
        <p className="pt-0.5 leading-snug">
          Could not complete request. Please try again.
        </p>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  if (request.optimistic && request.status === "pending") {
    return (
      <div
        className={`${base} border-sky-200/90 bg-gradient-to-r from-sky-50 to-cyan-50/60 text-sky-950`}
        role="status"
        aria-live="polite"
      >
        <StatusIcon>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
            <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin text-sky-700" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        </StatusIcon>
        <p className="pt-0.5">Submitting your request…</p>
      </div>
    );
  }

  if (request.status === "approved") {
    return (
      <div
        className={`${base} border-emerald-200/90 bg-gradient-to-r from-emerald-50 to-teal-50/50 text-emerald-950`}
        role="status"
      >
        <StatusIcon>
          <span className="text-emerald-600">&#10003;</span>
        </StatusIcon>
        <p className="pt-0.5">Request approved</p>
      </div>
    );
  }

  if (request.status === "denied") {
    return (
      <div
        className={`${base} border-red-200/90 bg-red-50/90 text-red-950`}
        role="status"
      >
        <StatusIcon>
          <span className="text-red-500">&#10005;</span>
        </StatusIcon>
        <p className="pt-0.5">Request denied</p>
      </div>
    );
  }

  if (request.status === "rolled_back") {
    return (
      <div
        className={`${base} border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/40 text-amber-950`}
        role="status"
      >
        <StatusIcon>
          <span className="text-amber-600">&#8635;</span>
        </StatusIcon>
        <p className="pt-0.5">Something went wrong. Your balance has been restored.</p>
      </div>
    );
  }

  if (request.status === "pending" && !request.optimistic) {
    return (
      <div
        className={`${base} border-amber-200/80 bg-amber-50/90 text-amber-950`}
        role="status"
      >
        <StatusIcon>
          <span className="text-amber-600">&#8987;</span>
        </StatusIcon>
        <p className="pt-0.5">Request pending manager approval</p>
      </div>
    );
  }

  return null;
}
