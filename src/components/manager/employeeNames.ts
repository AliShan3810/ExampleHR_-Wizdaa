/** Demo display names for HCM employee ids */
export const EMPLOYEE_NAMES: Record<string, string> = {
  "emp-1": "Alex Kim",
  "emp-2": "Jordan Lee",
  "emp-3": "Sam Rivera",
};

export function getEmployeeName(employeeId: string) {
  return EMPLOYEE_NAMES[employeeId] ?? employeeId;
}
