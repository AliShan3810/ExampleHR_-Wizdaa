import { render, screen } from "@testing-library/react";
import { BalanceCard } from "@/components/employee/BalanceCard";
import type { TimeOffBalance } from "@/lib/types";

const base: TimeOffBalance = {
  employeeId: "e",
  locationId: "l",
  availableDays: 8,
  pendingDays: 2,
  lastSyncedAt: "2020-01-01T00:00:00.000Z",
};

describe("BalanceCard", () => {
  it("renders available and pending day counts", () => {
    render(
      <BalanceCard
        balance={base}
        isStale={false}
        isSyncing={false}
        locationName="Test Location"
      />,
    );
    expect(screen.getByText("Test Location")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows stale warning when isStale is true", () => {
    render(
      <BalanceCard
        balance={base}
        isStale
        isSyncing={false}
        locationName="HQ"
      />,
    );
    expect(
      screen.getByText("Balance may be outdated"),
    ).toBeInTheDocument();
  });

  it("applies pulse animation to numbers when isSyncing is true", () => {
    const { container } = render(
      <BalanceCard
        balance={base}
        isStale={false}
        isSyncing
        locationName="HQ"
      />,
    );
    const withPulse = container.querySelectorAll(".animate-pulse");
    expect(withPulse.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the optimistic pending label only when flag is on and pending > 0", () => {
    const { rerender } = render(
      <BalanceCard
        balance={{ ...base, pendingDays: 0 }}
        isStale={false}
        isSyncing={false}
        locationName="HQ"
        optimisticPending
      />,
    );
    expect(screen.queryByText("(pending)")).not.toBeInTheDocument();
    rerender(
      <BalanceCard
        balance={{ ...base, pendingDays: 1 }}
        isStale={false}
        isSyncing={false}
        locationName="HQ"
        optimisticPending
      />,
    );
    expect(screen.getByText("(pending)")).toBeInTheDocument();
  });
});
