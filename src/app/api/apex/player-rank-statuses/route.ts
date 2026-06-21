/**
 * Server-only batch endpoint for player rank statuses.
 * The browser sends one roster request, and the server fans out to the external provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/app/api/_shared/api-request-guard";
import {
  PlayerRankBatchError,
  PlayerRankBatchRequest,
  PlayerRankBatchResponse,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import {
  getPlayerRankStatus,
  normalizeApexPlatform,
} from "@/integrations/apex-legends-status/player-rank-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_BATCH_PLAYERS = 12;

export async function POST(request: NextRequest) {
  const guarded = guardApiRequest(request, {
    limit: 30,
    routeKey: "player-rank-statuses",
    windowMs: 60_000,
  });
  if (guarded) return guarded;

  const body = (await request.json().catch(() => null)) as
    | { players?: PlayerRankBatchRequest[] }
    | null;

  const requestedPlayers = Array.isArray(body?.players) ? body.players : [];
  const players = requestedPlayers
    .slice(0, MAX_BATCH_PLAYERS)
    .map((player) => ({
      name: String(player.name ?? "").trim(),
      platform: normalizeApexPlatform(player.platform),
      primary: Boolean(player.primary),
      requestKey: String(player.requestKey ?? ""),
    }))
    .filter((player) => player.name.length > 0);

  if (players.length === 0) {
    return NextResponse.json({ error: "At least one player is required." }, { status: 400 });
  }

  const settled = await Promise.allSettled(
    players.map((player) => getPlayerRankStatus(player, player.primary)),
  );

  const response: PlayerRankBatchResponse = {
    results: [],
    players: [],
    errors: [],
  };

  settled.forEach((result, index) => {
    const failed = players[index];
    if (result.status === "fulfilled") {
      response.results.push({
        player: result.value,
        requestKey: failed.requestKey || `${failed.platform}:${failed.name.toLowerCase()}`,
        requested: { name: failed.name, platform: failed.platform },
      });
      response.players.push(result.value);
      return;
    }

    const error: PlayerRankBatchError = {
      name: failed.name,
      platform: failed.platform,
      requestKey: failed.requestKey || `${failed.platform}:${failed.name.toLowerCase()}`,
      error: result.reason instanceof Error ? result.reason.message : "Could not load player.",
    };
    response.errors.push(error);
  });

  return NextResponse.json(response);
}
