import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { RequestForm } from "@/components/employee/RequestForm";

const submitHandler = () =>
  http.post("*/hcm/requests", async () =>
    HttpResponse.json({
      success: true,
      newBalance: 10,
      request: {
        id: "hcm-req-story",
        employeeId: "emp-1",
        locationId: "loc-1",
        requestedDays: 1,
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
        resolvedAt: null,
        optimistic: false,
      },
    }),
  );

const meta: Meta<typeof RequestForm> = {
  title: "Employee/RequestForm",
  component: RequestForm,
  args: {
    employeeId: "emp-1",
    locationId: "loc-1",
    availableDays: 10,
    onSubmit: fn(),
  },
  parameters: {
    msw: {
      handlers: [submitHandler()],
    },
  },
};

export default meta;
type Story = StoryObj<typeof RequestForm>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement);
    await expect(
      body.getByRole("button", { name: /submit request/i }),
    ).toBeEnabled();
    await userEvent.click(body.getByRole("button", { name: /submit request/i }));
    await waitFor(() => {
      expect(args.onSubmit).toHaveBeenCalled();
    });
  },
};

export const InsufficientBalance: Story = {
  args: {
    availableDays: 2,
    initialRequestedDays: 5,
    onSubmit: fn(),
  },
  parameters: {
    msw: { handlers: [submitHandler()] },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await expect(
      body.getByRole("alert"),
    ).toHaveTextContent(/at most 2 day/);
    await expect(
      body.getByRole("button", { name: /submit request/i }),
    ).toBeDisabled();
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
  parameters: {
    msw: { handlers: [submitHandler()] },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await expect(
      body.getByRole("button", { name: /submitting/i }),
    ).toBeDisabled();
  },
};

export const SubmitError: Story = {
  args: {
    errorMessage:
      "We could not reach the time-off service. Please try again.",
  },
  parameters: {
    msw: {
      handlers: [
        http.post("*/hcm/requests", () =>
          HttpResponse.json(
            { success: false, newBalance: 0, error: "hcm" },
            { status: 200 },
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement);
    await expect(
      body.getByRole("alert"),
    ).toHaveTextContent(/could not reach/i);
  },
};
