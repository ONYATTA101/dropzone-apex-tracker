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

export function getWidgetTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWidgetPlayerStorageKey(player: PlayerRankStatus) {
  return `${player.platform}:${player.id || player.name}`;
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

export function ensureWidgetDailyBaselines(players: PlayerRankStatus[]) {
  const currentDate = getWidgetTodayKey();
  const baselines = readWidgetDailyBaselines();
  let changed = false;

  for (const player of players) {
    const key = getWidgetPlayerStorageKey(player);
    if (!baselines[key] || baselines[key].date !== currentDate) {
      baselines[key] = { date: currentDate, rp: player.rankScore };
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
