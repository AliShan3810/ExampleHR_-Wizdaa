export type Employee = {
  id: string;
  name: string;
  email: string;
  locationIds: string[];
};

export type Location = {
  id: string;
  name: string;
};

export type TimeOffBalance = {
  employeeId: string;
  locationId: string;
  availableDays: number;
  pendingDays: number;
  lastSyncedAt: string;
};

export type TimeOffRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "rolled_back";

export type TimeOffRequest = {
  id: string;
  employeeId: string;
  locationId: string;
  requestedDays: number;
  status: TimeOffRequestStatus;
  submittedAt: string;
  resolvedAt: string | null;
  optimistic: boolean;
  /** Set when the HCM request is created; used to detect balance drift in manager UI. */
  availableDaysAtSnapshot?: number;
};

export type HCMBalanceResponse = {
  employeeId: string;
  locationId: string;
  availableDays: number;
  asOf: string;
  /** Included on single-balance read from the in-memory HCM row. */
  pendingDays?: number;
};

export type HCMBatchResponse = {
  balances: HCMBalanceResponse[];
};

export type HCMWriteResponse = {
  success: boolean;
  newBalance: number;
  error?: string;
};
