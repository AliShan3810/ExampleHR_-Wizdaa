import { NextResponse } from "next/server";
import { listPendingRequests } from "@/lib/hcmStore";

export async function GET() {
  const pending = listPendingRequests();
  return NextResponse.json({ requests: pending });
}
