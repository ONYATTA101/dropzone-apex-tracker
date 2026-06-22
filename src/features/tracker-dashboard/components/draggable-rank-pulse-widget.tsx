/**
 * Floating draggable Rank Pulse preview for the dashboard home page.
 * It mirrors the dashboard's tracked roster instead of owning separate widget controls.
 */

"use client";

import { GripHorizontal, RefreshCw } from "lucide-react";
import { PointerEvent, useEffect, useRef, useState } from "react";
import { PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";
import { CompactRankPulseWidget } from "@/features/mobile-rank-widget/components/compact-rank-pulse-widget";
import { DASHBOARD_STORAGE_KEYS } from "@/features/tracker-dashboard/config/dashboard-storage-keys";

type WidgetPosition = {
  x: number;
  y: number;
};

type DragState = {
  initialX: number;
  initialY: number;
  pointerId: number;
  startX: number;
  startY: number;
};

type DraggableRankPulseWidgetProps = {
  friends: PlayerRankStatus[];
  loading: boolean;
  onRefresh: () => void;
  owner: PlayerRankStatus | null;
};

const DEFAULT_POSITION: WidgetPosition = { x: 300, y: 104 };
const MIN_EDGE_GAP = 12;
const ESTIMATED_WIDGET_WIDTH = 430;
const ESTIMATED_WIDGET_HEIGHT = 260;

function clampWidgetPosition(position: WidgetPosition) {
  if (typeof window === "undefined") return position;

  const widgetWidth = Math.min(ESTIMATED_WIDGET_WIDTH, window.innerWidth - MIN_EDGE_GAP * 2);
  const maxX = Math.max(MIN_EDGE_GAP, window.innerWidth - widgetWidth - MIN_EDGE_GAP);
  const maxY = Math.max(MIN_EDGE_GAP, window.innerHeight - ESTIMATED_WIDGET_HEIGHT);

  return {
    x: Math.min(Math.max(position.x, MIN_EDGE_GAP), maxX),
    y: Math.min(Math.max(position.y, MIN_EDGE_GAP), maxY),
  };
}

function readStoredPosition() {
  const saved = window.localStorage.getItem(DASHBOARD_STORAGE_KEYS.rankPulseWidgetPosition);
  if (!saved) return clampWidgetPosition(DEFAULT_POSITION);

  try {
    const parsed = JSON.parse(saved) as WidgetPosition;
    return Number.isFinite(parsed.x) && Number.isFinite(parsed.y)
      ? clampWidgetPosition(parsed)
      : clampWidgetPosition(DEFAULT_POSITION);
  } catch {
    window.localStorage.removeItem(DASHBOARD_STORAGE_KEYS.rankPulseWidgetPosition);
    return clampWidgetPosition(DEFAULT_POSITION);
  }
}

function saveStoredPosition(position: WidgetPosition) {
  window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.rankPulseWidgetPosition, JSON.stringify(position));
}

export function DraggableRankPulseWidget({
  friends,
  loading,
  onRefresh,
  owner,
}: DraggableRankPulseWidgetProps) {
  const [position, setPosition] = useState<WidgetPosition>(DEFAULT_POSITION);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<DragState | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setPosition(readStoredPosition()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const keepWidgetOnScreen = () => {
      setPosition((current) => {
        const next = clampWidgetPosition(current);
        saveStoredPosition(next);
        return next;
      });
    };

    window.addEventListener("resize", keepWidgetOnScreen);
    return () => window.removeEventListener("resize", keepWidgetOnScreen);
  }, []);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;

    dragState.current = {
      initialX: position.x,
      initialY: position.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) return;

    const next = clampWidgetPosition({
      x: dragState.current.initialX + event.clientX - dragState.current.startX,
      y: dragState.current.initialY + event.clientY - dragState.current.startY,
    });
    setPosition(next);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) return;

    dragState.current = null;
    setDragging(false);
    setPosition((current) => {
      const next = clampWidgetPosition(current);
      saveStoredPosition(next);
      return next;
    });
  }

  return (
    <section
      className={`floating-rank-pulse-widget ${dragging ? "dragging" : ""}`}
      style={{ left: position.x, top: position.y }}
      aria-label="Draggable Rank Pulse widget"
    >
      <div
        className="floating-rank-pulse-handle"
        onPointerCancel={finishDrag}
        onPointerDown={startDrag}
        onPointerMove={updateDrag}
        onPointerUp={finishDrag}
      >
        <span><GripHorizontal size={15} /> Drag Rank Pulse</span>
        <button aria-label="Refresh Rank Pulse widget" disabled={loading} onClick={onRefresh} type="button">
          <RefreshCw size={14} className={loading ? "spin" : ""} />
        </button>
      </div>
      <CompactRankPulseWidget owner={owner} friends={friends} />
    </section>
  );
}
