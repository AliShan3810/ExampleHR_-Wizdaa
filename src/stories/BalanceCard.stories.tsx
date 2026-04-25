import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { BalanceCard } from "@/components/employee/BalanceCard";
import type { TimeOffBalance } from "@/lib/types";
import { http, HttpResponse } from "msw";

const asOf = () => new Date().toISOString();

const baseBalance: TimeOffBalance = {
  employeeId: "emp-1",
  locationId: "loc-1",
  availableDays: 12,
  pendingDays: 2,
  lastSyncedAt: asOf(),
};

const balanceApiHandler = () =>
  http.get("*/hcm/balances/emp-1/loc-1", () =>
    HttpResponse.json({
      employeeId: "emp-1",
      locationId: "loc-1",
      availableDays: 12,
      pendingDays: 2,
      asOf: asOf(),
    }),
  );

const meta: Meta<typeof BalanceCard> = {
  title: "Employee/BalanceCard",
  component: BalanceCard,
  parameters: {
    msw: {
      handlers: [balanceApiHandler()],
    },
  },
};

export default meta;
type Story = StoryObj<typeof BalanceCard>;

export const Default: Story = {
  args: {
    balance: { ...baseBalance, availableDays: 12, pendingDays: 2 },
    isStale: false,
    isSyncing: false,
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await expect(body.getByText("Headquarters")).toBeInTheDocument();
    await expect(body.getByText("12")).toBeInTheDocument();
  },
};

export const StaleBalance: Story = {
  args: {
    ...Default.args,
    isStale: true,
  },
  parameters: {
    msw: { handlers: [balanceApiHandler()] },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await expect(
      body.getByText("Balance may be outdated"),
    ).toBeInTheDocument();
  },
};

export const SyncingBalance: Story = {
  args: {
    ...Default.args,
    isSyncing: true,
  },
  parameters: {
    msw: { handlers: [balanceApiHandler()] },
  },
  play: async ({ canvasElement }) => {
    const el = within(canvasElement).getByText("12");
    await expect(el.className).toMatch(/animate-pulse/);
  },
};

export const OptimisticPending: Story = {
  args: {
    balance: { ...baseBalance, availableDays: 8, pendingDays: 3 },
    isStale: false,
    isSyncing: false,
    optimisticPending: true,
  },
  parameters: {
    msw: { handlers: [balanceApiHandler()] },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await expect(body.getByText("(pending)")).toBeInTheDocument();
  },
};

export const ZeroBalance: Story = {
  args: {
    balance: { ...baseBalance, availableDays: 0, pendingDays: 0 },
    isStale: false,
    isSyncing: false,
  },
  parameters: {
    msw: { handlers: [balanceApiHandler()] },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    const zeros = body.getAllByText("0");
    await expect(zeros.length).toBeGreaterThanOrEqual(1);
  },
};
