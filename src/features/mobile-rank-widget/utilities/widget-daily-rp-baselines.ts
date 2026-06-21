/**
 * Shared daily RP baseline helpers for the Rank Pulse widget.
 * The API only gives current RP, so the app stores the first RP seen each local day.
 */

import { PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";
import { MOBILE_WIDGET_STORAGE_KEYS } from "@/features/mobile-rank-widget/config/mobile-widget-settings";

export type DailyBaseline = {
  date: string;
  rp: number;
};

export type DailyBaselineStore = Record<string, DailyBaseline>;

type LatestWidgetSnapshotPlayer = {
  key: string;
  id?: string;
  name?: string;
  platform?: PlayerRankStatus["platform"];
  rankScore: number;
  rankName: string;
  rankDivision: number;
};

type LatestWidgetSnapshot = {
  checkedAt: string;
  players: LatestWidgetSnapshotPlayer[];
};

function getWidgetDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWidgetTodayKey() {
  return getWidgetDateKey(new Date());
}

function normalizeStorageKeyPart(value: string) {
  return value.trim().toLowerCase();
}

export function getWidgetPlayerStorageKey(player: PlayerRankStatus) {
  return `${player.platform}:${normalizeStorageKeyPart(player.id || player.name)}`;
}

function getWidgetPlayerLookupKeys(player: PlayerRankStatus) {
  const keys = [
    getWidgetPlayerStorageKey(player),
    `${player.platform}:${player.id}`,
    `${player.platform}:${player.name}`,
    `${player.platform}:${normalizeStorageKeyPart(player.name)}`,
  ].filter((key) => !key.endsWith(":"));

  return Array.from(new Set(keys));
}

export function readWidgetDailyBaselines() {
  const saved = window.localStorage.getItem(MOBILE_WIDGET_STORAGE_KEYS.dailyBaseline);
  try {
    return saved ? (JSON.parse(saved) as DailyBaselineStore) : {};
  } catch {
    window.localStorage.removeItem(MOBILE_WIDGET_STORAGE_KEYS.dailyBaseline);
    return {};
  }
}

export function writeWidgetDailyBaselines(baselines: DailyBaselineStore) {
  window.localStorage.setItem(MOBILE_WIDGET_STORAGE_KEYS.dailyBaseline, JSON.stringify(baselines));
}

function readLatestWidgetSnapshot() {
  const saved = window.localStorage.getItem(MOBILE_WIDGET_STORAGE_KEYS.latestSnapshot);
  try {
    return saved ? (JSON.parse(saved) as LatestWidgetSnapshot) : null;
  } catch {
    window.localStorage.removeItem(MOBILE_WIDGET_STORAGE_KEYS.latestSnapshot);
    return null;
  }
}

function findTodayBaselineForPlayer(
  baselines: DailyBaselineStore,
  player: PlayerRankStatus,
  currentDate: string,
) {
  const lookupKeys = new Set(
    getWidgetPlayerLookupKeys(player).flatMap((key) => [key, normalizeStorageKeyPart(key)]),
  );

  return Object.entries(baselines)
    .find(([key, baseline]) => (
      baseline.date === currentDate &&
      (lookupKeys.has(key) || lookupKeys.has(normalizeStorageKeyPart(key)))
    ))?.[1];
}

function findSnapshotPlayer(snapshot: LatestWidgetSnapshot | null, player: PlayerRankStatus) {
  if (!snapshot) return undefined;

  const lookupKeys = new Set(
    getWidgetPlayerLookupKeys(player).flatMap((key) => [key, normalizeStorageKeyPart(key)]),
  );
  return snapshot.players.find((snapshotPlayer) => {
    const snapshotKey = snapshotPlayer.key ? normalizeStorageKeyPart(snapshotPlayer.key) : "";
    const playerIdMatches =
      snapshotPlayer.platform === player.platform &&
      snapshotPlayer.id &&
      normalizeStorageKeyPart(snapshotPlayer.id) === normalizeStorageKeyPart(player.id);
    const playerNameMatches =
      snapshotPlayer.platform === player.platform &&
      snapshotPlayer.name &&
      normalizeStorageKeyPart(snapshotPlayer.name) === normalizeStorageKeyPart(player.name);

    return lookupKeys.has(snapshotPlayer.key) || lookupKeys.has(snapshotKey) || playerIdMatches || playerNameMatches;
  });
}

export function ensureWidgetDailyBaselines(players: PlayerRankStatus[]) {
  const currentDate = getWidgetTodayKey();
  const baselines = readWidgetDailyBaselines();
  const latestSnapshot = readLatestWidgetSnapshot();
  const latestSnapshotDate = latestSnapshot?.checkedAt
    ? getWidgetDateKey(new Date(latestSnapshot.checkedAt))
    : null;
  let changed = false;

  for (const player of players) {
    const key = getWidgetPlayerStorageKey(player);
    const currentBaseline = findTodayBaselineForPlayer(baselines, player, currentDate);

    if (currentBaseline) {
      // Keep the first RP seen today, but migrate old/case-sensitive keys to the normalized key.
      if (baselines[key] !== currentBaseline) {
        baselines[key] = currentBaseline;
        changed = true;
      }
      continue;
    }

    const snapshotPlayer = latestSnapshotDate === currentDate
      ? findSnapshotPlayer(latestSnapshot, player)
      : undefined;

    if (!baselines[key] || baselines[key].date !== currentDate) {
      baselines[key] = {
        date: currentDate,
        // If we already saw this player earlier today, use that RP instead of resetting to the new value.
        rp: snapshotPlayer?.rankScore ?? player.rankScore,
      };
      changed = true;
    }
  }

  if (changed) writeWidgetDailyBaselines(baselines);
  return baselines;
}

export function saveLatestWidgetSnapshot(players: PlayerRankStatus[]) {
  window.localStorage.setItem(
    MOBILE_WIDGET_STORAGE_KEYS.latestSnapshot,
    JSON.stringify({
      checkedAt: new Date().toISOString(),
      players: players.map((player) => ({
        key: getWidgetPlayerStorageKey(player),
        id: player.id,
        name: player.name,
        platform: player.platform,
        rankScore: player.rankScore,
        rankName: player.rankName,
        rankDivision: player.rankDivision,
      })),
    }),
  );
}

export function setWidgetDailyChangeForTesting(players: PlayerRankStatus[], dailyChange: number) {
  const currentDate = getWidgetTodayKey();
  const baselines = readWidgetDailyBaselines();

  for (const player of players) {
    baselines[getWidgetPlayerStorageKey(player)] = {
      date: currentDate,
      rp: player.rankScore - dailyChange,
    };
  }

  writeWidgetDailyBaselines(baselines);
  return baselines;
}
