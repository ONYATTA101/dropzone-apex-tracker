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

function getDayState(dateKey: string | null, day?: RpHistoryCalendarDay) {
  if (!dateKey) return "empty";
  if (!day) return "no-sync";
  if (day.dailyNetRp > 0) return "gain";
  if (day.dailyNetRp < 0) return "loss";
  return "flat";
}

export function RpHistoryCalendarModal({ isOpen, onClose, profile }: RpHistoryCalendarModalProps) {
  const [calendar, setCalendar] = useState<RpHistoryCalendarResponse | null>(null);
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => void loadCalendar(monthKey), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, loadCalendar, monthKey]);

  const daysByDate = useMemo(() => (
    new Map(calendar?.days.map((day) => [day.dateKey, day]) ?? [])
  ), [calendar]);

  const calendarCells = useMemo(() => createCalendarCells(monthKey), [monthKey]);
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
      </section>
    </div>
  );
}
