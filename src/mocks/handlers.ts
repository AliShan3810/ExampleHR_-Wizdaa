import { http, HttpResponse } from "msw";
import type { HCMBalanceResponse, HCMBatchResponse } from "@/lib/types";

const asOf = () => new Date().toISOString();

const demoBalance: HCMBalanceResponse = {
  employeeId: "emp-1",
  locationId: "loc-1",
  availableDays: 15,
  asOf: asOf(),
};

const batchBody: HCMBatchResponse = {
  balances: [
    demoBalance,
    {
      employeeId: "emp-1",
      locationId: "loc-2",
      availableDays: 15,
      asOf: asOf(),
    },
  ],
};

export const handlers = [
  http.get("*/api/hcm/balances/batch", () => HttpResponse.json(batchBody)),
  http.get("http://localhost:3000/api/hcm/balances/batch", () =>
    HttpResponse.json(batchBody),
  ),
  http.get("*/api/hcm/balances/emp-1/loc-1", () =>
    HttpResponse.json({ ...demoBalance, asOf: asOf() }),
  ),
  http.get("http://localhost:3000/api/hcm/balances/emp-1/loc-1", () =>
    HttpResponse.json({ ...demoBalance, asOf: asOf() }),
  ),
  http.get("http://localhost/api/hcm/balances/emp-1/loc-1", () =>
    HttpResponse.json({ ...demoBalance, asOf: asOf() }),
  ),
];
