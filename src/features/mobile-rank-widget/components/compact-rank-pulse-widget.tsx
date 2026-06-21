/**
 * Compact mobile-first Rank Pulse widget preview.
 * This component shows the exact 3-player widget direction inside the current web app.
 */

"use client";

import { Flame } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRankLabel } from "@/domain/apex-ranked/rank-calculations/rank-progress-calculator";
import { PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";
import {
  MOBILE_WIDGET_HEAT_STREAK_REQUIRED_UPDATES,
  MOBILE_WIDGET_MAX_TRACKED_PLAYERS,
  MOBILE_WIDGET_REFRESH_INTERVAL_HOURS,
  MOBILE_WIDGET_STRONG_TREND_THRESHOLD_RP,
  MOBILE_WIDGET_TREND_THRESHOLD_RP,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import {
  DailyBaselineStore,
  WidgetMomentumStore,
  ensureWidgetDailyBaselines,
  getWidgetPlayerStorageKey,
  saveLatestWidgetSnapshot,
} from "@/features/mobile-rank-widget/utilities/widget-daily-rp-baselines";
import { RankBadge } from "@/features/tracker-dashboard/components/rank-badge";
import { formatNumber } from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

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

function rankPulseTrackTrendClass(change: number) {
  if (change <= -MOBILE_WIDGET_STRONG_TREND_THRESHOLD_RP) return "loss-strong";
  if (change <= -MOBILE_WIDGET_TREND_THRESHOLD_RP) return "loss";
  if (change >= MOBILE_WIDGET_STRONG_TREND_THRESHOLD_RP) return "gain-strong";
  if (change >= MOBILE_WIDGET_TREND_THRESHOLD_RP) return "gain";
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
  baselineRefreshToken = 0,
}: {
  owner: PlayerRankStatus | null;
  friends: PlayerRankStatus[];
  baselineRefreshToken?: number;
}) {
  const [dailyBaselines, setDailyBaselines] = useState<DailyBaselineStore>({});
  const [playerMomentum, setPlayerMomentum] = useState<WidgetMomentumStore>({});

  const players = useMemo(
    () => (owner ? [owner, ...friends].slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS) : []),
    [owner, friends],
  );

  // Store the first RP seen each day. That value becomes the daily net-change baseline.
  useEffect(() => {
    if (players.length === 0) return;

    const parsed = ensureWidgetDailyBaselines(players);
    const momentum = saveLatestWidgetSnapshot(players);
    const timer = window.setTimeout(() => {
      setDailyBaselines(parsed);
      setPlayerMomentum(momentum);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [players, baselineRefreshToken]);

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
          const key = getWidgetPlayerStorageKey(player);
          const baseline = dailyBaselines[key]?.rp ?? player.rankScore;
          const dailyChange = player.rankScore - baseline;
          const featured = index === 0;
          const momentum = playerMomentum[key];
          const hasHeatStreak = momentum?.hasHeatStreak ?? false;

          return (
            <article className={`rank-pulse-player ${featured ? "featured" : ""}`} key={key}>
              <div className="rank-pulse-player-line">
                <RankBadge player={player} />
                <div className="rank-pulse-name">
                  {featured && <span className="rank-pulse-role">YOU</span>}
                  <div className="rank-pulse-name-row">
                    <strong>{player.name}</strong>
                    {hasHeatStreak && (
                      <span
                        aria-label={`${player.name} has a ${MOBILE_WIDGET_HEAT_STREAK_REQUIRED_UPDATES} update heat streak`}
                        className="rank-pulse-heat-streak"
                        title={`${momentum?.heatStreakCount ?? MOBILE_WIDGET_HEAT_STREAK_REQUIRED_UPDATES} hot RP updates`}
                      >
                        <Flame size={10} />
                      </span>
                    )}
                  </div>
                </div>
                <span className="rank-pulse-rank">{shortRankLabel(player)}</span>
                <span className="rank-pulse-rp">{formatNumber(player.rankScore)} RP</span>
                <span className={`rank-pulse-change ${dailyChangeClass(dailyChange)}`}>
                  {formatDailyChange(dailyChange, featured)}
                </span>
              </div>
              <div className={`rank-pulse-track ${rankPulseTrackTrendClass(dailyChange)}`}>
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
