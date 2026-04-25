import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toBalanceKey } from "@/lib/balanceKey";
import type { TimeOffRequest } from "@/lib/types";
import { server } from "@/mocks/server";
import { hcmApi, makeStore, setBalances } from "@/store";

const emp = "emp-1";
const loc = "loc-1";
const key = toBalanceKey(emp, loc);
const asOf = (t = "2020-01-01T00:00:00.000Z") => t;

const realRequest: TimeOffRequest = {
  id: "hcm-req-int",
  employeeId: emp,
  locationId: loc,
  requestedDays: 2,
  status: "pending",
  submittedAt: asOf(),
  resolvedAt: null,
  optimistic: false,
  availableDaysAtSnapshot: 8,
};

function hcmPath(path: string) {
  return `http://localhost:3000/api/hcm${path}`;
}

function batchBody(avail: number) {
  return {
    balances: [
      { employeeId: emp, locationId: loc, availableDays: avail, asOf: asOf() },
    ],
  };
}

async function expectEventually(
  cond: () => boolean,
  timeout = 3000,
) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (cond()) {
      return;
    }
    if (Date.now() - start > timeout) {
      throw new Error("timeout");
    }
    await new Promise((r) => {
      setTimeout(r, 5);
    });
  }
}

describe("submitRequest integration (MSW HCM)", () => {
  it("submits time off, applies optimistic state, HCM confirms, and balance matches HCM", async () => {
    const store = makeStore();
    store.dispatch(
      setBalances({
        rows: [
          { employeeId: emp, locationId: loc, availableDays: 10, asOf: asOf() },
        ],
        resolvePending: () => 0,
      }),
    );
    server.use(
      http.get("*/hcm/requests/pending", () =>
        HttpResponse.json({ requests: [] }),
      ),
      http.post(hcmPath("/requests"), () =>
        HttpResponse.json({
          success: true,
          newBalance: 8,
          request: realRequest,
        }),
      ),
      http.get("*/hcm/balances/batch", () =>
        HttpResponse.json(batchBody(8)),
      ),
    );
    const p = store.dispatch(
      hcmApi.endpoints.submitRequest.initiate({
        employeeId: emp,
        locationId: loc,
        requestedDays: 2,
      }),
    );
    if (!("unwrap" in p) || typeof (p as { unwrap?: () => Promise<unknown> }).unwrap !== "function") {
      throw new Error("expected mutation thunk with unwrap");
    }
    await (p as { unwrap: () => Promise<unknown> }).unwrap();
    await expectEventually(() => {
      const s = store.getState();
      const b = s.balances.byKey[key];
      const found = s.requests.requests.find(
        (r) => r.id === "hcm-req-int" && !r.optimistic,
      );
      return (
        b != null && b.availableDays === 8 && b.pendingDays === 2 && !!found
      );
    });
  });

  it("rolls back when HCM returns 200, success: true, but no request (silent no-op body)", async () => {
    const store = makeStore();
    store.dispatch(
      setBalances({
        rows: [
          { employeeId: emp, locationId: loc, availableDays: 10, asOf: asOf() },
        ],
        resolvePending: () => 0,
      }),
    );
    server.use(
      http.get("*/hcm/requests/pending", () =>
        HttpResponse.json({ requests: [] }),
      ),
      http.post(hcmPath("/requests"), () =>
        HttpResponse.json({ success: true, newBalance: 10 }),
      ),
    );
    const p = store.dispatch(
      hcmApi.endpoints.submitRequest.initiate({
        employeeId: emp,
        locationId: loc,
        requestedDays: 2,
      }),
    );
    await (p as { unwrap: () => Promise<unknown> }).unwrap();
    await expectEventually(() => {
      const s = store.getState();
      const b = s.balances.byKey[key];
      return (
        b != null &&
        b.availableDays === 10 &&
        b.pendingDays === 0 &&
        Object.keys(s.requests.optimisticByTempId).length === 0
      );
    });
  });

  it("rolls back optimistic update and restores balance when HCM rejects the write", async () => {
    const store = makeStore();
    store.dispatch(
      setBalances({
        rows: [
          { employeeId: emp, locationId: loc, availableDays: 10, asOf: asOf() },
        ],
        resolvePending: () => 0,
      }),
    );
    server.use(
      http.get("*/hcm/requests/pending", () =>
        HttpResponse.json({ requests: [] }),
      ),
      http.post(hcmPath("/requests"), () =>
        HttpResponse.json({ success: false, newBalance: 0 }, { status: 200 }),
      ),
    );
    const p = store.dispatch(
      hcmApi.endpoints.submitRequest.initiate({
        employeeId: emp,
        locationId: loc,
        requestedDays: 2,
      }),
    );
    await (p as { unwrap: () => Promise<unknown> }).unwrap();
    await expectEventually(() => {
      const s = store.getState();
      const b = s.balances.byKey[key];
      return (
        b != null &&
        b.availableDays === 10 &&
        b.pendingDays === 0 &&
        s.requests.optimisticByTempId &&
        Object.keys(s.requests.optimisticByTempId).length === 0
      );
    });
  });

  it("reconciles a higher available balance from a later batch as anniversary-style bonus (graceful, no flag)", async () => {
    let n = 0;
    const store = makeStore();
    server.use(
      http.get("*/hcm/requests/pending", () =>
        HttpResponse.json({ requests: [] }),
      ),
      http.get("*/hcm/balances/batch", () => {
        n += 1;
        const av = n === 1 ? 10 : 25;
        return HttpResponse.json(batchBody(av));
      }),
    );
    const first = store.dispatch(
      hcmApi.endpoints.getBatchBalances.initiate(),
    ) as { unwrap: () => Promise<unknown> };
    await first.unwrap();
    const second = store.dispatch(
      hcmApi.endpoints.getBatchBalances.initiate(undefined, {
        forceRefetch: true,
        subscribe: false,
      }),
    ) as { unwrap: () => Promise<unknown> };
    await second.unwrap();
    await waitFor(() => {
      const row = store.getState().balances.byKey[key]!;
      expect(row.availableDays).toBe(25);
      expect(row.needsVerification).toBeFalsy();
    });
  });
});
