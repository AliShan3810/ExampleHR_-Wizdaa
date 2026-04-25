import { NextResponse } from "next/server";
import { applyAnniversaryBonus } from "@/lib/hcmStore";

type Body = { employeeId: string; locationId: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.employeeId || !body?.locationId) {
    return NextResponse.json(
      { error: "employeeId and locationId required" },
      { status: 400 },
    );
  }
  const result = applyAnniversaryBonus(body.employeeId, body.locationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    bonusDays: 5,
    newAvailable: result.newBalance,
  });
}
