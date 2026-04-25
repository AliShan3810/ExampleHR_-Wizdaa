import { configureStore } from "@reduxjs/toolkit";
import { toBalanceKey } from "@/lib/balanceKey";
import {
  balancesRootReducer,
  updateBalance,
} from "@/store/balancesSlice";
import {
  addOptimisticRequest,
  confirmRequest,
  replacePendingListFromHcm,
  requestsRootReducer,
  rollbackRequest,
  updateRequestStatus,
} from "@/store/requestsSlice";
import type { TimeOffRequest } from "@/lib/types";
import type { RootState, StorePreloaded } from "@/store";

const emp = "emp-1";
const loc = "loc-1";
const key = toBalanceKey(emp, loc);

function makeRequestsStore() {
  return configureStore({ reducer: { requests: requestsRootReducer } });
}

function makePairStore(
  preloaded?: StorePreloaded,
) {
  return configureStore({
    reducer: {
      requests: requestsRootReducer,
      balances: balancesRootReducer,
    },
    preloadedState: preloaded as never,
  });
}

const iso = "2020-01-15T10:00:00.000Z";
const realRequest: TimeOffRequest = {
  id: "hcm-req-99",
  employeeId: emp,
  locationId: loc,
  requestedDays: 2,
  status: "pending",
  submittedAt: iso,
  resolvedAt: null,
  optimistic: false,
  availableDaysAtSnapshot: 7,
};

describe("requestsSlice", () => {
  it("adds optimistic request then confirms with server id", () => {
    const store = makeRequestsStore();
    const tempId = "opt-t1";

    store.dispatch(
      addOptimisticRequest({
        tempId,
        employeeId: emp,
        locationId: loc,
        requestedDays: 2,
        submittedAt: iso,
      }),
    );
    const mid = store.getState().requests;
    expect(mid.optimisticByTempId[tempId]).toBeDefined();
    expect(
      mid.requests.find((r) => r.id === tempId && r.optimistic),
    ).toBeDefined();

    store.dispatch(confirmRequest({ tempId, realRequest }));
    const after = store.getState().requests;
    expect(after.optimisticByTempId[tempId]).toBeUndefined();
    expect(
      after.requests.find((r) => r.id === "hcm-req-99" && !r.optimistic),
    ).toBeDefined();
    expect(
      after.requests.find((r) => r.id === tempId),
    ).toBeUndefined();
  });

  it("rolls back optimistic request and drops temp row", () => {
    const store = makeRequestsStore();
    const tempId = "opt-bad";

    store.dispatch(
      addOptimisticRequest({
        tempId,
        employeeId: emp,
        locationId: loc,
        requestedDays: 1,
        submittedAt: iso,
      }),
    );
    expect(store.getState().requests.requests).toHaveLength(1);

    store.dispatch(rollbackRequest({ tempId }));
    const st = store.getState().requests;
    expect(st.optimisticByTempId[tempId]).toBeUndefined();
    expect(st.requests).toHaveLength(0);
  });

  it("updateRequestStatus is a no-op when id is unknown", () => {
    const store = makeRequestsStore();
    const before = store.getState().requests;
    store.dispatch(
      updateRequestStatus({
        id: "nope",
        status: "approved",
      }),
    );
    expect(store.getState().requests).toEqual(before);
  });

  it("updateRequestStatus mutates a request row when found", () => {
    const store = makeRequestsStore();
    const tempId = "u1";
    store.dispatch(
      addOptimisticRequest({
        tempId,
        employeeId: emp,
        locationId: loc,
        requestedDays: 1,
        submittedAt: iso,
      }),
    );
    store.dispatch(
      updateRequestStatus({
        id: tempId,
        status: "denied",
        resolvedAt: "2020-01-20T00:00:00.000Z",
        optimistic: true,
      }),
    );
    const r = store.getState().requests.requests.find((x) => x.id === tempId);
    expect(r?.status).toBe("denied");
    expect(r?.resolvedAt).toBe("2020-01-20T00:00:00.000Z");
  });

  it("replacePendingListFromHcm: keeps optimistic when server has not returned that id yet", () => {
    const store = makeRequestsStore();
    const tempId = "opt-pending";
    store.dispatch(
      addOptimisticRequest({
        tempId,
        employeeId: emp,
        locationId: loc,
        requestedDays: 1,
        submittedAt: iso,
      }),
    );

    store.dispatch(
      replacePendingListFromHcm([
        {
          ...realRequest,
          id: "other",
          employeeId: "emp-2",
          locationId: "loc-1",
        },
      ]),
    );
    const st = store.getState().requests;
    expect(st.requests.some((r) => r.id === tempId && r.optimistic)).toBe(true);
  });

});

describe("requestsSlice with balances: rollback restores numbers like submitRequest.onQueryStarted", () => {
  it("coordinated rollbackRequest + updateBalance restores available and pending", () => {
    const preload: StorePreloaded = {
      balances: {
        byKey: {
          [key]: {
            employeeId: emp,
            locationId: loc,
            availableDays: 10,
            pendingDays: 0,
            lastSyncedAt: iso,
          },
        },
        lastSyncedAt: iso,
        isStale: false,
      },
    };
    const store = makePairStore(preload);
    const tempId = "opt-rollback-balance";
    const requested = 2;

    const prevAvail = 10;
    const prevPend = 0;
    store.dispatch(
      updateBalance({
        key,
        employeeId: emp,
        locationId: loc,
        availableDays: prevAvail - requested,
        pendingDays: prevPend + requested,
        lastSyncedAt: new Date().toISOString(),
      }),
    );
    store.dispatch(
      addOptimisticRequest({
        tempId,
        employeeId: emp,
        locationId: loc,
        requestedDays: requested,
        submittedAt: new Date().toISOString(),
      }),
    );
    const mid = store.getState() as { balances: RootState["balances"] };
    expect(mid.balances.byKey[key]!.availableDays).toBe(8);
    expect(mid.balances.byKey[key]!.pendingDays).toBe(2);

    store.dispatch(rollbackRequest({ tempId }));
    store.dispatch(
      updateBalance({
        key,
        employeeId: emp,
        locationId: loc,
        availableDays: prevAvail,
        pendingDays: prevPend,
        lastSyncedAt: new Date().toISOString(),
      }),
    );
    const fin = (store.getState() as { balances: RootState["balances"] })
      .balances;
    expect(fin.byKey[key]!.availableDays).toBe(10);
    expect(fin.byKey[key]!.pendingDays).toBe(0);
  });
});
