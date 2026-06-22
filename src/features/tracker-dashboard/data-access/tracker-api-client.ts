/**
 * Browser-side client for the app's protected Apex API routes.
 * The browser calls these internal endpoints so the external API key stays on the server.
 */

import {
  PlayerRankBatchRequest,
  PlayerRankBatchResponse,
  PlayerRankStatus,
  RankedMapRotation,
  RpHistoryCalendarResponse,
  RpHistoryComparisonResponse,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";

export async function fetchPlayerRankStatus(
  identity: TrackedPlayerIdentity,
  primary = false,
  options: { forceRefresh?: boolean } = {},
): Promise<PlayerRankStatus> {
  // If you rename the server route folder, update this internal URL too.
  const params = new URLSearchParams({
    player: identity.name,
    platform: identity.platform,
    primary: String(primary),
    forceRefresh: String(Boolean(options.forceRefresh)),
    refresh: String(Date.now()),
  });
  const response = await fetch(`/api/apex/player-rank-status?${params}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load player.");
  return data as PlayerRankStatus;
}

export async function fetchPlayerRankStatuses(
  players: PlayerRankBatchRequest[],
  options: { forceRefresh?: boolean } = {},
): Promise<PlayerRankBatchResponse> {
  // One browser request for the full roster is faster than one request per friend.
  const response = await fetch("/api/apex/player-rank-statuses", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forceRefresh: Boolean(options.forceRefresh), players }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load player roster.");
  return data as PlayerRankBatchResponse;
}

export async function fetchRankedMapRotation(): Promise<RankedMapRotation> {
  // Keep all browser calls pointed at internal /api routes so APEX_API_KEY never ships to users.
  const response = await fetch("/api/apex/ranked-map-rotation");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load the ranked map rotation.");
  return data as RankedMapRotation;
}

export async function fetchRpHistoryCalendar(
  identity: TrackedPlayerIdentity,
  month?: string,
): Promise<RpHistoryCalendarResponse> {
  const params = new URLSearchParams({
    player: identity.name,
    platform: identity.platform,
    refresh: String(Date.now()),
  });
  if (month) params.set("month", month);

  const response = await fetch(`/api/apex/rp-history-calendar?${params}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load RP history.");
  return data as RpHistoryCalendarResponse;
}

export async function fetchRpHistoryComparison(
  players: TrackedPlayerIdentity[],
): Promise<RpHistoryComparisonResponse> {
  const response = await fetch("/api/apex/rp-history-comparison", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ players }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load RP comparison.");
  return data as RpHistoryComparisonResponse;
}
