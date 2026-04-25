import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TimeOffRequest, TimeOffRequestStatus } from "@/lib/types";

export type OptimisticRequestEntry = {
  tempId: string;
  employeeId: string;
  locationId: string;
  requestedDays: number;
  submittedAt: string;
};

export type RequestsState = {
  /** Server-merged + optimistic pending rows */
  requests: TimeOffRequest[];
  /** In-flight optimistic submits keyed by tempId */
  optimisticByTempId: Record<string, OptimisticRequestEntry>;
};

const initialState: RequestsState = {
  requests: [],
  optimisticByTempId: {},
};

const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    /** Merge GET /api/hcm/requests/pending result with in-flight optimistics */
    replacePendingListFromHcm(
      state,
      action: PayloadAction<TimeOffRequest[]>,
    ) {
      const server = action.payload;
      const optimistic = state.requests.filter(
        (r) => r.optimistic && r.status === "pending",
      );
      const serverIds = new Set(server.map((r) => r.id));
      const stillOptimistic = optimistic.filter((o) => !serverIds.has(o.id));
      state.requests = mergeUniqueById([...server, ...stillOptimistic]);
    },
    addOptimisticRequest(
      state,
      action: PayloadAction<{
        tempId: string;
        employeeId: string;
        locationId: string;
        requestedDays: number;
        submittedAt: string;
      }>,
    ) {
      const p = action.payload;
      state.optimisticByTempId[p.tempId] = { ...p };
      const tr: TimeOffRequest = {
        id: p.tempId,
        employeeId: p.employeeId,
        locationId: p.locationId,
        requestedDays: p.requestedDays,
        status: "pending",
        submittedAt: p.submittedAt,
        resolvedAt: null,
        optimistic: true,
      };
      state.requests = mergeUniqueById([...state.requests, tr]);
    },
    confirmRequest(
      state,
      action: PayloadAction<{ tempId: string; realRequest: TimeOffRequest }>,
    ) {
      const { tempId, realRequest } = action.payload;
      delete state.optimisticByTempId[tempId];
      state.requests = mergeUniqueById(
        state.requests
          .filter((r) => r.id !== tempId)
          .concat([{ ...realRequest, optimistic: false }]),
      );
    },
    rollbackRequest(state, action: PayloadAction<{ tempId: string }>) {
      const { tempId } = action.payload;
      delete state.optimisticByTempId[tempId];
      state.requests = state.requests.filter((r) => r.id !== tempId);
    },
    updateRequestStatus(
      state,
      action: PayloadAction<{
        id: string;
        status: TimeOffRequestStatus;
        resolvedAt?: string | null;
        optimistic?: boolean;
      }>,
    ) {
      const r = state.requests.find((x) => x.id === action.payload.id);
      if (r) {
        r.status = action.payload.status;
        if (action.payload.resolvedAt !== undefined) {
          r.resolvedAt = action.payload.resolvedAt;
        }
        if (action.payload.optimistic !== undefined) {
          r.optimistic = action.payload.optimistic;
        }
      }
    },
  },
});

function mergeUniqueById(list: TimeOffRequest[]): TimeOffRequest[] {
  const map = new Map<string, TimeOffRequest>();
  for (const r of list) {
    map.set(r.id, r);
  }
  return Array.from(map.values());
}

export const {
  replacePendingListFromHcm,
  addOptimisticRequest,
  confirmRequest,
  rollbackRequest,
  updateRequestStatus,
} = requestsSlice.actions;
export const requestsRootReducer = requestsSlice.reducer;
