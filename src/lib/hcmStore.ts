import type {
  HCMBalanceResponse,
  TimeOffBalance,
  TimeOffRequest,
} from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EMPLOYEES = ["emp-1", "emp-2", "emp-3"] as const;
const LOCATIONS = ["loc-1", "loc-2"] as const;

const balanceKey = (employeeId: string, locationId: string) =>
  `${employeeId}:${locationId}`;

let storeInitialized = false;
const balances: Record<string, TimeOffBalance> = {};
const requests: TimeOffRequest[] = [];
let nextRequest = 1;

/** Snapshots for simulating 5% “stale” single-balance responses */
const lastSingleReadGood: Record<string, HCMBalanceResponse> = {};

function nowIso() {
  return new Date().toISOString();
}

function ensureInitialized() {
  if (storeInitialized) return;
  let seed = 0;
  for (const e of EMPLOYEES) {
    for (const l of LOCATIONS) {
      const key = balanceKey(e, l);
      seed += 1;
      balances[key] = {
        employeeId: e,
        locationId: l,
        availableDays: 12 + (seed % 6),
        pendingDays: 0,
        lastSyncedAt: nowIso(),
      };
    }
  }
  storeInitialized = true;
}

export function getAllBalancesArray(): TimeOffBalance[] {
  ensureInitialized();
  return Object.values(balances);
}

export function getBalance(
  employeeId: string,
  locationId: string,
): TimeOffBalance | null {
  ensureInitialized();
  return balances[balanceKey(employeeId, locationId)] ?? null;
}

export function toHCMBalanceResponse(b: TimeOffBalance): HCMBalanceResponse {
  return {
    employeeId: b.employeeId,
    locationId: b.locationId,
    availableDays: b.availableDays,
    asOf: b.lastSyncedAt,
    pendingDays: b.pendingDays,
  };
}

/**
 * 5% chance: return previously cached single-read payload (stale asOf / wrong data).
 * Otherwise update cache and return current.
 */
export function getBalanceResponseWithMaybeStale(
  employeeId: string,
  locationId: string,
): { response: HCMBalanceResponse; httpStatus: 200 } | null {
  ensureInitialized();
  const row = getBalance(employeeId, locationId);
  if (!row) return null;

  const key = balanceKey(employeeId, locationId);
  const current = toHCMBalanceResponse(row);
  if (Math.random() < 0.05) {
    const staleBase = lastSingleReadGood[key] ?? {
      ...current,
      availableDays: Math.max(0, current.availableDays - 3),
      asOf: new Date(Date.now() - 86_400_000).toISOString(),
    };
    const stale: HCMBalanceResponse = {
      ...staleBase,
      pendingDays: row.pendingDays,
    };
    return { response: stale, httpStatus: 200 };
  }
  lastSingleReadGood[key] = { ...current, pendingDays: row.pendingDays };
  return { response: { ...current, pendingDays: row.pendingDays }, httpStatus: 200 };
}

export function listPendingRequests(): TimeOffRequest[] {
  ensureInitialized();
  return requests.filter((r) => r.status === "pending");
}

export function findRequest(id: string): TimeOffRequest | undefined {
  ensureInitialized();
  return requests.find((r) => r.id === id);
}

type SubmitBody = { employeeId: string; locationId: string; requestedDays: number };

/**
 * @returns
 *  - 422: validation
 *  - 'silent_nothing': 10% — caller returns 200 without mutating
 *  - 'conflict_200': 5% — caller returns 200 { success: false }
 *  - 'ok' + HCM response on real success
 */
export function submitTimeOffRequest(
  body: SubmitBody,
):
  | { kind: 422; message: string }
  | { kind: "silent_nothing"; currentAvailable: number }
  | { kind: "conflict_200"; currentAvailable: number; message: string }
  | { kind: "ok"; write: { success: true; newBalance: number }; request: TimeOffRequest } {
  ensureInitialized();
  const { employeeId, locationId, requestedDays } = body;
  if (
    !employeeId ||
    !locationId ||
    typeof requestedDays !== "number" ||
    Number.isNaN(requestedDays) ||
    requestedDays <= 0
  ) {
    return { kind: 422, message: "Invalid body: employeeId, locationId, positive requestedDays" };
  }

  const row = getBalance(employeeId, locationId);
  if (!row) {
    return { kind: 422, message: "Unknown employee or location" };
  }

  if (requestedDays > row.availableDays) {
    return { kind: 422, message: "Requested days exceed available balance" };
  }

  const p = Math.random();
  if (p < 0.1) {
    return { kind: "silent_nothing", currentAvailable: row.availableDays };
  }
  if (p < 0.15) {
    return {
      kind: "conflict_200",
      currentAvailable: row.availableDays,
      message: "HCM could not complete reservation (simulated conflict)",
    };
  }

  row.availableDays -= requestedDays;
  row.pendingDays += requestedDays;
  row.lastSyncedAt = nowIso();

  const id = `hcm-req-${nextRequest++}`;
  const r: TimeOffRequest = {
    id,
    employeeId,
    locationId,
    requestedDays,
    status: "pending",
    submittedAt: nowIso(),
    resolvedAt: null,
    optimistic: false,
    availableDaysAtSnapshot: row.availableDays,
  };
  requests.push(r);

  return {
    kind: "ok",
    request: r,
    write: { success: true, newBalance: row.availableDays },
  };
}

export function applyAnniversaryBonus(employeeId: string, locationId: string) {
  ensureInitialized();
  const row = getBalance(employeeId, locationId);
  if (!row) return { ok: false as const, message: "Unknown employee or location" };
  row.availableDays += 5;
  row.lastSyncedAt = nowIso();
  return { ok: true as const, newBalance: row.availableDays };
}

export function approveRequest(requestId: string) {
  ensureInitialized();
  const r = findRequest(requestId);
  if (!r) {
    return { kind: 404 as const, message: "Request not found" };
  }
  if (r.status !== "pending") {
    return { kind: 400 as const, message: "Request is not pending" };
  }

  const row = getBalance(r.employeeId, r.locationId);
  if (!row) {
    return { kind: 404 as const, message: "Balance row missing" };
  }

  if (row.pendingDays < r.requestedDays || row.availableDays < 0) {
    return {
      kind: 409 as const,
      message: "Insufficient balance to approve at this time",
    };
  }

  row.pendingDays -= r.requestedDays;
  row.lastSyncedAt = nowIso();
  r.status = "approved";
  r.resolvedAt = nowIso();

  return { kind: "ok" as const, request: r, newAvailable: row.availableDays };
}

export function denyRequest(requestId: string) {
  ensureInitialized();
  const r = findRequest(requestId);
  if (!r) {
    return { kind: 404 as const, message: "Request not found" };
  }
  if (r.status !== "pending") {
    return { kind: 400 as const, message: "Request is not pending" };
  }

  const row = getBalance(r.employeeId, r.locationId);
  if (!row) {
    return { kind: 404 as const, message: "Balance row missing" };
  }

  row.availableDays += r.requestedDays;
  row.pendingDays -= r.requestedDays;
  row.lastSyncedAt = nowIso();
  r.status = "denied";
  r.resolvedAt = nowIso();

  return { kind: "ok" as const, request: r, newAvailable: row.availableDays };
}

export { sleep };

/** Test helper: reset store (not used by routes unless imported in tests) */
export function _resetHcmStoreForTests() {
  storeInitialized = false;
  Object.keys(balances).forEach((key) => delete balances[key]);
  requests.length = 0;
  nextRequest = 1;
  for (const key of Object.keys(lastSingleReadGood)) {
    delete lastSingleReadGood[key];
  }
  ensureInitialized();
}
