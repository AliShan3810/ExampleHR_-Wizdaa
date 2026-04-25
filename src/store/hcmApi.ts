import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  HCMBatchResponse,
  HCMBalanceResponse,
  HCMWriteResponse,
  TimeOffRequest,
} from "@/lib/types";
import { toBalanceKey } from "@/lib/balanceKey";
import { OPTIMISTIC_TIMEOUT_MS } from "@/lib/constants";
import { updateBalance } from "./balancesSlice";
import {
  addOptimisticRequest,
  confirmRequest,
  rollbackRequest,
} from "./requestsSlice";
import type { BalancesState } from "./balancesSlice";

function apiBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api/`;
  }
  return "http://localhost:3000/api/";
}

type SubmitRequestArg = {
  employeeId: string;
  locationId: string;
  requestedDays: number;
};

export type SubmitRequestResult = HCMWriteResponse & {
  request?: TimeOffRequest;
};

type ApproveDenyResult = {
  request: TimeOffRequest;
  newAvailable: number;
};

type BalancesAccess = { balances: BalancesState };

export const hcmApi = createApi({
  reducerPath: "hcmApi",
  baseQuery: fetchBaseQuery({ baseUrl: apiBaseUrl() }),
  tagTypes: ["HcmBatch", "HcmBalance", "HcmPending"] as const,
  endpoints: (build) => ({
    getBatchBalances: build.query<HCMBatchResponse, void>({
      query: () => "hcm/balances/batch",
      keepUnusedDataFor: 60,
      providesTags: [{ type: "HcmBatch" as const, id: "ALL" }],
      // Supported at runtime (SubscriptionOptions on endpoint) — see RTK Query "polling"
      // @ts-expect-error -- pollingInterval is a valid per-endpoint default in RTK Query
      pollingInterval: 30_000,
    }),
    getBalance: build.query<
      HCMBalanceResponse,
      { employeeId: string; locationId: string }
    >({
      query: ({ employeeId, locationId }) =>
        `hcm/balances/${employeeId}/${locationId}`,
      providesTags: (_r, _e, arg) => [
        {
          type: "HcmBalance" as const,
          id: toBalanceKey(arg.employeeId, arg.locationId),
        },
      ],
    }),
    getPendingRequests: build.query<
      { requests: TimeOffRequest[] },
      void
    >({
      query: () => "hcm/requests/pending",
      providesTags: [{ type: "HcmPending" as const, id: "LIST" }],
    }),
    submitRequest: build.mutation<SubmitRequestResult, SubmitRequestArg>({
      query: (body) => ({
        url: "hcm/requests",
        method: "POST",
        body,
      }),
      onQueryStarted: async (arg, { dispatch, getState, queryFulfilled }) => {
        const key = toBalanceKey(arg.employeeId, arg.locationId);
        const { balances } = getState() as unknown as BalancesAccess;
        const row = balances.byKey[key];
        if (!row) {
          return;
        }

        const prevAvail = row.availableDays;
        const prevPend = row.pendingDays;
        if (arg.requestedDays > prevAvail) {
          return;
        }

        const nextAvail = prevAvail - arg.requestedDays;
        const nextPend = prevPend + arg.requestedDays;
        const tempId = `opt-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2, 10)}`;
        const submittedAt = new Date().toISOString();

        dispatch(
          updateBalance({
            key,
            employeeId: arg.employeeId,
            locationId: arg.locationId,
            availableDays: nextAvail,
            pendingDays: nextPend,
            lastSyncedAt: submittedAt,
          }),
        );
        dispatch(
          addOptimisticRequest({
            tempId,
            employeeId: arg.employeeId,
            locationId: arg.locationId,
            requestedDays: arg.requestedDays,
            submittedAt,
          }),
        );

        const rollBack = (reason: string) => {
          void reason;
          dispatch(rollbackRequest({ tempId }));
          dispatch(
            updateBalance({
              key,
              employeeId: arg.employeeId,
              locationId: arg.locationId,
              availableDays: prevAvail,
              pendingDays: prevPend,
              lastSyncedAt: new Date().toISOString(),
            }),
          );
        };

        const timeoutP = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("OPTIMISTIC_TIMEOUT"));
          }, OPTIMISTIC_TIMEOUT_MS);
        });

        try {
          const { data } = (await Promise.race([
            queryFulfilled,
            timeoutP,
          ])) as { data: SubmitRequestResult };

          if (data.success && data.request) {
            dispatch(confirmRequest({ tempId, realRequest: data.request }));
            dispatch(
              updateBalance({
                key,
                employeeId: arg.employeeId,
                locationId: arg.locationId,
                availableDays: data.newBalance,
                pendingDays: nextPend,
                lastSyncedAt: new Date().toISOString(),
                clearNeedsVerification: true,
              }),
            );
            dispatch(
              hcmApi.util.invalidateTags([
                { type: "HcmBatch" as const, id: "ALL" },
                { type: "HcmBalance" as const, id: key },
                { type: "HcmPending" as const, id: "LIST" },
              ]),
            );
            return;
          }
          if (data.success && !data.request) {
            rollBack("silent");
            return;
          }
          rollBack("conflict");
        } catch {
          rollBack("error");
        }
      },
    }),
    approveRequest: build.mutation<ApproveDenyResult, { requestId: string }>({
      query: ({ requestId }) => ({
        url: `hcm/requests/${requestId}/approve`,
        method: "POST",
      }),
      invalidatesTags: (result) => {
        const common = [
          { type: "HcmBatch" as const, id: "ALL" },
          { type: "HcmPending" as const, id: "LIST" },
        ] as const;
        if (result) {
          const k = toBalanceKey(
            result.request.employeeId,
            result.request.locationId,
          );
          return [...common, { type: "HcmBalance" as const, id: k }];
        }
        return common;
      },
    }),
    denyRequest: build.mutation<ApproveDenyResult, { requestId: string }>({
      query: ({ requestId }) => ({
        url: `hcm/requests/${requestId}/deny`,
        method: "POST",
      }),
      invalidatesTags: (result) => {
        const common = [
          { type: "HcmBatch" as const, id: "ALL" },
          { type: "HcmPending" as const, id: "LIST" },
        ] as const;
        if (result) {
          const k = toBalanceKey(
            result.request.employeeId,
            result.request.locationId,
          );
          return [...common, { type: "HcmBalance" as const, id: k }];
        }
        return common;
      },
    }),
  }),
});

export const {
  useGetBatchBalancesQuery,
  useGetBalanceQuery,
  useGetPendingRequestsQuery,
  useSubmitRequestMutation,
  useApproveRequestMutation,
  useDenyRequestMutation,
} = hcmApi;
