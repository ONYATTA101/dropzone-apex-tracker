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
import { DEFAULT_FRIENDS, DEFAULT_PROFILE } from "@/features/tracker-dashboard/config/dashboard-defaults";
import {
  MOBILE_WIDGET_HEAT_STREAK_GAIN_RP,
  MOBILE_WIDGET_HEAT_STREAK_REQUIRED_UPDATES,
  MOBILE_WIDGET_MAX_TRACKED_PLAYERS,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import {
  getPlayerRankStatus,
  normalizeApexPlatform,
} from "@/integrations/apex-legends-status/player-rank-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MOBILE_ROSTER_ENV_KEY = "DROPZONE_MOBILE_WIDGET_PLAYERS";
const WIDGET_TIME_ZONE = process.env.DROPZONE_WIDGET_TIME_ZONE || "Africa/Nairobi";

type MobileRankPulseSnapshot = {
  baselineRp: number;
  dateKey: string;
  hotUpdateCount: number;
  previousRp: number;
};

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
  updatedAt: string;
};

declare global {
  var __dropzoneMobileRankPulseSnapshots:
    | Map<string, MobileRankPulseSnapshot>
    | undefined;
}

const snapshots = globalThis.__dropzoneMobileRankPulseSnapshots ?? new Map<string, MobileRankPulseSnapshot>();
globalThis.__dropzoneMobileRankPulseSnapshots = snapshots;

function getServerDayKey() {
  // This controls when daily RP resets for the native widget.
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: WIDGET_TIME_ZONE,
    year: "numeric",
  }).format(new Date());
}

function getPlayerKey(player: TrackedPlayerIdentity) {
  return `${player.platform}:${player.name.trim().toLowerCase()}`;
}

function parseRosterEntry(entry: string): TrackedPlayerIdentity | null {
  const value = entry.trim();
  if (!value) return null;

  const [first, ...rest] = value.split(":");
  if (rest.length === 0) {
    return { name: value, platform: "PC" };
  }

  const name = rest.join(":").trim();
  if (!name) return null;

  return {
    name,
    platform: normalizeApexPlatform(first),
  };
}

function getMobileWidgetRoster() {
  const configuredRoster = process.env[MOBILE_ROSTER_ENV_KEY]
    ?.split(",")
    .map(parseRosterEntry)
    .filter((player): player is TrackedPlayerIdentity => Boolean(player));

  const roster = configuredRoster?.length
    ? configuredRoster
    : [DEFAULT_PROFILE, ...DEFAULT_FRIENDS];

  return roster.slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS);
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

function updateDailySnapshot(player: PlayerRankStatus) {
  const dateKey = getServerDayKey();
  const playerKey = getPlayerKey(player);
  const existing = snapshots.get(playerKey);

  if (!existing || existing.dateKey !== dateKey) {
    const fresh: MobileRankPulseSnapshot = {
      baselineRp: player.rankScore,
      dateKey,
      hotUpdateCount: 0,
      previousRp: player.rankScore,
    };
    snapshots.set(playerKey, fresh);
    return fresh;
  }

  const rpChangeSincePrevious = player.rankScore - existing.previousRp;
  const hotUpdateIncrease = Math.floor(
    Math.max(0, rpChangeSincePrevious) / MOBILE_WIDGET_HEAT_STREAK_GAIN_RP,
  );

  const nextSnapshot: MobileRankPulseSnapshot = {
    ...existing,
    hotUpdateCount: hotUpdateIncrease > 0
      ? existing.hotUpdateCount + hotUpdateIncrease
      : 0,
    previousRp: player.rankScore,
  };

  snapshots.set(playerKey, nextSnapshot);
  return nextSnapshot;
}

function createMobilePlayer(player: PlayerRankStatus): MobileRankPulsePlayer {
  const snapshot = updateDailySnapshot(player);
  const rankLabel = createRankLabel(player.rankName, player.rankDivision);

  return {
    badgeLabel: getBadgeLabel(player.rankName),
    currentRp: player.rankScore,
    dailyNetRp: player.rankScore - snapshot.baselineRp,
    hasHeatStreak: snapshot.hotUpdateCount >= MOBILE_WIDGET_HEAT_STREAK_REQUIRED_UPDATES,
    name: player.name,
    platform: player.platform,
    progressPercent: Math.round(player.progress.percent),
    rank: rankLabel,
    source: player.source,
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
    name: requested.name,
    platform: requested.platform,
    progressPercent: 0,
    rank: "Unavailable",
    source: "unavailable",
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

  const roster = getMobileWidgetRoster();
  const settled = await Promise.allSettled(
    roster.map((player, index) => getPlayerRankStatus(player, index === 0, { forceRefresh: true })),
  );

  const players = settled.map((result, index) => (
    result.status === "fulfilled"
      ? createMobilePlayer(result.value)
      : createUnavailablePlayer(roster[index], result.reason)
  ));

  return NextResponse.json(
    {
      players,
      rosterSource: process.env[MOBILE_ROSTER_ENV_KEY] ? "environment" : "default",
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
