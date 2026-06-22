/**
 * Mobile-safe Rank Pulse summary endpoint for the native Android widget.
 * It returns display-ready data only; the private Apex API key stays on the server.
 */

import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/app/api/_shared/api-request-guard";
import { createRankLabel } from "@/domain/apex-ranked/rank-calculations/rank-progress-calculator";
import {
  ApexPlatform,
  PlayerRankStatus,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import { getRankPulseRoster } from "@/features/rp-history/server/rank-pulse-roster";
import {
  getRpHistoryPlayerKey,
  updateRpHistoryForPlayers,
} from "@/features/rp-history/server/rp-history-service";
import { getPlayerRankStatus } from "@/integrations/apex-legends-status/player-rank-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WIDGET_TIME_ZONE = process.env.DROPZONE_WIDGET_TIME_ZONE || "Africa/Nairobi";

type MobileRankPulsePlayer = {
  badgeLabel: string;
  currentRp: number;
  dailyNetRp: number;
  error?: string;
  hasHeatStreak: boolean;
  name: string;
  platform: ApexPlatform;
  progressPercent: number;
  rank: string;
  source: PlayerRankStatus["source"] | "unavailable";
  lastDeltaRp: number;
  highestRpToday: number;
  lowestRpToday: number;
  trend: string;
  updatesTracked: number;
  updatedAt: string;
};

function getServerDayKey() {
  // This controls when daily RP resets for the native widget.
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: WIDGET_TIME_ZONE,
    year: "numeric",
  }).format(new Date());
}

function getBadgeLabel(rankName: string) {
  if (rankName.toLowerCase().includes("predator")) return "AP";
  return rankName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "--";
}

function createMobilePlayer(player: PlayerRankStatus): MobileRankPulsePlayer {
  const history = player.rpHistory;
  const rankLabel = createRankLabel(player.rankName, player.rankDivision);

  return {
    badgeLabel: getBadgeLabel(player.rankName),
    currentRp: player.rankScore,
    dailyNetRp: history?.dailyNetRp ?? 0,
    hasHeatStreak: Boolean(history?.hasHeatStreak),
    highestRpToday: history?.highestRp ?? player.rankScore,
    lastDeltaRp: history?.lastDeltaRp ?? 0,
    lowestRpToday: history?.lowestRp ?? player.rankScore,
    name: player.name,
    platform: player.platform,
    progressPercent: Math.round(player.progress.percent),
    rank: rankLabel,
    source: player.source,
    trend: history?.trend ?? "flat",
    updatesTracked: history?.updateCount ?? 1,
    updatedAt: player.updatedAt,
  };
}

function createUnavailablePlayer(
  requested: TrackedPlayerIdentity,
  error: unknown,
): MobileRankPulsePlayer {
  return {
    badgeLabel: "--",
    currentRp: 0,
    dailyNetRp: 0,
    error: error instanceof Error ? error.message : "Could not load player.",
    hasHeatStreak: false,
    highestRpToday: 0,
    lastDeltaRp: 0,
    lowestRpToday: 0,
    name: requested.name,
    platform: requested.platform,
    progressPercent: 0,
    rank: "Unavailable",
    source: "unavailable",
    trend: "flat",
    updatesTracked: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const guarded = guardApiRequest(request, {
    allowPublicMobileClient: true,
    limit: 20,
    routeKey: "mobile-rank-pulse-summary",
    windowMs: 60_000,
  });
  if (guarded) return guarded;

  const roster = getRankPulseRoster();
  const settled = await Promise.allSettled(
    roster.players.map((player, index) => getPlayerRankStatus(player, index === 0, { forceRefresh: true })),
  );
  const fulfilledPlayers = settled
    .filter((result): result is PromiseFulfilledResult<PlayerRankStatus> => result.status === "fulfilled")
    .map((result) => result.value);
  const history = fulfilledPlayers.length > 0
    ? await updateRpHistoryForPlayers(fulfilledPlayers)
    : null;

  const players = settled.map((result, index) => (
    result.status === "fulfilled"
      ? createMobilePlayer({
          ...result.value,
          rpHistory: history?.players.get(getRpHistoryPlayerKey(result.value)),
        })
      : createUnavailablePlayer(roster.players[index], result.reason)
  ));

  return NextResponse.json(
    {
      historyStorageMode: history?.storageMode ?? null,
      historyUpdatedAt: history?.updatedAt ?? null,
      players,
      rosterSource: roster.source,
      serverDayKey: getServerDayKey(),
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
