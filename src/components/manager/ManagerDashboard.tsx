"use client";

import { useCallback, useMemo, useState } from "react";
import { toBalanceKey } from "@/lib/balanceKey";
import type { TimeOffBalance, TimeOffRequest } from "@/lib/types";
import {
  useApproveRequestMutation,
  useDenyRequestMutation,
  useGetBalanceQuery,
  useGetPendingRequestsQuery,
} from "@/store/hcmApi";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { ManagerPendingSkeleton } from "@/components/ui/ManagerPendingSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { useAppSelector } from "@/store/hooks";
import { PendingRequestCard } from "./PendingRequestCard";

type PendingRequestRowProps = {
  request: TimeOffRequest;
  onConflict409: () => void;
};

function PendingRequestRow({ request, onConflict409 }: PendingRequestRowProps) {
  const { data, isFetching, isError, refetch } = useGetBalanceQuery({
    employeeId: request.employeeId,
    locationId: request.locationId,
  });
  const key = toBalanceKey(request.employeeId, request.locationId);
  const sliceRow = useAppSelector((s) => s.balances.byKey[key]);
  const [approveFn] = useApproveRequestMutation();
  const [denyFn] = useDenyRequestMutation();
  const [action, setAction] = useState<"approve" | "deny" | null>(null);

  const currentBalance: TimeOffBalance | null = useMemo(() => {
    if (!data) {
      if (sliceRow) {
        return {
          employeeId: sliceRow.employeeId,
          locationId: sliceRow.locationId,
          availableDays: sliceRow.availableDays,
          pendingDays: sliceRow.pendingDays,
          lastSyncedAt: sliceRow.lastSyncedAt,
        };
      }
      return null;
    }
    return {
      employeeId: data.employeeId,
      locationId: data.locationId,
      availableDays: data.availableDays,
      pendingDays: data.pendingDays ?? sliceRow?.pendingDays ?? 0,
      lastSyncedAt: data.asOf,
    };
  }, [data, sliceRow]);

  const handleApprove = useCallback(async () => {
    setAction("approve");
    try {
      await approveFn({ requestId: request.id }).unwrap();
    } catch (e) {
      const status =
        typeof e === "object" && e !== null && "status" in e
          ? (e as { status: number }).status
          : undefined;
      if (status === 409) {
        onConflict409();
      }
    } finally {
      setAction(null);
    }
  }, [approveFn, onConflict409, request.id]);

  const handleDeny = useCallback(async () => {
    setAction("deny");
    try {
      await denyFn({ requestId: request.id }).unwrap();
    } finally {
      setAction(null);
    }
  }, [denyFn, request.id]);

  if (!currentBalance) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
        <p className="font-medium text-neutral-800">Request {request.id}</p>
        {isError ? (
          <div className="mt-2">
            <p className="text-red-800">Could not load live balance from HCM.</p>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="mt-2 text-sm font-medium text-emerald-700 underline hover:text-emerald-800"
            >
              Retry
            </button>
          </div>
        ) : isFetching ? (
          <p className="mt-2 flex items-center gap-2 text-neutral-700">
            <Spinner size={16} label="Loading live balance" />
            <span>Fetching live balance…</span>
          </p>
        ) : (
          <p className="mt-2 text-neutral-600">No balance data yet.</p>
        )}
      </div>
    );
  }

  return (
    <PendingRequestCard
      request={request}
      currentBalance={currentBalance}
      isFetchingBalance={isFetching}
      onApprove={handleApprove}
      onDeny={handleDeny}
      isApproving={action === "approve"}
      isDenying={action === "deny"}
    />
  );
}

export function ManagerDashboard() {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetPendingRequestsQuery();
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const onConflict409 = useCallback(() => {
    setConflictMessage(
      "Approval rejected: balance no longer supports this request. The request is still pending—check the live balance, then try again or deny.",
    );
  }, []);

  const requests = data?.requests ?? [];

  if (isLoading && !data) {
    return <ManagerPendingSkeleton />;
  }

  if (isError && !data) {
    return (
      <ErrorPanel
        title="Could not load pending requests"
        message="The approvals queue could not be reached. Check your connection and try again."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {conflictMessage ? (
        <div
          className="flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          role="alert"
        >
          <span>{conflictMessage}</span>
          <button
            type="button"
            onClick={() => {
              setConflictMessage(null);
            }}
            className="shrink-0 text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {requests.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-neutral-800">All caught up</p>
          <p className="mt-1 text-sm text-neutral-500">
            There are no requests waiting for your approval.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {isFetching && !isLoading ? (
            <li className="flex items-center gap-2 text-xs text-neutral-500">
              <Spinner size={14} label="Refreshing queue" />
              <span>Refreshing queue…</span>
            </li>
          ) : null}
          {requests.map((r) => (
            <li key={r.id}>
              <PendingRequestRow
                request={r}
                onConflict409={onConflict409}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
