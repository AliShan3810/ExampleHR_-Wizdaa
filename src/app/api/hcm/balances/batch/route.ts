import { NextResponse } from "next/server";
import type { HCMBatchResponse, HCMBalanceResponse } from "@/lib/types";
import { getAllBalancesArray, sleep, toHCMBalanceResponse } from "@/lib/hcmStore";

export async function GET() {
  await sleep(800);
  if (Math.random() < 0.1) {
    return NextResponse.json(
      { error: "HCM batch service temporarily unavailable" },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const balances: HCMBalanceResponse[] = getAllBalancesArray().map((b) => {
    const r = toHCMBalanceResponse(b);
    return { ...r, asOf: now };
  });
  const body: HCMBatchResponse = { balances };
  return NextResponse.json(body);
}
