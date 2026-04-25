import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import { ManagerDashboard } from "@/components/manager/ManagerDashboard";
import type { TimeOffRequest } from "@/lib/types";
import { withAppStore } from "./decorators/withAppStore";

const iso = () => new Date().toISOString();

function sampleRequest(
  overrides: Partial<TimeOffRequest> = {},
): TimeOffRequest {
  return {
    id: "hcm-req-1",
    employeeId: "emp-1",
    locationId: "loc-1",
    requestedDays: 3,
    status: "pending",
    submittedAt: iso(),
    resolvedAt: null,
    optimistic: false,
    availableDaysAtSnapshot: 9,
    ...overrides,
  };
}

function balanceFor(available: number, pending: number) {
  return {
    employeeId: "emp-1",
    locationId: "loc-1",
    availableDays: available,
    pendingDays: pending,
    asOf: iso(),
  };
}

const meta: Meta<typeof ManagerDashboard> = {
  title: "Manager/ManagerDashboard",
  component: ManagerDashboard,
  decorators: [withAppStore],
};

export default meta;
type Story = StoryObj<typeof ManagerDashboard>;

/** Pending queue request never finishes so the skeleton list + aria-busy stay visible. */
export const InitialLoadSkeleton: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () => new Promise(() => {})),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByLabelText("Loading pending requests");
    await expect(region).toBeInTheDocument();
    await expect(region).toHaveAttribute("aria-busy", "true");
  },
};

export const WithPendingRequests: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json({ requests: [sampleRequest()] }),
        ),
        http.get("*/hcm/balances/emp-1/loc-1", () =>
          HttpResponse.json(balanceFor(9, 3)),
        ),
        http.post("*/hcm/requests/hcm-req-1/approve", () =>
          HttpResponse.json({
            request: { ...sampleRequest(), status: "approved" as const },
            newAvailable: 6,
          }),
        ),
        http.post("*/hcm/requests/hcm-req-1/deny", () =>
          HttpResponse.json({
            request: { ...sampleRequest(), status: "denied" as const },
            newAvailable: 12,
          }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(within(canvasElement).getByText("Alex Kim")).toBeInTheDocument();
    });
  },
};

export const BalanceChangedSinceRequest: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json({
            requests: [
              sampleRequest({
                availableDaysAtSnapshot: 5,
              }),
            ],
          }),
        ),
        http.get("*/hcm/balances/emp-1/loc-1", () =>
          HttpResponse.json(balanceFor(10, 3)),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(
        within(canvasElement).getByText(/balance changed since request/i),
      ).toBeInTheDocument();
    });
  },
};

export const EmptyState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json({ requests: [] }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    expect(
      within(canvasElement).getByText(/all caught up/i),
    ).toBeInTheDocument();
  },
};

export const ApprovingRequest: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json({ requests: [sampleRequest()] }),
        ),
        http.get("*/hcm/balances/emp-1/loc-1", () =>
          HttpResponse.json(balanceFor(9, 3)),
        ),
        http.post("*/hcm/requests/hcm-req-1/approve", async () => {
          await delay(3_000);
          return HttpResponse.json({
            request: { ...sampleRequest(), status: "approved" as const },
            newAvailable: 6,
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await waitFor(() => {
      expect(body.getByRole("button", { name: /^approve$/i })).toBeEnabled();
    });
    await userEvent.click(body.getByRole("button", { name: /^approve$/i }));
    expect(body.getByRole("button", { name: /approving/i })).toBeInTheDocument();
  },
};

export const DenyingRequest: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json({ requests: [sampleRequest()] }),
        ),
        http.get("*/hcm/balances/emp-1/loc-1", () =>
          HttpResponse.json(balanceFor(9, 3)),
        ),
        http.post("*/hcm/requests/hcm-req-1/deny", async () => {
          await delay(3_000);
          return HttpResponse.json({
            request: { ...sampleRequest(), status: "denied" as const },
            newAvailable: 12,
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await waitFor(() => {
      expect(body.getByRole("button", { name: /^deny$/i })).toBeEnabled();
    });
    await userEvent.click(body.getByRole("button", { name: /^deny$/i }));
    expect(body.getByRole("button", { name: /denying/i })).toBeInTheDocument();
  },
};

export const ApproveConflict409: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json({ requests: [sampleRequest()] }),
        ),
        http.get("*/hcm/balances/emp-1/loc-1", () =>
          HttpResponse.json(balanceFor(9, 3)),
        ),
        http.post("*/hcm/requests/hcm-req-1/approve", () =>
          HttpResponse.json(
            { error: "Insufficient balance to approve at this time" },
            { status: 409 },
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await waitFor(() => {
      expect(body.getByRole("button", { name: /^approve$/i })).toBeEnabled();
    });
    await userEvent.click(body.getByRole("button", { name: /^approve$/i }));
    await waitFor(() => {
      expect(
        body.getByText(/balance no longer supports this request/i),
      ).toBeInTheDocument();
    });
  },
};

export const PendingListLoadError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json(
            { error: "HCM offline" },
            { status: 502 },
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(
        within(canvasElement).getByText(/could not load pending requests/i),
      ).toBeInTheDocument();
    });
  },
};

/** Single-cell balance request never completes so the inline “live balance” loading state stays visible. */
export const LiveBalanceLoading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/hcm/requests/pending", () =>
          HttpResponse.json({ requests: [sampleRequest()] }),
        ),
        http.get("*/hcm/balances/emp-1/loc-1", () => new Promise(() => {})),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(
        within(canvasElement).getByText(/fetching live balance/i),
      ).toBeInTheDocument();
    });
    expect(
      within(canvasElement).getByLabelText("Loading live balance"),
    ).toBeInTheDocument();
  },
};
