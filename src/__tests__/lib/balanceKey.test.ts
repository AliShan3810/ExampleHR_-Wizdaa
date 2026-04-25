import { parseBalanceKey, toBalanceKey } from "@/lib/balanceKey";

describe("balanceKey", () => {
  it("toBalanceKey joins employee and location", () => {
    expect(toBalanceKey("a", "b")).toBe("a__b");
  });

  it("parseBalanceKey splits on separator", () => {
    expect(parseBalanceKey("emp-1__loc-2")).toEqual({
      employeeId: "emp-1",
      locationId: "loc-2",
    });
  });

  it("parseBalanceKey returns whole string as employeeId when no separator", () => {
    expect(parseBalanceKey("nosep")).toEqual({
      employeeId: "nosep",
      locationId: "",
    });
  });
});
