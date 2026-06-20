/**
 * Compact mobile-first Rank Pulse widget preview.
 * This component shows the exact 3-player widget direction inside the current web app.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { createRankLabel } from "@/domain/apex-ranked/rank-calculations/rank-progress-calculator";
import { PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";
import {
  MOBILE_WIDGET_MAX_TRACKED_PLAYERS,
  MOBILE_WIDGET_REFRESH_INTERVAL_HOURS,
  MOBILE_WIDGET_STORAGE_KEYS,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import { formatNumber } from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

type DailyBaseline = {
  date: string;
  rp: number;
};

type DailyBaselineStore = Record<string, DailyBaseline>;

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function playerStorageKey(player: PlayerRankStatus) {
  return `${player.platform}:${player.id || player.name}`;
}

function shortRankLabel(player: PlayerRankStatus) {
  return createRankLabel(player.rankName, player.rankDivision)
    .replace("Platinum", "Plat")
    .replace("Diamond", "Dia");
}

function dailyChangeClass(change: number) {
  if (change > 0) return "positive";
  if (change < 0) return "negative";
  return "neutral";
}

function formatDailyChange(change: number, featured: boolean) {
  if (change === 0) return "0";
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${formatNumber(change)}${featured ? " today" : ""}`;
}

export function CompactRankPulseWidget({
  owner,
  friends,
}: {
  owner: PlayerRankStatus | null;
  friends: PlayerRankStatus[];
}) {
  const [dailyBaselines, setDailyBaselines] = useState<DailyBaselineStore>({});

  const players = useMemo(
    () => (owner ? [owner, ...friends].slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS) : []),
    [owner, friends],
  );

  // Store the first RP seen each day. That value becomes the daily net-change baseline.
  useEffect(() => {
    if (players.length === 0) return;

    const currentDate = todayKey();
    const saved = window.localStorage.getItem(MOBILE_WIDGET_STORAGE_KEYS.dailyBaseline);
    let parsed: DailyBaselineStore = {};
    try {
      parsed = saved ? (JSON.parse(saved) as DailyBaselineStore) : {};
    } catch {
      window.localStorage.removeItem(MOBILE_WIDGET_STORAGE_KEYS.dailyBaseline);
    }
    let changed = false;

    for (const player of players) {
      const key = playerStorageKey(player);
      if (!parsed[key] || parsed[key].date !== currentDate) {
        parsed[key] = { date: currentDate, rp: player.rankScore };
        changed = true;
      }
    }

    window.localStorage.setItem(
      MOBILE_WIDGET_STORAGE_KEYS.latestSnapshot,
      JSON.stringify({
        checkedAt: new Date().toISOString(),
        players: players.map((player) => ({
          key: playerStorageKey(player),
          rankScore: player.rankScore,
          rankName: player.rankName,
          rankDivision: player.rankDivision,
        })),
      }),
    );

    if (changed) {
      window.localStorage.setItem(MOBILE_WIDGET_STORAGE_KEYS.dailyBaseline, JSON.stringify(parsed));
    }
    const timer = window.setTimeout(() => setDailyBaselines(parsed), 0);
    return () => window.clearTimeout(timer);
  }, [players]);

  if (players.length === 0) {
    return (
      <section className="rank-pulse-widget rank-pulse-widget-empty" aria-label="Rank Pulse widget preview">
        <div className="rank-pulse-header">
          <strong>RANK PULSE</strong>
          <span>{MOBILE_WIDGET_REFRESH_INTERVAL_HOURS}H SYNC</span>
        </div>
        <p>Loading widget data...</p>
      </section>
    );
  }

  return (
    <section className="rank-pulse-widget" aria-label="Rank Pulse widget preview">
      <div className="rank-pulse-header">
        <strong>RANK PULSE</strong>
        <span>{MOBILE_WIDGET_REFRESH_INTERVAL_HOURS}H SYNC</span>
      </div>

      <div className="rank-pulse-players">
        {players.map((player, index) => {
          const key = playerStorageKey(player);
          const baseline = dailyBaselines[key]?.rp ?? player.rankScore;
          const dailyChange = player.rankScore - baseline;
          const featured = index === 0;

          return (
            <article className={`rank-pulse-player ${featured ? "featured" : ""}`} key={key}>
              <div className="rank-pulse-player-line">
                <div className="rank-pulse-name">
                  {featured && <span>YOU</span>}
                  <strong>{player.name}</strong>
                </div>
                <span className="rank-pulse-rank">{shortRankLabel(player)}</span>
                <span className="rank-pulse-rp">{formatNumber(player.rankScore)} RP</span>
                <span className={`rank-pulse-change ${dailyChangeClass(dailyChange)}`}>
                  {formatDailyChange(dailyChange, featured)}
                </span>
              </div>
              <div className="rank-pulse-track">
                <span style={{ width: `${player.progress.percent}%` }} />
              </div>
            </article>
          );
        })}
      </div>

      <span className="rank-pulse-footer">NET DAILY RP</span>
    </section>
  );
}
