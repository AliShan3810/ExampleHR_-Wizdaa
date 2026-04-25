import { configureStore } from "@reduxjs/toolkit";
import { STALE_THRESHOLD_MS } from "@/lib/constants";
import { toBalanceKey } from "@/lib/balanceKey";
import {
  balancesRootReducer,
  markStale,
  reconcileBalance,
  setBalances,
  touchGlobalSync,
  updateBalance,
} from "@/store/balancesSlice";

function makeStore() {
  return configureStore({ reducer: { balances: balancesRootReducer } });
}

const emp = "e1";
const loc = "L1";
const key = toBalanceKey(emp, loc);

const server5 = {
  employeeId: emp,
  locationId: loc,
  availableDays: 5,
  asOf: "2020-01-01T00:00:00.000Z",
};

const server7 = { ...server5, availableDays: 7, asOf: "2020-01-01T00:00:00.000Z" };

describe("balancesSlice", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("setBalances from batch response applies available and optional pending", () => {
    const store = makeStore();
    store.dispatch(
      setBalances({
        rows: [server5],
        resolvePending: () => 2,
      }),
    );
    const b = store.getState().balances.byKey[key]!;
    expect(b.availableDays).toBe(5);
    expect(b.pendingDays).toBe(2);
    expect(store.getState().balances.isStale).toBe(false);
    expect(store.getState().balances.lastSyncedAt).not.toBeNull();
  });

  it("setBalances reuses previous pending from state when resolvePending is omitted", () => {
    const store = makeStore();
    store.dispatch(
      setBalances({ rows: [server5], resolvePending: () => 0 }),
    );
    store.dispatch(
      updateBalance({
        key,
        employeeId: emp,
        locationId: loc,
        availableDays: 3,
        pendingDays: 2,
        lastSyncedAt: "2020-01-01T00:00:00.000Z",
      }),
    );
    store.dispatch(
      setBalances({ rows: [{ ...server5, availableDays: 4, asOf: "2020-01-02T00:00:00.000Z" }] }),
    );
    const b = store.getState().balances.byKey[key]!;
    expect(b.pendingDays).toBe(2);
    expect(b.availableDays).toBe(4);
  });

  it("updateBalance from real-time single-balance read updates row", () => {
    const store = makeStore();
    store.dispatch(
      setBalances({ rows: [server5], resolvePending: () => 0 }),
    );
    store.dispatch(
      updateBalance({
        key,
        employeeId: emp,
        locationId: loc,
        availableDays: 9,
        pendingDays: 0,
        lastSyncedAt: "2020-01-02T00:00:00.000Z",
        clearNeedsVerification: true,
      }),
    );
    const b = store.getState().balances.byKey[key]!;
    expect(b.availableDays).toBe(9);
    expect(b.lastSyncedAt).toBe("2020-01-02T00:00:00.000Z");
    expect(b.needsVerification).toBeFalsy();
  });

  it("reconcileBalance sets needsVerification when optimistic in-flight and server available differs", () => {
    const store = makeStore();
    store.dispatch(
      setBalances({ rows: [server5], resolvePending: () => 0 }),
    );
    store.dispatch(
      updateBalance({
        key,
        employeeId: emp,
        locationId: loc,
        availableDays: 2,
        pendingDays: 3,
        lastSyncedAt: "2020-01-01T00:00:00.000Z",
      }),
    );
    store.dispatch(
      reconcileBalance({
        key,
        server: server7,
        hasActiveOptimistic: true,
      }),
    );
    const b = store.getState().balances.byKey[key]!;
    expect(b.needsVerification).toBe(true);
    expect(b.availableDays).toBe(2);
  });

  it("reconcileBalance applies server when there is no active optimistic", () => {
    const store = makeStore();
    store.dispatch(
      setBalances({ rows: [server5], resolvePending: () => 0 }),
    );
    store.dispatch(
      reconcileBalance({
        key,
        server: server7,
        hasActiveOptimistic: false,
      }),
    );
    const b1 = store.getState().balances.byKey[key]!;
    expect(b1.availableDays).toBe(7);
    expect(b1.needsVerification).toBeFalsy();
  });

  it("markStale: app can mark data stale; touchGlobalSync clears stale (after time threshold, UI typically dispatches markStale)", () => {
    const start = new Date("2020-01-01T00:00:00.000Z").getTime();
    jest.setSystemTime(start);
    const store = makeStore();
    store.dispatch(setBalances({ rows: [server5], resolvePending: () => 0 }));
    expect(store.getState().balances.isStale).toBe(false);
    // Simulate sync age past STALE_THRESHOLD_MS — consumer would dispatch:
    jest.advanceTimersByTime(STALE_THRESHOLD_MS + 1);
    store.dispatch(markStale());
    expect(store.getState().balances.isStale).toBe(true);
    store.dispatch(touchGlobalSync());
    expect(store.getState().balances.isStale).toBe(false);
  });
});
