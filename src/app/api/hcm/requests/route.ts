import { NextResponse } from "next/server";
import type { HCMWriteResponse } from "@/lib/types";
import { submitTimeOffRequest } from "@/lib/hcmStore";

export async function POST(request: Request) {
  let body: { employeeId?: string; locationId?: string; requestedDays?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = submitTimeOffRequest({
    employeeId: body.employeeId ?? "",
    locationId: body.locationId ?? "",
    requestedDays: body.requestedDays ?? NaN,
  });

  if (result.kind === 422) {
    return NextResponse.json({ error: result.message }, { status: 422 });
  }

  if (result.kind === "silent_nothing") {
    const write: HCMWriteResponse = {
      success: true,
      newBalance: result.currentAvailable,
    };
    return NextResponse.json(write, { status: 200 });
  }

  if (result.kind === "conflict_200") {
    const write: HCMWriteResponse = {
      success: false,
      newBalance: result.currentAvailable,
      error: result.message,
    };
    return NextResponse.json(write, { status: 200 });
  }

  const write: HCMWriteResponse = {
    success: true,
    newBalance: result.write.newBalance,
  };
  return NextResponse.json(
    { ...write, request: result.request },
    { status: 200 },
  );
}
