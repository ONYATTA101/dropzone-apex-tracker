/**
 * Account Statistics modal for the stored RP calendar and squad comparison graph.
 * It uses server RP history snapshots, so the UI can show trends without exact match history access.
 */

"use client";

import { CalendarDays, ChevronLeft, ChevronRight, LineChart, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RpHistoryCalendarDay,
  RpHistoryCalendarResponse,
  RpHistoryComparisonResponse,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import {
  fetchRpHistoryCalendar,
  fetchRpHistoryComparison,
} from "@/features/tracker-dashboard/data-access/tracker-api-client";
import { formatNumber } from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

type AccountStatisticsModalProps = {
  comparisonPlayers: TrackedPlayerIdentity[];
  isOpen: boolean;
  onClose: () => void;
  profile: TrackedPlayerIdentity;
};

type StatisticsTab = "history" | "comparison";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COMPARISON_COLORS = ["#0a84ff", "#30d158", "#ff9f0a"];

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createCalendarCells(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingEmptyCells = firstDay.getUTCDay();
  const cells: Array<string | null> = Array.from({ length: leadingEmptyCells }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${monthKey}-${String(day).padStart(2, "0")}`);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatSignedRp(value: number) {
  if (value === 0) return "0 RP";
  return `${value > 0 ? "+" : ""}${formatNumber(value)} RP`;
}

function getTrackedPlayerKey(player: TrackedPlayerIdentity) {
  return `${player.platform}:${player.name.trim().toLowerCase()}`;
}

function createUniquePlayers(players: TrackedPlayerIdentity[]) {
  const seen = new Set<string>();

  return players.filter((player) => {
    const key = getTrackedPlayerKey(player);
    if (seen.has(key) || !player.name.trim()) return false;
    seen.add(key);
    return true;
  });
}

function getDayState(dateKey: string | null, day?: RpHistoryCalendarDay) {
  if (!dateKey) return "empty";
  if (!day) return "no-sync";
  if (day.dailyNetRp > 0) return "gain";
  if (day.dailyNetRp < 0) return "loss";
  return "flat";
}

function formatDateLabel(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function AccountStatisticsModal({
  comparisonPlayers,
  isOpen,
  onClose,
  profile,
}: AccountStatisticsModalProps) {
  const [activeTab, setActiveTab] = useState<StatisticsTab>("history");
  const [calendar, setCalendar] = useState<RpHistoryCalendarResponse | null>(null);
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<RpHistoryComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const comparisonRoster = useMemo(
    () => createUniquePlayers([profile, ...comparisonPlayers]).slice(0, 3),
    [comparisonPlayers, profile],
  );

  const loadCalendar = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchRpHistoryCalendar(profile, targetMonth);
      setCalendar(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load RP history.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const loadComparison = useCallback(async () => {
    setComparisonLoading(true);
    setComparisonError(null);

    try {
      const response = await fetchRpHistoryComparison(comparisonRoster);
      setComparison(response);
    } catch (loadError) {
      setComparisonError(loadError instanceof Error ? loadError.message : "Could not load RP comparison.");
    } finally {
      setComparisonLoading(false);
    }
  }, [comparisonRoster]);

  useEffect(() => {
    if (!isOpen || activeTab !== "history") return;
    const timer = window.setTimeout(() => void loadCalendar(monthKey), 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, isOpen, loadCalendar, monthKey]);

  useEffect(() => {
    if (!isOpen || activeTab !== "comparison" || comparisonRoster.length === 0) return;
    const timer = window.setTimeout(() => void loadComparison(), 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, comparisonRoster.length, isOpen, loadComparison]);

  const daysByDate = useMemo(() => (
    new Map(calendar?.days.map((day) => [day.dateKey, day]) ?? [])
  ), [calendar]);

  const calendarCells = useMemo(() => createCalendarCells(monthKey), [monthKey]);
  const monthLabel = calendar?.monthLabel ?? monthKey;
  const monthlyNetRp = calendar?.monthlyNetRp ?? 0;
  const comparisonDates = useMemo(() => (
    Array.from(new Set(comparison?.players.flatMap((player) => player.points.map((point) => point.dateKey)) ?? [])).sort()
  ), [comparison]);
  const comparisonRange = useMemo(() => {
    const values = comparison?.players.flatMap((player) => player.points.map((point) => point.cumulativeNetRp)) ?? [];
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(0, ...values);

    if (minValue === maxValue) {
      return { max: maxValue + 100, min: minValue - 100 };
    }

    const padding = Math.max(50, Math.round((maxValue - minValue) * 0.15));
    return { max: maxValue + padding, min: minValue - padding };
  }, [comparison]);
  const hasComparisonPoints = comparison?.players.some((player) => player.points.length > 0) ?? false;
  const firstComparisonDate = comparisonDates[0];
  const latestComparisonDate = comparisonDates[comparisonDates.length - 1];

  if (!isOpen) return null;

  function getGraphPoint(dateKey: string, cumulativeNetRp: number) {
    const dateIndex = comparisonDates.indexOf(dateKey);
    const x = comparisonDates.length <= 1 ? 50 : (dateIndex / (comparisonDates.length - 1)) * 100;
    const y = 100 - ((cumulativeNetRp - comparisonRange.min) / (comparisonRange.max - comparisonRange.min)) * 100;

    return { x, y };
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal history-calendar-modal account-statistics-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close statistics" type="button">
          <X size={18} />
        </button>

        <div className="history-calendar-header">
          <div>
            <span className="eyebrow">Account statistics</span>
            <h2>Rank statistics</h2>
            <p>History calendar and squad RP comparison for {profile.name}.</p>
          </div>
          <button
            className="history-refresh-button"
            onClick={() => activeTab === "history" ? void loadCalendar(monthKey) : void loadComparison()}
            type="button"
          >
            <RefreshCw size={14} className={loading || comparisonLoading ? "spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="statistics-tabs" role="tablist" aria-label="Statistics sections">
          <button
            aria-selected={activeTab === "history"}
            className={`statistics-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
            role="tab"
            type="button"
          >
            <CalendarDays size={15} />
            History
          </button>
          <button
            aria-selected={activeTab === "comparison"}
            className={`statistics-tab ${activeTab === "comparison" ? "active" : ""}`}
            onClick={() => setActiveTab("comparison")}
            role="tab"
            type="button"
          >
            <LineChart size={15} />
            Comparison
          </button>
        </div>

        {activeTab === "history" ? (
          <div className="statistics-tab-panel" role="tabpanel">
            <div className={`history-month-summary ${monthlyNetRp > 0 ? "gain" : monthlyNetRp < 0 ? "loss" : "flat"}`}>
              <div>
                <span>Month net RP</span>
                <strong>{formatSignedRp(monthlyNetRp)}</strong>
              </div>
              <small>{monthLabel} | {calendar?.retainedDayLimit ?? 120} day season window</small>
            </div>

            <div className="history-month-controls" aria-label="Calendar month controls">
              <button onClick={() => setMonthKey((current) => shiftMonthKey(current, -1))} type="button">
                <ChevronLeft size={15} />
                Previous
              </button>
              <strong>{monthLabel}</strong>
              <button onClick={() => setMonthKey((current) => shiftMonthKey(current, 1))} type="button">
                Next
                <ChevronRight size={15} />
              </button>
            </div>

            {error && <div className="history-calendar-error">{error}</div>}

            <div className="history-calendar-weekdays">
              {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
            </div>

            <div className="history-calendar-grid" aria-label={`${monthLabel} RP history`}>
              {calendarCells.map((dateKey, index) => {
                const day = dateKey ? daysByDate.get(dateKey) : undefined;
                const state = getDayState(dateKey, day);

                return (
                  <button
                    className={`history-calendar-day ${state}`}
                    disabled={!dateKey || !day}
                    key={dateKey ?? `empty-${index}`}
                    type="button"
                  >
                    {dateKey && <span>{Number(dateKey.slice(-2))}</span>}
                    {day ? <strong>{formatSignedRp(day.dailyNetRp)}</strong> : dateKey && <small>--</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="statistics-tab-panel statistics-comparison-panel" role="tabpanel">
            <div className="comparison-copy">
              <div>
                <span className="eyebrow">Squad rate graph</span>
                <h3>RP gained since tracking started</h3>
              </div>
              <p>Compares cumulative daily net RP for you and up to two tracked friends.</p>
            </div>

            {comparisonError && <div className="history-calendar-error">{comparisonError}</div>}

            <div className="statistics-graph-card">
              {hasComparisonPoints ? (
                <>
                  <div className="statistics-graph-scale">
                    <span>{formatSignedRp(comparisonRange.max)}</span>
                    <span>{formatSignedRp(comparisonRange.min)}</span>
                  </div>
                  <svg className="statistics-graph" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Squad RP comparison graph">
                    <line x1="0" x2="100" y1="50" y2="50" className="statistics-graph-zero" />
                    <line x1="0" x2="100" y1="18" y2="18" className="statistics-graph-gridline" />
                    <line x1="0" x2="100" y1="82" y2="82" className="statistics-graph-gridline" />
                    {comparison?.players.map((player, index) => {
                      const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
                      const coordinates = player.points
                        .map((point) => {
                          const graphPoint = getGraphPoint(point.dateKey, point.cumulativeNetRp);
                          return `${graphPoint.x},${graphPoint.y}`;
                        })
                        .join(" ");
                      const latestPoint = player.points[player.points.length - 1];
                      const latestGraphPoint = latestPoint
                        ? getGraphPoint(latestPoint.dateKey, latestPoint.cumulativeNetRp)
                        : null;

                      return (
                        <g key={getTrackedPlayerKey(player.player)}>
                          {player.points.length > 1 ? (
                            <polyline points={coordinates} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
                          ) : latestGraphPoint ? (
                            <circle cx={latestGraphPoint.x} cy={latestGraphPoint.y} fill={color} r="2.8" vectorEffect="non-scaling-stroke" />
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="statistics-graph-dates">
                    <span>{firstComparisonDate ? formatDateLabel(firstComparisonDate) : "Start"}</span>
                    <span>{latestComparisonDate ? formatDateLabel(latestComparisonDate) : "Today"}</span>
                  </div>
                </>
              ) : (
                <div className="comparison-empty">
                  <LineChart size={24} />
                  <strong>No RP graph yet</strong>
                  <span>Refresh after ranked sessions so Dropzone can store daily snapshots for the graph.</span>
                </div>
              )}
            </div>

            <div className="statistics-comparison-legend">
              {comparison?.players.map((player, index) => (
                <article className="statistics-comparison-card" key={getTrackedPlayerKey(player.player)}>
                  <span style={{ background: COMPARISON_COLORS[index % COMPARISON_COLORS.length] }} />
                  <div>
                    <strong>{player.player.name}</strong>
                    <small>{player.trackedDayCount} days tracked</small>
                  </div>
                  <div>
                    <strong className={player.totalNetRp >= 0 ? "gain" : "loss"}>{formatSignedRp(player.totalNetRp)}</strong>
                    <small>{formatSignedRp(player.averageDailyNetRp)} / day</small>
                  </div>
                </article>
              ))}
              {comparisonLoading && <div className="comparison-empty compact">Loading comparison...</div>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
