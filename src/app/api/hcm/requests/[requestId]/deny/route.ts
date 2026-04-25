import { NextResponse } from "next/server";
import { denyRequest } from "@/lib/hcmStore";

type Ctx = { params: { requestId: string } };

export async function POST(_request: Request, { params }: Ctx) {
  const { requestId } = params;
  const result = denyRequest(requestId);
  if (result.kind === 404) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }
  if (result.kind === 400) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({
    request: result.request,
    newAvailable: result.newAvailable,
  });
}
