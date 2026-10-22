/**
 * Server-side roster selection for the mobile Rank Pulse widget and scheduled RP refreshes.
 * Configure `DROPZONE_MOBILE_WIDGET_PLAYERS` as `PS4:Name,PC:Friend,X1:Other`.
 * Background refresh also includes signed-in Dropzone accounts and their synced friends
 * so RP is recorded even when nobody has the app open.
 */

import { TrackedPlayerIdentity } from "@/domain/apex-ranked/types/apex-tracker-types";
import { readDropzoneAuthDocument } from "@/features/dropzone-auth/server/dropzone-auth-store";
import { MOBILE_WIDGET_MAX_TRACKED_PLAYERS } from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import { DEFAULT_FRIENDS, DEFAULT_PROFILE } from "@/features/tracker-dashboard/config/dashboard-defaults";
import { normalizeApexPlatform } from "@/integrations/apex-legends-status/player-rank-service";

export const RANK_PULSE_ROSTER_ENV_KEY = "DROPZONE_MOBILE_WIDGET_PLAYERS";
export const BACKGROUND_REFRESH_MAX_PLAYERS = 12;

function parseRosterEntry(entry: string): TrackedPlayerIdentity | null {
  const value = entry.trim();
  if (!value) return null;

  const [first, ...rest] = value.split(":");
  if (rest.length === 0) {
    return { name: value, platform: "PC" };
  }

  const name = rest.join(":").trim();
  if (!name) return null;

  return {
    name,
    platform: normalizeApexPlatform(first),
  };
}

export function parseRankPulseRosterValue(value: string | null | undefined) {
  return value
    ?.split(",")
    .map(parseRosterEntry)
    .filter((player): player is TrackedPlayerIdentity => Boolean(player)) ?? [];
}

function playerKey(player: TrackedPlayerIdentity) {
  return `${player.platform}:${player.name.trim().toLowerCase()}`;
}

function uniquePlayers(players: TrackedPlayerIdentity[], limit: number) {
  const seen = new Set<string>();
  const unique: TrackedPlayerIdentity[] = [];

  for (const player of players) {
    const name = player.name.trim();
    if (!name) continue;
    const key = playerKey({ name, platform: player.platform });
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ name, platform: player.platform });
    if (unique.length >= limit) break;
  }

  return unique;
}

export function getRankPulseRoster() {
  const configuredRoster = parseRankPulseRosterValue(process.env[RANK_PULSE_ROSTER_ENV_KEY]);
  const roster = configuredRoster.length
    ? configuredRoster
    : [DEFAULT_PROFILE, ...DEFAULT_FRIENDS];

  return {
    players: uniquePlayers(roster, MOBILE_WIDGET_MAX_TRACKED_PLAYERS),
    source: process.env[RANK_PULSE_ROSTER_ENV_KEY] ? "environment" : "default",
  };
}

export async function getBackgroundRefreshRoster() {
  const configuredRoster = parseRankPulseRosterValue(process.env[RANK_PULSE_ROSTER_ENV_KEY]);
  let accountPlayers: TrackedPlayerIdentity[] = [];
  let accountCount = 0;

  try {
    const document = await readDropzoneAuthDocument();
    accountCount = Object.keys(document.users).length;
    accountPlayers = Object.values(document.users).flatMap((user) => [
      { name: user.apexName, platform: user.platform },
      ...(user.trackedFriends ?? []),
    ]);
  } catch (error) {
    console.warn(`Could not load Dropzone accounts for background RP refresh. ${String(error)}`);
  }

  const players = uniquePlayers(
    [...configuredRoster, ...accountPlayers, DEFAULT_PROFILE, ...DEFAULT_FRIENDS],
    BACKGROUND_REFRESH_MAX_PLAYERS,
  );

  return {
    accountCount,
    players,
    source: accountCount > 0
      ? "dropzone-accounts"
      : process.env[RANK_PULSE_ROSTER_ENV_KEY]
        ? "environment"
        : "default",
  };
}
