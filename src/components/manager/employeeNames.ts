/** Demo display names for HCM employee ids */
export const EMPLOYEE_NAMES: Record<string, string> = {
  "emp-1": "Alex Kim",
  "emp-2": "Jordan Lee",
  "emp-3": "Sam Rivera",
};

export function getEmployeeName(employeeId: string) {
  return EMPLOYEE_NAMES[employeeId] ?? employeeId;
}

/** Two-letter avatar initials from display name. */
export function getEmployeeInitials(employeeId: string) {
  const name = getEmployeeName(employeeId);
  if (name === employeeId) {
    return name.slice(0, 2).toUpperCase();
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
