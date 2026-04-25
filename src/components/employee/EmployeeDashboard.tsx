"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TimeOffBalance, TimeOffRequest } from "@/lib/types";
import { toBalanceKey } from "@/lib/balanceKey";
import { useGetBatchBalancesQuery, useSubmitRequestMutation } from "@/store/hcmApi";
import { useAppSelector } from "@/store/hooks";
import { EmployeeDashboardSkeleton } from "@/components/ui/EmployeeDashboardSkeleton";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { BalanceCard } from "./BalanceCard";
import { RequestForm, type RequestFormSubmitPayload } from "./RequestForm";
import { RequestStatusBanner } from "./RequestStatusBanner";
export type EmployeeDashboardProps = {
  employeeId: string;
  locationId: string;
  /** Override how often the batch balance refetches (e.g. Storybook “balance refresh” demos). */
  batchPollingIntervalMs?: number;
};

function pickRequestForStatus(
  list: TimeOffRequest[],
  employeeId: string,
  locationId: string,
): TimeOffRequest | null {
  const scoped = list.filter(
    (r) => r.employeeId === employeeId && r.locationId === locationId,
  );
  if (scoped.length === 0) {
    return null;
  }
  const optimistic = scoped.find((r) => r.optimistic && r.status === "pending");
  if (optimistic) {
    return optimistic;
  }
  return [...scoped].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )[0];
}

export function EmployeeDashboard({
  employeeId,
  locationId,
  batchPollingIntervalMs,
}: EmployeeDashboardProps) {
  const key = toBalanceKey(employeeId, locationId);
  const {
    data,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useGetBatchBalancesQuery(
    undefined,
    batchPollingIntervalMs != null
      ? { pollingInterval: batchPollingIntervalMs }
      : undefined,
  );
  const [submit, submitState] = useSubmitRequestMutation();
  const [hcmConflict, setHcmConflict] = useState(false);
  const [updateToast, setUpdateToast] = useState(false);

  const batchRow = useMemo(
    () =>
      data?.balances.find(
        (b) => b.employeeId === employeeId && b.locationId === locationId,
      ),
    [data, employeeId, locationId],
  );

  const sliceRow = useAppSelector((s) => s.balances.byKey[key]);
  const isStale = useAppSelector((s) => s.balances.isStale);
  const needsVerification = sliceRow?.needsVerification ?? false;

  const timeOffBalance: TimeOffBalance | null = useMemo(() => {
    if (sliceRow) {
      return {
        employeeId: sliceRow.employeeId,
        locationId: sliceRow.locationId,
        availableDays: sliceRow.availableDays,
        pendingDays: sliceRow.pendingDays,
        lastSyncedAt: sliceRow.lastSyncedAt,
      };
    }
    if (batchRow) {
      return {
        employeeId,
        locationId,
        availableDays: batchRow.availableDays,
        pendingDays: 0,
        lastSyncedAt: batchRow.asOf,
      };
    }
    return null;
  }, [batchRow, employeeId, locationId, sliceRow]);

  const hasOptimisticPending = useAppSelector((s) =>
    Object.values(s.requests.optimisticByTempId).some(
      (e) => e.employeeId === employeeId && e.locationId === locationId,
    ),
  );

  const requestForBanner = useAppSelector((s) =>
    pickRequestForStatus(s.requests.requests, employeeId, locationId),
  );

  const prevAvailRef = useRef<string | null>(null);
  useEffect(() => {
    if (!batchRow) {
      return;
    }
    const v = String(batchRow.availableDays);
    if (prevAvailRef.current !== null && prevAvailRef.current !== v) {
      setUpdateToast(true);
      const t = window.setTimeout(() => setUpdateToast(false), 3000);
      prevAvailRef.current = v;
      return () => window.clearTimeout(t);
    }
    prevAvailRef.current = v;
  }, [batchRow, batchRow?.availableDays]);

  const showInitialSkeleton =
    !data && (isLoading || isFetching);
  const isSyncing = Boolean(data) && isFetching && !isLoading;
  const cardStale = isStale || needsVerification;

  const onSubmit = useCallback(
    async (payload: RequestFormSubmitPayload) => {
      setHcmConflict(false);
      try {
        const result = await submit({
          employeeId,
          locationId,
          requestedDays: payload.requestedDays,
        }).unwrap();
        if (!result.success) {
          setHcmConflict(true);
          return;
        }
        if (!result.request) {
          // 200 with success but no `request` — HCM silent no-op; optimistic layer rolled back in onQueryStarted
          setHcmConflict(true);
          return;
        }
        setHcmConflict(false);
      } catch {
        setHcmConflict(true);
      }
    },
    [employeeId, locationId, submit],
  );

  if (isError && !data) {
    return (
      <ErrorPanel
        title="Could not load balances"
        message="The HCM service did not return your balance data. Check your connection and try again."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (showInitialSkeleton) {
    return <EmployeeDashboardSkeleton />;
  }

  if (!timeOffBalance) {
    return (
      <ErrorPanel
        title="No balance for this location"
        message={`There is no balance row for employee ${employeeId} at location ${locationId}. Confirm the correct location or contact HR.`}
      />
    );
  }

  return (
    <div className="relative w-full max-w-md space-y-4">
      {updateToast ? (
        <div
          className="pointer-events-none fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-slate-900/95 px-5 py-2.5 text-sm font-medium text-white shadow-float backdrop-blur-sm"
          role="status"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            &#10003;
          </span>
          Balance updated from HCM
        </div>
      ) : null}

      <BalanceCard
        balance={timeOffBalance}
        isStale={cardStale}
        isSyncing={isSyncing}
        optimisticPending={hasOptimisticPending}
      />

      <RequestStatusBanner
        request={requestForBanner}
        hcmConflict={hcmConflict}
      />

      <RequestForm
        employeeId={employeeId}
        locationId={locationId}
        availableDays={timeOffBalance.availableDays}
        isSubmitting={submitState.isLoading}
        onSubmit={onSubmit}
      />
    </div>
  );
}
