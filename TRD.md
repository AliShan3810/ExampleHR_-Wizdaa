# Technical Requirements Document (TRD)

**Product:** Example HR — Time off (`examplehr-timeoff`)  
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Redux Toolkit, RTK Query, MSW, Storybook, Jest  
**Status:** Living document — align with `src/` as source of truth.

**Data model (assumption for this app):** **Balances are per-employee, per-location.** The canonical map key is `employeeId:locationId` (see `src/lib/balanceKey.ts`). A batch is a set of such cells; the single-read endpoint is one cell. Do not conflate with org-wide totals.

---

## 0. Project guides (how this repo is meant to be built and verified)

These guides shape how the product is specified, implemented, and tested. They are **normative** for future work in this repository.

### 0.1 Agentic development: specification and tests first

- **The TRD and the test matrix are the primary deliverables.** The implementation exists to satisfy explicit contracts, edge cases, and observable states. Prefer refining **this document** and **Jest/Storybook scenarios** (given/when/then, MSW responses, preloaded store shapes) so an automated agent (or a human) can implement or change code with minimal ambiguity.
- **Precision targets:** request/response shapes under `/api/hcm/*`, reducer invariants, and UX states listed in [§9](#9-storybook-strategy) and [§8](#8-test-strategy). Ambiguity in the spec costs more than a tight paragraph in the TRD.

### 0.2 Mock HCM: one logical store, test harness, local runtime

- **Build mock HCM behavior as real logic, not only static JSON.** The shared in-memory store is `src/lib/hcmStore.ts`. Next.js **App Router** route handlers under `src/app/api/hcm/**` are the **HTTP face** of that store (the same contract a production HCM adapter would implement later).
- **What the mock simulates (intentional surface area for tests and stories):**
  - **Balance mutations** on submit (reserve available → pending) and on approve/deny; **per-employee, per-location** rows only.
  - **Work-anniversary (or ad-hoc) top-up** via `POST /api/hcm/simulate/anniversary-bonus` calling `applyAnniversaryBonus` (useful for demos and for “corpus changed under an open session”).
  - **Occasional silent / ambiguous writes:** `submitTimeOffRequest` can return a path where the route responds `200` with `success: true` but **no** `request` in the body (reservation not actually recorded); client must roll back and surface recoverable UX.
  - **Occasional conflict-style body:** `success: false` on `200`, or **422** for validation / **409** for approve when the in-store balance can no longer support the action.
  - **Single-read staleness (demo):** `getBalanceResponseWithMaybeStale` can return a **stale** payload (~5% random) to exercise defensive UI and cache behavior.
- **Trivially runnable locally:** `npm run dev` runs the app with **real** route handlers talking to the in-memory store (no external HCM). **Jest** uses **MSW** in `src/mocks/server.ts` to return deterministic responses for the **same** URL space (`/api/hcm/...`) while still allowing `server.use(...)` to override per test. **Storybook** uses `msw-storybook-addon` and per-story `parameters.msw.handlers` to exercise the **full state matrix** without flaking on random HCM behavior. **Browser MSW** (`NEXT_PUBLIC_ENABLE_MSW=true`, `src/mocks/browser.ts`, `public/mockServiceWorker.js`) can intercept a subset of calls in dev; unhandled traffic falls through to the Next API so the app can still use real handlers.
- **Deploying the harness:** the “deployable” unit is a standard Next.js app: host it anywhere that runs Node for `next start`, or run locally as above. No separate mock server is required for CI if MSW in Jest covers the contract; optional E2E can hit the same `next dev` or preview URL.

### 0.3 Stack and TRD cross-references

- **Next.js (App Router)** and **Storybook** are required surfaces; see [§2](#2-architecture-overview) and [§9](#9-storybook-strategy).
- **State management and data fetching** are **Redux Toolkit + RTK Query** with a deliberate rationale in [§3](#3-state-management-decision) and [§4](#4-data-fetching-strategy).

---

## 1. Problem Summary

HR time-off UIs are slow to feel if every action waits on a **Human Capital Management (HCM)** round trip. Employees need **immediate feedback** that their request is “in flight,” while **balances** and **server truth** can drift: batch exports lag, another flow may consume days, or a write may **fail or partially succeed**.

This application demonstrates:

- **Employee experience:** see balances, submit time off, get optimistic feedback, recover gracefully when HCM disagrees, and see when **background** data is newer than what is on screen.
- **Manager experience:** review a **queue** of pending requests with **live** per-employee, per-location balance, detect **drift** since submission, and **approve** or **deny** with server-side validation of balance at decision time.
- **Engineering experience:** a single, testable state model, typed contracts, in-memory HCM simulation for local/dev/storybook/test, and **MSW**-driven API mocks for automated tests and Storybook.

**Primary goals**

1. Sub-second perceived submit latency (optimistic UI).
2. **Reconciliation** between local slice state, batch snapshots, and single-read HCM without blocking the form unnecessarily.
3. **Observable** edge cases (stale, conflict, rollback, 409 on approve) with clear UX and automated coverage.

### 1.1 Product and engineering challenges

| # | Challenge | Why it matters |
|---|-----------|----------------|
| C1 | **HCM is source of truth; ExampleHR is not** | The UI must not claim impossible certainty. Numbers can change without this app (accrual, other approvals, back office). |
| C2 | **Batch vs single-cell read** | Full corpus (batch) is efficient but can lag; a decision at “approve time” may need a **fresh** per `(employee, location)` read. |
| C3 | **Perceived speed vs correctness** | Blocking every submit on HCM feels slow; showing success before HCM confirms risks **stale** or **contradictory** UI. |
| C4 | **Background refresh during user action** | A poll or push can return **new** `availableDays` while the user has an **in-flight** optimistic submit for the same cell. |
| C5 | **HCM can fail in ambiguous ways** | `200` with missing body, `success: false`, timeouts — the client must **recover** without corrupting state. |
| C6 | **Manager trust** | Approver needs **current** balance context and a clear signal when the balance **drifted** since the employee submitted. |

### 1.2 Proposed solution (at a glance)

- **Server contract:** All HCM access through Next **Route Handlers** under `/api/hcm/*` backed by a **single in-memory** `hcmStore` in development and tests; swap the adapter in production to call real HCM.
- **Client:** **RTK Query** for server cache (batch poll, single balance, pending list, mutations) + **Redux slices** for merge rules (`reconcileBalance`, optimistic rows) that are **hard to express** in cache alone.
- **Submit path:** **Optimistic** local reserve + `confirm` or **rollback** from mutation result, with a **timeout** and explicit handling of silent/ambiguous success.
- **Reconciliation:** When batch refresh arrives, **if** there is an active optimistic for that cell **and** server `availableDays` **differs** from the slice, set **`needsVerification`** and **do not overwrite** the optimistic row (see §6).
- **Cache:** **Tag-based invalidation** after successful writes; no blanket “refetch everything” on every action (see §4.3–4.4).
- **UI:** **Presentational** cards/forms driven by **selectors and query hooks**; cross-cutting **listeners** own batch→slice merge so components stay thin (see §2.1).

---

## 2. Architecture Overview

The UI talks only to **Next.js Route Handlers** under `/api/hcm/*`, which delegate to a shared **in-memory HCM store** (`src/lib/hcmStore.ts`) for the demo. Production would swap the same HTTP contracts for a real HCM adapter.

**ASCII — runtime layers**

```
+------------------------------------------------------------------+
|                        Browser (React)                            |
|  +------------------+  +------------------+  +------------------+ |
|  | EmployeeDashboard|  | ManagerDashboard|  |  (future pages)  | |
|  +---------+--------+  +---------+---------+  +------------------+ |
|            |                    |                                 |
|            v                    v                                 |
|  +-------------------------------------------------------------+ |
|  |  Redux store (client)                                        | |
|  |  +-------------+  +----------------+  +-------------------+| |
|  |  |  hcmApi     |  | balances slice   |  |  requests slice   || |
|  |  | (RTK Query) |  | (per-loc row +   |  |  (server +         || |
|  |  |             |  |  stale flags)  |  |  optimistic rows)  || |
|  |  +------+------+  +----------------+  +-------------------+| |
|  |         |                  ^                    ^            | |
|  |         |    listener middleware: merge batch, reconciles   | |
|  |         v                  |                    |            | |
|  |  fetchBaseQuery  ----------+--------------------+            | |
|  +---------------------------|----------------------------------+ |
+------------------------------|------------------------------------+
                               |  HTTPS
                               v
+------------------------------------------------------------------+
|  Next.js /api (Route Handlers)                                    |
|  hcm/balances/batch | hcm/balances/:e/:l | hcm/requests/...     |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|  HCM module (in-memory for demo) — hcmStore                      |
+------------------------------------------------------------------+
```

**Key modules**

| Area | Path | Role |
|------|------|------|
| API | `src/app/api/hcm/**` | HTTP contract for batch, single balance, submit, pending, approve/deny, anniversary demo |
| Types | `src/lib/types.ts` | `TimeOffBalance`, `TimeOffRequest`, DTOs |
| Client API | `src/store/hcmApi.ts` | RTK Query: queries + `submitRequest` + approve/deny mutations |
| Listeners | `src/store/hcmQueryListeners.ts` | Fulfilled queries → `reconcileBalance`, `updateBalance`, `replacePendingListFromHcm` |
| UI (employee) | `src/components/employee/*` | `BalanceCard`, `RequestForm`, `RequestStatusBanner`, `EmployeeDashboard` |
| UI (manager) | `src/components/manager/*` | `PendingRequestCard`, `ManagerDashboard` |

### 2.1 Component tree and where concerns live

The React tree is **intentionally shallow in data logic**: most coordination lives in **RTK Query** (`hcmApi`), **listener middleware** (`hcmQueryListeners.ts`), and **slices** (`balances`, `requests`). Components **subscribe** to that state and **fire** mutations; they do **not** implement reconciliation rules by hand.

```
RootLayout
├── MSWProvider (optional: boot browser MSW before children)
└── StoreProvider (Redux + listeners + hcmApi)
    └── app routes (e.g. page with AppShell)
        ├── EmployeeDashboard
        │   ├── useGetBatchBalancesQuery / selectors → merged TimeOffBalance
        │   ├── BalanceCard        ← presentational: stale / syncing / optimistic labels
        │   ├── RequestStatusBanner← optimistic / conflict / terminal statuses
        │   └── RequestForm        ← local form validation, calls submitRequest mutation
        └── ManagerDashboard
            ├── useGetPendingRequestsQuery
            └── for each request: PendingRequestRow
                ├── useGetBalanceQuery (per-row live HCM read)
                └── PendingRequestCard ← snapshot vs live drift, approve / deny
```

| Concern | Where it is implemented (not in leaves) | UI surface |
|--------|------------------------------------------|------------|
| Optimistic submit + rollback | `hcmApi.submitRequest` `onQueryStarted` + `requests` / `balances` reducers | `RequestStatusBanner`, `BalanceCard` |
| Batch poll merge + **reconcile** in-flight | `hcmQueryListeners` on `getBatchBalances.fulfilled` → `reconcileBalance` | `BalanceCard` (`isStale` / `needsVerification`), toast in `EmployeeDashboard` |
| Live balance at approve time | `getBalance` query in `PendingRequestRow` | `PendingRequestCard` |
| **Invalidation** after successful write | `invalidatesTags` in mutations | Triggers refetch; **components do not** call `refetch` for happy path |
| Pending queue merge with optimistic | `replacePendingListFromHcm` on `getPending.fulfilled` | `ManagerDashboard` / employee request lists |

**Principle:** If logic appears in more than one component, it belongs in the **API layer, listeners, or reducers** — not duplicated in the tree.

---

## 3. State Management Decision

### 3.1 Why Redux Toolkit (RTK) + RTK Query

| Requirement | How RTK + RTK Query help |
|-------------|-------------------------|
| **Server cache + mutations** | RTK Query provides normalized caching, `providesTags` / `invalidatesTags`, and mutation lifecycle hooks (`onQueryStarted`). |
| **Cross-cutting optimistic updates** | `onQueryStarted` on `submitRequest` dispatches to **both** `balances` and `requests` slices in one place, with access to `getState` and `queryFulfilled`. |
| **Listeners** | `createListenerMiddleware` cleanly ties `getBatchBalances.matchFulfilled` to `reconcileBalance` without entangling components. |
| **Testability** | Slices are plain reducers; store can be created with `makeStore` and partial preloaded state for tests/Storybook. |
| **Ecosystem** | One vendor for async data + app state, stable DevTools, TypeScript patterns well documented. |

### 3.2 Alternatives Considered

| Option | Why not chosen (for this project) |
|--------|----------------------------------|
| **Zustand** | Smaller and excellent for app-only state, but you would still add **React Query (TanStack Query)** for server data; combining optimistic HCM + tag invalidation + listener-style reconciliation duplicates concepts RTK Query already offers alongside Redux. |
| **React Query (TanStack) alone** | Strong for server state, but **global** “slice” state (stale/verification flags, merged pending + optimistic request lists) either lives in many hook atoms or in React context, making cross-component invariants harder to test in isolation. |
| **SWR** | Similar to RQ: great fetch deduping, less first-class support for **mutation** orchestration, tags, and reducers in one place compared to RTK Query + `configureStore`. |
| **Redux (plain) + thunks** | Workable, but more boilerprint; RTK and RTKQ reduce ceremony and are the recommended path for new apps. |

### 3.3 Tradeoffs

| Advantage | Cost |
|----------|------|
| Single mental model (cache + local reduction rules) | Bundle size and setup heavier than "fetch in component + `useState`" |
| Tag-based invalidation is explicit | Must design tag IDs (`HcmBatch`, `HcmBalance` per key, `HcmPending`) to avoid over/under refetching |
| Listeners decouple HCM from UI | Debugging requires following middleware + matcher order |
| Optimistic `onQueryStarted` is powerful | Must hand-write rollback/confirm paths; mistakes show up as desync (mitigated with tests) |

---

## 4. Data Fetching Strategy

### 4.1 Batch vs real-time (single) balance

| Use case | Endpoint (concept) | Rationale |
|----------|--------------------|-----------|
| **Employee home / dashboard** | `GET /api/hcm/balances/batch` (`getBatchBalances`) | One request loads **all** (demo: all employee×location) balances for overview and polling. Cheaper N:1 for listing cards. |
| **Manager card per request** | `GET /api/hcm/balances/:employeeId/:locationId` (`getBalance`) | One row on screen needs a **fresh** read at **decision** time, independent of whether that pair was in the last batch. |
| **After approve/deny** | Invalidate `HcmBatch` + `HcmPending` + the specific `HcmBalance` tag | Ensures batch cache and the single-balance view refetch. |

**Implementation note:** the demo single-balance response may include `pendingDays` from the in-memory row; the batch DTO in types may be **available-only**; listeners merge `pendingDays` with slice rules where needed.

### 4.2 Polling interval

- **Constant:** `POLL_INTERVAL_MS` / `getBatchBalances` default: **30,000 ms** (see `src/lib/constants.ts` and `hcmApi.ts`).
- **Rationale:** balance data does not need sub-second accuracy for every user; 30s limits load while still surfacing **anniversary bonus**, other approvals, or back-office changes **within a short session** without a manual refresh. Employee dashboard can override with `batchPollingIntervalMs` (e.g. Storybook) for faster demos.
- **Tradeoff:** updates can lag up to one interval; **toast** on batch change and **stale** / **needsVerification** states communicate that lag.

### 4.3 Cache invalidation

| Event | Action |
|-------|--------|
| Successful `submitRequest` | `invalidateTags` on `HcmBatch`, that row’s `HcmBalance`, and `HcmPending` (see `hcmApi.ts`) |
| Approve / deny (success) | Same pattern so lists and single balance refresh |
| Failed mutation (e.g. 409) | No successful result → tags for that mutation path may not list extra invalidations; client shows message and can refetch pending |

RTK Query’s **tags** are the single source of “what to refetch” after a successful write, avoiding ad-hoc `refetch()` from components for the happy path.

### 4.4 Cache invalidation: alternatives considered

| Approach | Description | Verdict for this app |
|----------|--------------|------------------------|
| **A. Global refetch on any mutation** | `refetch` all queries after every action | Rejected: wasteful; batch + pending + N balance keys would multiply traffic; HCM is already “expensive” for batch. |
| **B. Time-to-live (TTL) only, no tags** | Rely on `keepUnusedDataFor` and stale time | Rejected: after a local write, the UI could show **stale** cache until TTL expires; need **event-driven** invalidation after our own mutations. |
| **C. Tag-based invalidation (chosen)** | `providesTags` on queries, `invalidatesTags` on successful `submit` / approve / deny | **Chosen:** after a **successful** HCM-matching write, refetch only **HcmBatch**, **HcmPending**, and the affected **HcmBalance** key. |
| **D. Manual `refetch()` from components** | Each screen calls `refetch` after actions | Rejected: duplicates logic, easy to miss a path, harder to test. |
| **Failed mutations (e.g. 409)** | No `invalidatesTags` on error result | Rely on error UI; user or next navigation can refetch. Optional explicit `refetch` in the component is allowed for recovery. |

### 4.5 Reconciliation vs invalidation (distinct concerns)

- **Invalidation** answers: “**Which** server snapshots are stale after **we** made a **successful** write?”
- **Reconciliation** answers: “When **HCM** (or a poll) gives us **new** batch data while **our** slice has an **in-flight** optimistic, **how** do we merge without clobbering?” That is **`reconcileBalance` + `needsVerification`**, not tag invalidation alone (see §6).

---

## 5. Optimistic Updates Design

### 5.0 Alternatives: pessimistic vs optimistic (decision)

| Criterion | **Pessimistic** (wait for HCM, then update UI) | **Optimistic** (update UI first, align or roll back) |
|----------|-----------------------------------------------|------------------------------------------------------|
| **Perceived latency** | High — user stares at spinner on every submit | Low — form reflects intent immediately |
| **Correctness** | Simple mental model: UI only matches server after response | Must implement **confirm**, **rollback**, **timeout**, **silent-failure** paths |
| **Drift** | No local “pending” until server confirms; less risk of mismatch during request | **Requires** §6 if batch arrives mid-flight |
| **Suitability** | High for low-trust or irreversible financial writes | **Chosen for employee submit** in HR UIs that compete on responsiveness |

**Decision:** **Optimistic** for **submit**; **pessimistic** for **user perception of “done”** is only after HCM **confirms** in the `confirmRequest` path (or we roll back). **Manager approve/deny** is **not** client-optimistic for the manager’s queue: we call the server and only then invalidate tags — the only optimistic behavior is on the **employee** side.

**Hybrid:** Present **optimistic** row + `RequestStatusBanner` “Submitting…” until either **confirm** or **rollback**; that is the agreed **product** tradeoff (see C3 in §1.1).

### 5.1 Why optimistic (not purely pessimistic) for employee submit

- **Pessimistic-only:** user waits 1–3s+ on HCM; feels broken on slow networks.
- **Optimistic (chosen for submit):** reserve days and show **pending** immediately so the form and `BalanceCard` match user intent; then **tighten** with HCM (§5.2–5.3).

### 5.2 Rollback mechanism

Flow in `submitRequest` `onQueryStarted` (`hcmApi.ts`):

1. Read current `availableDays` / `pendingDays` from `balances.byKey[key]`.
2. If not enough available or no row, **exit** (no optimistic).
3. Dispatch `updateBalance` to reserved numbers and `addOptimisticRequest` with a `tempId`.
4. `Promise.race` between `queryFulfilled` and `OPTIMISTIC_TIMEOUT_MS` (**10s** from `src/lib/constants.ts`).
5. On **success** with `request`: `confirmRequest` + `updateBalance` with HCM `newBalance` + `invalidateTags`.
6. On **success** without `request` (silent), **`success: false`**, or **error/timeout**: `rollbackRequest` + `updateBalance` restoring `prevAvail` / `prevPend`.

**Invariant:** after rollback, client balance matches the pre-submit snapshot (best-effort; see HCM silent failures below).

### 5.3 HCM silent failures

| Pattern | API shape (illustrative) | Client behavior |
|---------|-------------------------|-----------------|
| Simulated "silent" success with no `request` | `200` with `success: true` but no `request` in body | Treated as failure path → `rollBack` (code path `success && !data.request`) |
| `success: false` | 200/JSON | Rollback (`rollBack("conflict")` path) |
| Network / parse error | Rejected `queryFulfilled` | `catch` → rollback |
| Timeout | After `OPTIMISTIC_TIMEOUT_MS` | Race rejects → rollback |

**UI:** `RequestStatusBanner` and `EmployeeDashboard` can set **`hcmConflict`** when the user must retry (e.g. mutation error or `!success`).

**Demo HCM** (`hcmStore.submitTimeOffRequest`) randomly simulates silent/conflict; production would map the same client logic to real error codes.

---

## 6. Reconciliation Strategy

This section is the direct answer to: **“How do you reconcile a background refresh with an in-flight user action?”**

### 6.0 Problem statement

- **In-flight user action:** employee has an **optimistic** `availableDays` / `pendingDays` and a **temp** request row in `requests` (from `onQueryStarted`).
- **Background refresh:** `getBatchBalances` poll returns a **new** `availableDays` (e.g. anniversary accrual, or another system changed the same cell).
- **Conflict:** if we **always** applied batch numbers to the slice, we would **wipe** the optimistic delta and the UI would **lie** (or jump). If we **never** applied batch, we would **ignore** real accrual.

### 6.1 Background refresh while the form is open

- `getBatchBalances` **does not** unmount the form; it updates RTK cache and the listener **reconciles** each row.
- `reconcileBalance` (`balancesSlice`) if **`hasActiveOptimistic`** and **server `availableDays` ≠ slice `availableDays`**: set **`needsVerification`** and **do not** overwrite the optimistic numbers (avoids clobbering in-flight state).
- If no active optimistic for that key, the row is **updated** from the server.
- `touchGlobalSync` runs after each batch to update global sync metadata and clear the global **stale** flag for that pass.

**Employee dashboard:** can show **"Balance updated"** toast when batch `availableDays` for the selected pair **changes** (see `EmployeeDashboard` effect comparing previous vs current), without interrupting the form.

### 6.2 Balance changed mid-session (employee)

| Signal | UX |
|--------|-----|
| `balances.isStale` or `needsVerification` on row | `BalanceCard` can show **stale** or verification-driven styling |
| New batch | Toast **"Balance updated"** when the numeric `availableDays` for the current pair changes |
| User is typing | Form remains mounted; they see updated `availableDays` from merged slice + batch (subject to `needsVerification` rules) |

### 6.3 Manager approval re-validation

- **Before decision:** `PendingRequestRow` uses **`getBalanceQuery`** for that employee+location for **live** available/pending in `PendingRequestCard`.
- **Snapshot at submit:** `availableDaysAtSnapshot` on `TimeOffRequest` (set when the request is created in HCM) allows a **"Balance changed since request"** pill when the live read differs.
- **At approve time:** the server’s `approveRequest` in `hcmStore` checks in-memory **pending/available**; if insufficient, returns **409** — the request **remains pending**; client shows an alert and the manager may **deny** or refresh and retry. The UI should refetch **pending** and **balance** after any successful **deny/approve** via tag invalidation.

---

## 7. Edge Cases Handled

| # | Edge case | Handling |
|---|-----------|----------|
| 1 | No balance row in slice for a submit | `onQueryStarted` returns early; no optimistic dispatch |
| 2 | Requested days > available (client) | `RequestForm` disables submit, inline alert |
| 3 | Requested days > available (server) | HCM 422; no optimistic in normal path if client already blocks |
| 4 | HCM success but no `request` (silent) | Rollback; reserves cleared |
| 5 | HCM `success: false` | Rollback; optional conflict banner |
| 6 | Network error / throw | Rollback in `catch` |
| 7 | HCM does not answer within 10s | `OPTIMISTIC_TIMEOUT_MS` race → rollback |
| 8 | Batch refresh during optimistic in-flight and server `availableDays` differ | `reconcileBalance` sets **`needsVerification`**, no blind overwrite |
| 9 | Single-balance read occasionally stale (demo 5% path) | `getBalanceResponseWithMaybeStale` can return a stale payload; `lastSingleReadGood` cache; UI can show stale for single read where wired |
| 10 | Approve with insufficient in-memory state | 409; user message; list refetch for truth |
| 11 | Not found / not pending (approve/deny) | 4xx from API |
| 12 | Manager: balance drift since snapshot | `availableDaysAtSnapshot` vs current → badge in `PendingRequestCard` |
| 13 | Empty pending list | `ManagerDashboard` empty state |
| 14 | Multiple locations in batch | Batch returns multiple `balances[]`; `EmployeeDashboard` picks by `employeeId` + `locationId` |
| 15 | Server pending list + client optimistic not yet in server | `replacePendingListFromHcm` keeps optimistic rows not superseded by server id |

---

## 8. Test Strategy

| Layer | Location (examples) | What it guards |
|-------|---------------------|----------------|
| **Unit — slices** | `src/__tests__/store/requestsSlice.test.ts`, `balancesSlice.test.ts` | Reducers: confirm/rollback, `replacePendingListFromHcm` merge, `reconcileBalance` conflict, `setBalances` pending carry-over, `markStale` / `touchGlobalSync` |
| **Unit — UI** | `src/__tests__/components/BalanceCard.test.tsx`, `RequestForm.test.tsx` | Prop-driven UI: stale, pulse, over-limit, submit payload, loading, error line |
| **Unit — small lib** | `src/__tests__/lib/balanceKey.test.ts` | Key encoding used everywhere for map keys and tags |
| **Integration (MSW)** | `src/__tests__/integration/submitRequest.test.tsx` | Full `hcmApi` + store + `onQueryStarted`: success path, `success: false` rollback, batch reconciliation (e.g. two-step batch) |
| **App-level** (optional) | Route-level or `EmployeeDashboard` smoke | Optional; core coverage is slices + integration |

**Coverage goals (Jest, configured in `jest.config.js`):**

- **Global thresholds:** 80% for statements, lines, and functions; **75%** for branches (branch coverage is harder to saturate on UI code) on the **covered** modules (`collectCoverageFrom` lists: `balancesSlice`, `requestsSlice`, `BalanceCard`, `RequestForm`, `balanceKey`).
- **Rationale:** enforce regression safety on the **highest-churn, highest-risk** code without blocking CI on un-tested demo routes or one-off API files.

**MSW** (`jest.setup.ts` + per-test `server.use`) keeps tests **deterministic** and aligned with production fetch URLs.

---

## 9. Storybook Strategy

**Why Storybook is used as proof of state coverage**

1. **Visual contract:** Cards, forms, and banners are **state machines**; Storybook makes each state (stale, syncing, conflict, empty manager queue) **viewable in isolation** without logging into HCM.
2. **MSW per story:** `msw-storybook-addon` + `parameters.msw.handlers` mirror Jest: the **same** HTTP contract is mocked, reducing “only works in the app” drift.
3. **Interaction tests:** `play` functions in stories (`@storybook/test`) document **expected** a11y roles and key flows (submit disabled, toast after poll, etc.).
4. **Documentation handoff:** Designers and PMs can verify copy and states without running the full Next app; engineers keep stories close to components under `src/stories/`.

Storybook is **not** a replacement for Jest: it is the **visual + interaction catalog**; Jest is the **regression enforcer** for reducers and integration paths.

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-04-24 | Initial TRD from implemented `examplehr-timeoff` |
| 1.1 | 2026-04-25 | §0 Project guides: agentic workflow, mock HCM test harness, per-employee/location; approve 409 copy corrected |
| 1.2 | 2026-04-25 | Shared loading/error UI, `AppShell` nav, Storybook load stories use skeletons (no fake long delays); removed scaffold `TimeoffBalance` + default SB stories |
| 1.3 | 2026-04-25 | Eng Spec: §1.1–1.2 challenges/solution, §2.1 component↔state map, §4.4–4.5 invalidation vs reconciliation, §5.0 optimistic vs pessimistic, §6.0 in-flight + background |
