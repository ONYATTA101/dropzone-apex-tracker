/**
 * Scheduled server refresh for Rank Pulse RP history.
 * Vercel Cron calls this route with GET; local/dev can call it manually while building.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRankPulseRoster } from "@/features/rp-history/server/rank-pulse-roster";
import { updateAndApplyRpHistory } from "@/features/rp-history/server/rp-history-service";
import { getPlayerRankStatus } from "@/integrations/apex-legends-status/player-rank-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorizedCronRequest(request: NextRequest) {
  const configuredSecret = process.env.DROPZONE_CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerSecret = authHeader.replace(/^Bearer\s+/i, "");
  const querySecret = request.nextUrl.searchParams.get("secret");

  // Vercel Cron cannot attach custom auth headers, so keep this daily fallback available.
  if (request.headers.get("user-agent")?.includes("vercel-cron/1.0")) {
    return true;
  }

  if (configuredSecret) {
    return bearerSecret === configuredSecret || querySecret === configuredSecret;
  }

  return process.env.NODE_ENV !== "production";
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Cron refresh is not authorized." },
      { status: 401 },
    );
  }

  const roster = getRankPulseRoster();
  const settled = await Promise.allSettled(
    roster.players.map((player, index) => getPlayerRankStatus(player, index === 0, { forceRefresh: true })),
  );
  const loadedPlayers = settled
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof getPlayerRankStatus>>> => (
      result.status === "fulfilled"
    ))
    .map((result) => result.value);
  const failedPlayers = settled
    .map((result, index) => ({ result, requested: roster.players[index] }))
    .filter((entry): entry is {
      requested: typeof roster.players[number];
      result: PromiseRejectedResult;
    } => entry.result.status === "rejected")
    .map((entry) => ({
      error: entry.result.reason instanceof Error ? entry.result.reason.message : "Could not load player.",
      name: entry.requested.name,
      platform: entry.requested.platform,
    }));
  const history = loadedPlayers.length > 0
    ? await updateAndApplyRpHistory(loadedPlayers)
    : null;

  return NextResponse.json(
    {
      failedPlayers,
      historyStorageMode: history?.history.storageMode ?? null,
      historyUpdatedAt: history?.history.updatedAt ?? null,
      players: history?.players.map((player) => ({
        currentRp: player.rankScore,
        dailyNetRp: player.rpHistory?.dailyNetRp ?? 0,
        lastDeltaRp: player.rpHistory?.lastDeltaRp ?? 0,
        name: player.name,
        platform: player.platform,
        rank: `${player.rankName} ${player.rankDivision}`,
        trend: player.rpHistory?.trend ?? "flat",
      })) ?? [],
      refreshedAt: new Date().toISOString(),
      rosterSource: roster.source,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
