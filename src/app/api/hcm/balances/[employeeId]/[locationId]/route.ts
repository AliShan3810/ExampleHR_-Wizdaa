import { NextResponse } from "next/server";
import { getBalanceResponseWithMaybeStale, sleep } from "@/lib/hcmStore";

type Ctx = { params: { employeeId: string; locationId: string } };

export async function GET(_request: Request, { params }: Ctx) {
  await sleep(200);
  const { employeeId, locationId } = params;
  const out = getBalanceResponseWithMaybeStale(employeeId, locationId);
  if (!out) {
    return NextResponse.json({ error: "Balance not found" }, { status: 404 });
  }
  return NextResponse.json(out.response, { status: out.httpStatus });
}
