/**
 * Server-side RP history calculations for daily gain/loss and widget momentum.
 * This is the source of truth for daily RP once cron or the native widget refreshes it.
 */

import {
  PlayerRankStatus,
  RpHistoryCalendarDay,
  RpHistoryCalendarResponse,
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
const DEFAULT_STORED_DAYS_PER_PLAYER = 120;

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

export function getRpHistoryStoredDayLimit() {
  const configuredLimit = Number(process.env.DROPZONE_RP_HISTORY_MAX_DAYS);
  return Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.floor(configuredLimit)
    : DEFAULT_STORED_DAYS_PER_PLAYER;
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
  for (const oldDayKey of sortedDays.slice(getRpHistoryStoredDayLimit())) {
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

function createCalendarDay(day: StoredRpHistoryDay): RpHistoryCalendarDay {
  return {
    baselineRankDivision: day.baselineRankDivision,
    baselineRankName: day.baselineRankName,
    baselineRp: day.baselineRp,
    currentRankDivision: day.currentRankDivision,
    currentRankName: day.currentRankName,
    currentRp: day.currentRp,
    dailyNetRp: day.currentRp - day.baselineRp,
    dateKey: day.dateKey,
    firstSeenAt: day.firstSeenAt,
    highestRp: day.highestRp,
    lastDeltaRp: day.lastDeltaRp,
    lastSeenAt: day.lastSeenAt,
    lowestRp: day.lowestRp,
    trend: getTrend(day.currentRp - day.baselineRp),
    updateCount: day.updateCount,
  };
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
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

export async function getRpHistoryCalendar(
  identity: TrackedPlayerIdentity,
  monthKey = getRpHistoryDayKey().slice(0, 7),
): Promise<RpHistoryCalendarResponse> {
  const document = await readRpHistoryDocument();
  const playerKey = getRpHistoryPlayerKey(identity);
  const history = document.players[playerKey];
  const allDays = Object.values(history?.days ?? {})
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
    .map(createCalendarDay);
  const days = allDays.filter((day) => day.dateKey.startsWith(`${monthKey}-`));
  const latest = history?.latest ? createCalendarDay(history.latest) : null;
  const availableMonthKeys = Array.from(new Set(allDays.map((day) => day.dateKey.slice(0, 7)))).sort();

  return {
    availableMonthKeys,
    days,
    latest,
    month: monthKey,
    monthLabel: getMonthLabel(monthKey),
    monthlyNetRp: days.reduce((total, day) => total + day.dailyNetRp, 0),
    player: {
      name: history?.name ?? identity.name,
      platform: history?.platform ?? identity.platform,
    },
    retainedDayLimit: getRpHistoryStoredDayLimit(),
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
