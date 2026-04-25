import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { HCMBalanceResponse } from "@/lib/types";
import { toBalanceKey } from "@/lib/balanceKey";

export type BalanceRow = {
  employeeId: string;
  locationId: string;
  availableDays: number;
  pendingDays: number;
  lastSyncedAt: string;
  /** Set when server data disagrees with an in-flight optimistic update */
  needsVerification?: boolean;
};

export type BalancesState = {
  byKey: Record<string, BalanceRow>;
  lastSyncedAt: string | null;
  isStale: boolean;
};

const initialState: BalancesState = {
  byKey: {},
  lastSyncedAt: null,
  isStale: false,
};

function rowFromHcm(
  b: HCMBalanceResponse,
  pendingDays: number,
): BalanceRow {
  return {
    employeeId: b.employeeId,
    locationId: b.locationId,
    availableDays: b.availableDays,
    pendingDays,
    lastSyncedAt: b.asOf,
    needsVerification: false,
  };
}

const balancesSlice = createSlice({
  name: "balances",
  initialState,
  reducers: {
    setBalances(
      state,
      action: PayloadAction<{
        rows: HCMBalanceResponse[];
        resolvePending?: (employeeId: string, locationId: string) => number;
      }>,
    ) {
      const { rows, resolvePending } = action.payload;
      const at = new Date().toISOString();
      for (const b of rows) {
        const key = toBalanceKey(b.employeeId, b.locationId);
        const pending =
          resolvePending?.(b.employeeId, b.locationId) ??
          state.byKey[key]?.pendingDays ??
          0;
        state.byKey[key] = rowFromHcm(b, pending);
      }
      state.lastSyncedAt = at;
      state.isStale = false;
    },
    updateBalance(
      state,
      action: PayloadAction<{
        key: string;
        employeeId: string;
        locationId: string;
        availableDays: number;
        pendingDays: number;
        lastSyncedAt?: string;
        clearNeedsVerification?: boolean;
      }>,
    ) {
      const {
        key,
        employeeId,
        locationId,
        availableDays,
        pendingDays,
        lastSyncedAt,
        clearNeedsVerification,
      } = action.payload;
      const existing = state.byKey[key];
      if (!existing) {
        state.byKey[key] = {
          employeeId,
          locationId,
          availableDays,
          pendingDays,
          lastSyncedAt: lastSyncedAt ?? new Date().toISOString(),
          needsVerification: false,
        };
        return;
      }
      existing.availableDays = availableDays;
      existing.pendingDays = pendingDays;
      if (lastSyncedAt) {
        existing.lastSyncedAt = lastSyncedAt;
      }
      if (clearNeedsVerification) {
        existing.needsVerification = false;
      }
    },
    markStale(state) {
      state.isStale = true;
    },
    touchGlobalSync(state) {
      state.lastSyncedAt = new Date().toISOString();
      state.isStale = false;
    },
    reconcileBalance(
      state,
      action: PayloadAction<{
        key: string;
        server: HCMBalanceResponse;
        hasActiveOptimistic: boolean;
      }>,
    ) {
      const { key, server, hasActiveOptimistic } = action.payload;
      const row = state.byKey[key];
      if (!row) {
        state.byKey[key] = rowFromHcm(server, 0);
        return;
      }
      if (
        hasActiveOptimistic &&
        row.availableDays !== server.availableDays
      ) {
        row.needsVerification = true;
        return;
      }
      row.availableDays = server.availableDays;
      row.lastSyncedAt = server.asOf;
      row.needsVerification = false;
    },
  },
});

export const {
  setBalances,
  updateBalance,
  markStale,
  reconcileBalance,
  touchGlobalSync,
} = balancesSlice.actions;
export const balancesRootReducer = balancesSlice.reducer;
