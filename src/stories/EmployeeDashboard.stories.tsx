import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import { EmployeeDashboard } from "@/components/employee/EmployeeDashboard";
import { toBalanceKey } from "@/lib/balanceKey";
import type { StorePreloaded } from "@/store";
import { withAppStore } from "./decorators/withAppStore";

const iso = () => new Date().toISOString();

function batchBody(availableEmp1Loc1: number) {
  return {
    balances: [
      {
        employeeId: "emp-1",
        locationId: "loc-1",
        availableDays: availableEmp1Loc1,
        asOf: iso(),
      },
      {
        employeeId: "emp-1",
        locationId: "loc-2",
        availableDays: 14,
        asOf: iso(),
      },
    ],
  };
}

const key = toBalanceKey("emp-1", "loc-1");

const optimisticPreload: StorePreloaded = {
  balances: {
    byKey: {
      [key]: {
        employeeId: "emp-1",
        locationId: "loc-1",
        availableDays: 7,
        pendingDays: 3,
        lastSyncedAt: iso(),
      },
    },
    lastSyncedAt: iso(),
    isStale: false,
  },
  requests: {
    requests: [
      {
        id: "opt-1",
        employeeId: "emp-1",
        locationId: "loc-1",
        requestedDays: 3,
        status: "pending",
        submittedAt: iso(),
        resolvedAt: null,
        optimistic: true,
      },
    ],
    optimisticByTempId: {
      "opt-1": {
        tempId: "opt-1",
        employeeId: "emp-1",
        locationId: "loc-1",
        requestedDays: 3,
        submittedAt: iso(),
      },
    },
  },
};

const stalePreload: StorePreloaded = {
  balances: {
    byKey: {
      [key]: {
        employeeId: "emp-1",
        locationId: "loc-1",
        availableDays: 10,
        pendingDays: 0,
        lastSyncedAt: iso(),
      },
    },
    lastSyncedAt: iso(),
    isStale: true,
  },
  requests: {
    requests: [],
    optimisticByTempId: {},
  },
};

/** Batch disagrees with optimistic local numbers — same signal as `reconcileBalance` with active optimistic. */
const needsVerificationPreload: StorePreloaded = {
  balances: {
    byKey: {
      [key]: {
        employeeId: "emp-1",
        locationId: "loc-1",
        availableDays: 5,
        pendingDays: 3,
        lastSyncedAt: iso(),
        needsVerification: true,
      },
    },
    lastSyncedAt: iso(),
    isStale: false,
  },
  requests: {
    requests: [
      {
        id: "opt-1",
        employeeId: "emp-1",
        locationId: "loc-1",
        requestedDays: 3,
        status: "pending" as const,
        submittedAt: iso(),
        resolvedAt: null,
        optimistic: true,
      },
    ],
    optimisticByTempId: {
      "opt-1": {
        tempId: "opt-1",
        employeeId: "emp-1",
        locationId: "loc-1",
        requestedDays: 3,
        submittedAt: iso(),
      },
    },
  },
};

function createPollingBatchHandler() {
  let n = 0;
  return http.get("*/hcm/balances/batch", () => {
    n += 1;
    const avail = n === 1 ? 12 : 22;
    return HttpResponse.json(batchBody(avail));
  });
}

const submitOk = () =>
  http.post("*/hcm/requests", () =>
    HttpResponse.json({
      success: true,
      newBalance: 8,
      request: {
        id: "hcm-req-sb",
        employeeId: "emp-1",
        locationId: "loc-1",
        requestedDays: 1,
        status: "pending" as const,
        submittedAt: iso(),
        resolvedAt: null,
        optimistic: false,
        availableDaysAtSnapshot: 8,
      },
    }),
  );

const meta: Meta<typeof EmployeeDashboard> = {
  title: "Employee/EmployeeDashboard",
  component: EmployeeDashboard,
  decorators: [withAppStore],
  args: {
    employeeId: "emp-1",
    locationId: "loc-1",
  },
};

export default meta;
type Story = StoryObj<typeof EmployeeDashboard>;

/** Intentionally never resolves the batch call so the skeleton + aria-busy state stay visible. */
export const InitialLoadSkeleton: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", () => new Promise(() => {})),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByLabelText("Loading balances");
    await expect(region).toBeInTheDocument();
    await expect(region).toHaveAttribute("aria-busy", "true");
  },
};

export const Loaded: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", () =>
          HttpResponse.json(batchBody(14)),
        ),
        submitOk(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(within(canvasElement).getByText("14")).toBeInTheDocument();
    });
    expect(
      within(canvasElement).getByRole("heading", { name: /request time off/i }),
    ).toBeInTheDocument();
  },
};

export const StaleDataWarning: Story = {
  parameters: {
    preloadedState: stalePreload,
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", async () => {
          await delay(20_000);
          return HttpResponse.json(batchBody(10));
        }),
        submitOk(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    // Assert before batch refetch clears the stale flag via the query listener
    expect(
      within(canvasElement).getByText(/balance may be outdated/i),
    ).toBeInTheDocument();
  },
};

export const BalanceRefreshedMidSession: Story = {
  args: {
    batchPollingIntervalMs: 3000,
  },
  parameters: {
    msw: {
      handlers: [createPollingBatchHandler(), submitOk()],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(within(canvasElement).getByText("12")).toBeInTheDocument();
    });
    await waitFor(
      () => {
        expect(
          within(canvasElement).getByText(/balance updated/i),
        ).toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  },
};

export const HCMSilentFailure: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", () =>
          HttpResponse.json(batchBody(12)),
        ),
        http.post("*/hcm/requests", () =>
          HttpResponse.json({ success: false, newBalance: 0 }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(
        within(canvasElement).getByRole("heading", { name: /request time off/i }),
      ).toBeInTheDocument();
    });
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /submit request/i }),
    );
    await waitFor(() => {
      expect(
        within(canvasElement).getByText(/could not complete request/i),
      ).toBeInTheDocument();
    });
  },
};

/** 200 + `success: true` but no `request` body — HCM “silent” no-op; client must roll back and warn. */
export const HCMSilentSuccessWithoutRequest: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", () =>
          HttpResponse.json(batchBody(12)),
        ),
        http.post("*/hcm/requests", () =>
          HttpResponse.json({ success: true, newBalance: 12 }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await waitFor(() => {
      expect(
        body.getByRole("heading", { name: /request time off/i }),
      ).toBeInTheDocument();
    });
    await userEvent.click(
      body.getByRole("button", { name: /submit request/i }),
    );
    await waitFor(() => {
      expect(
        body.getByText(/could not complete request/i),
      ).toBeInTheDocument();
    });
  },
};

export const ReconcileNeedsVerification: Story = {
  parameters: {
    preloadedState: needsVerificationPreload,
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", () =>
          HttpResponse.json(batchBody(7)),
        ),
        submitOk(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    expect(
      within(canvasElement).getByText(/balance may be outdated/i),
    ).toBeInTheDocument();
    expect(within(canvasElement).getByText("(pending)")).toBeInTheDocument();
  },
};

export const NoBalanceForEmployeeLocation: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", () =>
          HttpResponse.json({ balances: [] }),
        ),
        submitOk(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(
        within(canvasElement).getByText(/no balance found/i),
      ).toBeInTheDocument();
    });
  },
};

export const OptimisticUpdateInFlight: Story = {
  parameters: {
    preloadedState: optimisticPreload,
    msw: {
      handlers: [
        http.get("*/hcm/balances/batch", () =>
          HttpResponse.json(batchBody(7)),
        ),
        submitOk(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(
        within(canvasElement).getByText(/submitting your request/i),
      ).toBeInTheDocument();
    });
    expect(within(canvasElement).getByText("(pending)")).toBeInTheDocument();
  },
};
