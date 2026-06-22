/**
 * Server-only Statistics comparison endpoint for squad RP graph data.
 * It reads stored daily RP snapshots for up to three tracked players.
 */

import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/app/api/_shared/api-request-guard";
import { PlayerRankBatchRequest } from "@/domain/apex-ranked/types/apex-tracker-types";
import { getRpHistoryComparison } from "@/features/rp-history/server/rp-history-service";
import { normalizeApexPlatform } from "@/integrations/apex-legends-status/player-rank-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_COMPARISON_PLAYERS = 3;

export async function POST(request: NextRequest) {
  const guarded = guardApiRequest(request, {
    limit: 60,
    routeKey: "rp-history-comparison",
    windowMs: 60_000,
  });
  if (guarded) return guarded;

  const body = (await request.json().catch(() => null)) as { players?: PlayerRankBatchRequest[] } | null;
  const players = (Array.isArray(body?.players) ? body.players : [])
    .slice(0, MAX_COMPARISON_PLAYERS)
    .map((player) => ({
      name: String(player.name ?? "").trim(),
      platform: normalizeApexPlatform(player.platform),
    }))
    .filter((player) => player.name.length > 0);

  if (players.length === 0) {
    return NextResponse.json({ error: "At least one player is required." }, { status: 400 });
  }

  const comparison = await getRpHistoryComparison(players);
  return NextResponse.json(comparison, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
