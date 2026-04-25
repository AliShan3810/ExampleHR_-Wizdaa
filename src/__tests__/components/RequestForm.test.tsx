import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestForm } from "@/components/employee/RequestForm";

describe("RequestForm", () => {
  it("disables submit when requestedDays exceeds availableDays", () => {
    const onSubmit = jest.fn();
    render(
      <RequestForm
        employeeId="e1"
        locationId="l1"
        availableDays={2}
        initialRequestedDays={4}
        onSubmit={onSubmit}
      />,
    );
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/at most 2 day/);
    expect(screen.getByRole("button", { name: /submit request/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the expected payload on valid submit", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <RequestForm
        employeeId="e1"
        locationId="l1"
        availableDays={10}
        initialRequestedDays={3}
        onSubmit={onSubmit}
      />,
    );
    await user.type(
      screen.getByRole("textbox", { name: /reason/i }),
      " PTO",
    );
    await user.click(screen.getByRole("button", { name: /submit request/i }));
    const call = onSubmit.mock.calls[0]![0] as {
      requestedDays: number;
      reason?: string;
      startDate: string;
      endDate: string;
    };
    expect(call.requestedDays).toBe(3);
    expect(call.reason).toBe("PTO");
  });

  it("shows loading label while submitting", () => {
    render(
      <RequestForm
        employeeId="e1"
        locationId="l1"
        availableDays={5}
        isSubmitting
        onSubmit={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /submitting/i }),
    ).toBeInTheDocument();
  });

  it("shows errorMessage when provided", () => {
    render(
      <RequestForm
        employeeId="e1"
        locationId="l1"
        availableDays={5}
        errorMessage="Something went wrong"
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("bumping start date after end co-moves the end date", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <RequestForm
        employeeId="e1"
        locationId="l1"
        availableDays={5}
        onSubmit={onSubmit}
      />,
    );
    const from = screen.getByLabelText(/^from$/i) as HTMLInputElement;
    const to = screen.getByLabelText(/^to$/i) as HTMLInputElement;
    await user.clear(from);
    await user.type(from, "2030-06-10");
    expect(to.value).toBe("2030-06-10");
  });
});
