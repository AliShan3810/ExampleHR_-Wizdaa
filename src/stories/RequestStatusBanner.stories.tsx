import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { RequestStatusBanner } from "@/components/employee/RequestStatusBanner";
import type { TimeOffRequest } from "@/lib/types";

const baseRequest: TimeOffRequest = {
  id: "r1",
  employeeId: "emp-1",
  locationId: "loc-1",
  requestedDays: 2,
  status: "pending",
  submittedAt: new Date().toISOString(),
  resolvedAt: null,
  optimistic: false,
};

const noopMsw = () =>
  http.get("*/hcm/requests/pending", () =>
    HttpResponse.json({ requests: [] as TimeOffRequest[] }),
  );

const meta: Meta<typeof RequestStatusBanner> = {
  title: "Employee/RequestStatusBanner",
  component: RequestStatusBanner,
  parameters: {
    msw: {
      handlers: [noopMsw()],
    },
  },
};

export default meta;
type Story = StoryObj<typeof RequestStatusBanner>;

export const OptimisticPending: Story = {
  args: {
    request: {
      ...baseRequest,
      optimistic: true,
      status: "pending",
    },
    hcmConflict: false,
  },
  parameters: { msw: { handlers: [noopMsw()] } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/submitting your request/i),
    ).toBeInTheDocument();
  },
};

export const Approved: Story = {
  args: {
    request: { ...baseRequest, status: "approved", optimistic: false },
  },
  parameters: { msw: { handlers: [noopMsw()] } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/request approved/i),
    ).toBeInTheDocument();
  },
};

export const Denied: Story = {
  args: {
    request: { ...baseRequest, status: "denied", optimistic: false },
  },
  parameters: { msw: { handlers: [noopMsw()] } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/request denied/i),
    ).toBeInTheDocument();
  },
};

export const RolledBack: Story = {
  args: {
    request: {
      ...baseRequest,
      status: "rolled_back",
      optimistic: false,
    },
  },
  parameters: { msw: { handlers: [noopMsw()] } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/balance has been restored/i),
    ).toBeInTheDocument();
  },
};

export const HCMConflict: Story = {
  args: {
    request: null,
    hcmConflict: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.post("*/hcm/requests", () =>
          HttpResponse.json({ success: false, newBalance: 0 }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/could not complete request/i),
    ).toBeInTheDocument();
  },
};
