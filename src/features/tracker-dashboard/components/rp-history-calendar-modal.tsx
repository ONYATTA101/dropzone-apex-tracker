/**
 * Account History modal that renders stored day-by-day RP gains/losses as a calendar.
 * It uses server RP history snapshots, so it works without exact per-match history access.
 */

"use client";

import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RpHistoryCalendarDay,
  RpHistoryCalendarResponse,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import { fetchRpHistoryCalendar } from "@/features/tracker-dashboard/data-access/tracker-api-client";
import { formatNumber } from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

type RpHistoryCalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: TrackedPlayerIdentity;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function formatShortDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatSyncTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function getDayState(day?: RpHistoryCalendarDay) {
  if (!day) return "empty";
  if (day.dailyNetRp > 0) return "gain";
  if (day.dailyNetRp < 0) return "loss";
  return "flat";
}

export function RpHistoryCalendarModal({ isOpen, onClose, profile }: RpHistoryCalendarModalProps) {
  const [calendar, setCalendar] = useState<RpHistoryCalendarResponse | null>(null);
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalendar = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchRpHistoryCalendar(profile, targetMonth);
      setCalendar(response);
      setSelectedDateKey((current) => {
        if (current && response.days.some((day) => day.dateKey === current)) return current;
        const latestInMonth = response.days.find((day) => day.dateKey === response.latest?.dateKey);
        return latestInMonth?.dateKey ?? response.days.at(-1)?.dateKey ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load RP history.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => void loadCalendar(monthKey), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, loadCalendar, monthKey]);

  const daysByDate = useMemo(() => (
    new Map(calendar?.days.map((day) => [day.dateKey, day]) ?? [])
  ), [calendar]);

  const calendarCells = useMemo(() => createCalendarCells(monthKey), [monthKey]);
  const selectedDay = selectedDateKey ? daysByDate.get(selectedDateKey) : null;
  const monthLabel = calendar?.monthLabel ?? monthKey;
  const monthlyNetRp = calendar?.monthlyNetRp ?? 0;

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal history-calendar-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close RP history" type="button">
          <X size={18} />
        </button>

        <div className="history-calendar-header">
          <div>
            <span className="eyebrow">Account history</span>
            <h2>Season RP calendar</h2>
            <p>Day-by-day net RP for {profile.name}. History begins from the first tracked server sync.</p>
          </div>
          <button
            className="history-refresh-button"
            onClick={() => void loadCalendar(monthKey)}
            type="button"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>

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
            const state = getDayState(day);
            const isSelected = dateKey === selectedDateKey;

            return (
              <button
                className={`history-calendar-day ${state} ${isSelected ? "selected" : ""}`}
                disabled={!dateKey || !day}
                key={dateKey ?? `empty-${index}`}
                onClick={() => dateKey && setSelectedDateKey(dateKey)}
                type="button"
              >
                {dateKey && <span>{Number(dateKey.slice(-2))}</span>}
                {day ? <strong>{formatSignedRp(day.dailyNetRp)}</strong> : dateKey && <small>No sync</small>}
              </button>
            );
          })}
        </div>

        <div className="history-day-details">
          {selectedDay ? (
            <>
              <div className="history-day-details-heading">
                <span className="eyebrow">{formatShortDate(selectedDay.dateKey)}</span>
                <strong className={selectedDay.dailyNetRp >= 0 ? "gain" : "loss"}>
                  {formatSignedRp(selectedDay.dailyNetRp)}
                </strong>
              </div>
              <dl>
                <div><dt>Baseline</dt><dd>{formatNumber(selectedDay.baselineRp)} RP</dd></div>
                <div><dt>Final RP</dt><dd>{formatNumber(selectedDay.currentRp)} RP</dd></div>
                <div><dt>Highest</dt><dd>{formatNumber(selectedDay.highestRp)} RP</dd></div>
                <div><dt>Lowest</dt><dd>{formatNumber(selectedDay.lowestRp)} RP</dd></div>
                <div><dt>Last change</dt><dd>{formatSignedRp(selectedDay.lastDeltaRp)}</dd></div>
                <div><dt>Last sync</dt><dd>{formatSyncTime(selectedDay.lastSeenAt)}</dd></div>
              </dl>
            </>
          ) : (
            <p>Select a tracked day to see the daily RP details.</p>
          )}
        </div>
      </section>
    </div>
  );
}
