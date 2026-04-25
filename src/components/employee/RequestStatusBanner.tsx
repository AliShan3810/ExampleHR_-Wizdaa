"use client";

import type { TimeOffRequest } from "@/lib/types";

export type RequestStatusBannerProps = {
  request: TimeOffRequest | null;
  /** Shown when the HCM call returned `success: false` or a client-side error */
  hcmConflict?: boolean;
};

const base =
  "rounded-xl border px-4 py-3 text-sm font-medium shadow-sm";

export function RequestStatusBanner({
  request,
  hcmConflict = false,
}: RequestStatusBannerProps) {
  if (hcmConflict) {
    return (
      <div
        className={`${base} border-red-200 bg-red-50 text-red-900`}
        role="status"
        aria-live="polite"
      >
        <p>
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
        className={`${base} border-sky-200 bg-sky-50 text-sky-900`}
        role="status"
        aria-live="polite"
      >
        <p>Submitting your request…</p>
      </div>
    );
  }

  if (request.status === "approved") {
    return (
      <div
        className={`${base} border-emerald-200 bg-emerald-50 text-emerald-900`}
        role="status"
      >
        <p>Request approved</p>
      </div>
    );
  }

  if (request.status === "denied") {
    return (
      <div
        className={`${base} border-red-200 bg-red-50 text-red-900`}
        role="status"
      >
        <p>Request denied</p>
      </div>
    );
  }

  if (request.status === "rolled_back") {
    return (
      <div
        className={`${base} border-orange-200 bg-orange-50 text-orange-900`}
        role="status"
      >
        <p>Something went wrong. Your balance has been restored.</p>
      </div>
    );
  }

  if (request.status === "pending" && !request.optimistic) {
    return (
      <div
        className={`${base} border-amber-200 bg-amber-50 text-amber-900`}
        role="status"
      >
        <p>Request pending manager approval</p>
      </div>
    );
  }

  return null;
}
