/**
 * Server-side roster selection for the mobile Rank Pulse widget and scheduled RP refreshes.
 * Configure `DROPZONE_MOBILE_WIDGET_PLAYERS` as `PS4:Name,PC:Friend,X1:Other`.
 */

import { TrackedPlayerIdentity } from "@/domain/apex-ranked/types/apex-tracker-types";
import { MOBILE_WIDGET_MAX_TRACKED_PLAYERS } from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import { DEFAULT_FRIENDS, DEFAULT_PROFILE } from "@/features/tracker-dashboard/config/dashboard-defaults";
import { normalizeApexPlatform } from "@/integrations/apex-legends-status/player-rank-service";

export const RANK_PULSE_ROSTER_ENV_KEY = "DROPZONE_MOBILE_WIDGET_PLAYERS";

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

export function getRankPulseRoster() {
  const configuredRoster = process.env[RANK_PULSE_ROSTER_ENV_KEY]
    ?.split(",")
    .map(parseRosterEntry)
    .filter((player): player is TrackedPlayerIdentity => Boolean(player));
  const roster = configuredRoster?.length
    ? configuredRoster
    : [DEFAULT_PROFILE, ...DEFAULT_FRIENDS];

  return {
    players: roster.slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS),
    source: process.env[RANK_PULSE_ROSTER_ENV_KEY] ? "environment" : "default",
  };
}
