import { createListenerMiddleware } from "@reduxjs/toolkit";
import { toBalanceKey } from "@/lib/balanceKey";
import {
  reconcileBalance,
  updateBalance,
  touchGlobalSync,
} from "./balancesSlice";
import type { RequestsState } from "./requestsSlice";
import type { BalancesState } from "./balancesSlice";
import { replacePendingListFromHcm } from "./requestsSlice";
import { hcmApi } from "./hcmApi";

export const hcmQueryListener = createListenerMiddleware();

hcmQueryListener.startListening({
  matcher: hcmApi.endpoints.getBatchBalances.matchFulfilled,
  effect: (action, { dispatch, getState }) => {
    const { requests } = getState() as { requests: RequestsState };
    for (const b of action.payload.balances) {
      const key = toBalanceKey(b.employeeId, b.locationId);
      const hasActive = Object.values(requests.optimisticByTempId).some(
        (e) => e.employeeId === b.employeeId && e.locationId === b.locationId,
      );
      dispatch(
        reconcileBalance({
          key,
          server: b,
          hasActiveOptimistic: hasActive,
        }),
      );
    }
    dispatch(touchGlobalSync());
  },
});

hcmQueryListener.startListening({
  matcher: hcmApi.endpoints.getBalance.matchFulfilled,
  effect: (action, { dispatch, getState }) => {
    const { employeeId, locationId } = action.meta.arg
      .originalArgs as { employeeId: string; locationId: string };
    const key = toBalanceKey(employeeId, locationId);
    const prev =
      (getState() as { balances: BalancesState }).balances.byKey[key]
        ?.pendingDays ?? 0;
    const nextPending = action.payload.pendingDays ?? prev;
    dispatch(
      updateBalance({
        key,
        employeeId,
        locationId,
        availableDays: action.payload.availableDays,
        pendingDays: nextPending,
        lastSyncedAt: action.payload.asOf,
        clearNeedsVerification: true,
      }),
    );
  },
});

hcmQueryListener.startListening({
  matcher: hcmApi.endpoints.getPendingRequests.matchFulfilled,
  effect: (action, { dispatch }) => {
    dispatch(replacePendingListFromHcm(action.payload.requests));
  },
});
