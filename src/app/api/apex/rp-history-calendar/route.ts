/**
 * Server-only Account History endpoint for day-by-day RP calendar data.
 * It reads the durable RP history store without exposing the Apex API key.
 */

import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/app/api/_shared/api-request-guard";
import { getRpHistoryCalendar } from "@/features/rp-history/server/rp-history-service";
import { normalizeApexPlatform } from "@/integrations/apex-legends-status/player-rank-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeMonthKey(value: string | null) {
  return /^\d{4}-\d{2}$/.test(value ?? "") ? value as string : undefined;
}

export async function GET(request: NextRequest) {
  const guarded = guardApiRequest(request, {
    limit: 80,
    routeKey: "rp-history-calendar",
    windowMs: 60_000,
  });
  if (guarded) return guarded;

  const player = request.nextUrl.searchParams.get("player")?.trim();
  const platform = normalizeApexPlatform(request.nextUrl.searchParams.get("platform"));
  const month = normalizeMonthKey(request.nextUrl.searchParams.get("month"));

  if (!player) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }

  const calendar = await getRpHistoryCalendar({ name: player, platform }, month);
  return NextResponse.json(calendar, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
