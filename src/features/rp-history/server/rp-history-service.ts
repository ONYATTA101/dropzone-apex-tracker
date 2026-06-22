/**
 * Server-side RP history calculations for daily gain/loss and widget momentum.
 * This is the source of truth for daily RP once cron or the native widget refreshes it.
 */

import {
  PlayerRankStatus,
  PlayerRpHistorySummary,
  PlayerRpHistoryTrend,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import {
  MOBILE_WIDGET_HEAT_STREAK_GAIN_RP,
  MOBILE_WIDGET_HEAT_STREAK_REQUIRED_UPDATES,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import {
  getRpHistoryStorageMode,
  readRpHistoryDocument,
  RpHistoryStorageMode,
  StoredRpHistoryDay,
  StoredRpPlayerHistory,
  writeRpHistoryDocument,
} from "@/features/rp-history/server/rp-history-store";

const HISTORY_TIME_ZONE = process.env.DROPZONE_WIDGET_TIME_ZONE || "Africa/Nairobi";
const MAX_STORED_DAYS_PER_PLAYER = 14;

export type RpHistoryUpdateResult = {
  players: Map<string, PlayerRpHistorySummary>;
  storageMode: RpHistoryStorageMode;
  updatedAt: string;
};

export function getRpHistoryDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: HISTORY_TIME_ZONE,
    year: "numeric",
  }).format(date);
}

export function getRpHistoryPlayerKey(player: TrackedPlayerIdentity) {
  return `${player.platform}:${player.name.trim().toLowerCase()}`;
}

function getTrend(delta: number): PlayerRpHistoryTrend {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function createFreshDay(player: PlayerRankStatus, now: string, dateKey: string): StoredRpHistoryDay {
  return {
    baselineRankDivision: player.rankDivision,
    baselineRankName: player.rankName,
    baselineRp: player.rankScore,
    currentRankDivision: player.rankDivision,
    currentRankName: player.rankName,
    currentRp: player.rankScore,
    dateKey,
    firstSeenAt: now,
    heatStreakCount: 0,
    highestRp: player.rankScore,
    lastDeltaRp: 0,
    lastSeenAt: now,
    lowestRp: player.rankScore,
    previousRp: player.rankScore,
    rankChanged: false,
    rankDirection: "flat",
    updateCount: 1,
  };
}

function updateExistingDay(
  existing: StoredRpHistoryDay,
  player: PlayerRankStatus,
  now: string,
): StoredRpHistoryDay {
  const lastDeltaRp = player.rankScore - existing.currentRp;
  const heatSteps = Math.floor(Math.max(0, lastDeltaRp) / MOBILE_WIDGET_HEAT_STREAK_GAIN_RP);
  const heatStreakCount = heatSteps > 0
    ? existing.heatStreakCount + heatSteps
    : lastDeltaRp < 0
      ? 0
      : existing.heatStreakCount;
  const rankChanged =
    existing.currentRankName !== player.rankName ||
    existing.currentRankDivision !== player.rankDivision;

  return {
    ...existing,
    currentRankDivision: player.rankDivision,
    currentRankName: player.rankName,
    currentRp: player.rankScore,
    heatStreakCount,
    highestRp: Math.max(existing.highestRp, player.rankScore),
    lastDeltaRp,
    lastSeenAt: now,
    lowestRp: Math.min(existing.lowestRp, player.rankScore),
    previousRp: existing.currentRp,
    rankChanged,
    rankDirection: rankChanged ? getTrend(lastDeltaRp) : "flat",
    updateCount: existing.updateCount + 1,
  };
}

function trimOldDays(history: StoredRpPlayerHistory) {
  const sortedDays = Object.keys(history.days).sort().reverse();
  for (const oldDayKey of sortedDays.slice(MAX_STORED_DAYS_PER_PLAYER)) {
    delete history.days[oldDayKey];
  }
}

function createSummary(day: StoredRpHistoryDay): PlayerRpHistorySummary {
  const dailyNetRp = day.currentRp - day.baselineRp;

  return {
    baselineRp: day.baselineRp,
    currentRp: day.currentRp,
    dailyNetRp,
    dateKey: day.dateKey,
    firstSeenAt: day.firstSeenAt,
    hasHeatStreak: day.heatStreakCount >= MOBILE_WIDGET_HEAT_STREAK_REQUIRED_UPDATES,
    heatStreakCount: day.heatStreakCount,
    highestRp: day.highestRp,
    lastDeltaRp: day.lastDeltaRp,
    lastSeenAt: day.lastSeenAt,
    lowestRp: day.lowestRp,
    rankChanged: day.rankChanged,
    rankDirection: day.rankDirection,
    trend: getTrend(dailyNetRp),
    updateCount: day.updateCount,
  };
}

export async function updateRpHistoryForPlayers(players: PlayerRankStatus[]): Promise<RpHistoryUpdateResult> {
  const document = await readRpHistoryDocument();
  const dateKey = getRpHistoryDayKey();
  const now = new Date().toISOString();
  const summaries = new Map<string, PlayerRpHistorySummary>();

  for (const player of players) {
    const key = getRpHistoryPlayerKey(player);
    const currentHistory = document.players[key] ?? {
      days: {},
      key,
      name: player.name,
      platform: player.platform,
    };
    const existingDay = currentHistory.days[dateKey];
    const nextDay = existingDay
      ? updateExistingDay(existingDay, player, now)
      : createFreshDay(player, now, dateKey);

    currentHistory.name = player.name;
    currentHistory.platform = player.platform;
    currentHistory.days[dateKey] = nextDay;
    currentHistory.latest = nextDay;
    trimOldDays(currentHistory);

    document.players[key] = currentHistory;
    summaries.set(key, createSummary(nextDay));
  }

  await writeRpHistoryDocument(document);

  return {
    players: summaries,
    storageMode: getRpHistoryStorageMode(),
    updatedAt: document.updatedAt,
  };
}

export function applyRpHistoryToPlayers(
  players: PlayerRankStatus[],
  history: RpHistoryUpdateResult,
) {
  return players.map((player) => ({
    ...player,
    rpHistory: history.players.get(getRpHistoryPlayerKey(player)),
  }));
}

export async function updateAndApplyRpHistory(players: PlayerRankStatus[]) {
  const history = await updateRpHistoryForPlayers(players);
  return {
    history,
    players: applyRpHistoryToPlayers(players, history),
  };
}
