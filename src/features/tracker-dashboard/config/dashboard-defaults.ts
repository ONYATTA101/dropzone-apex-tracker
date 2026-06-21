/**
 * Central dashboard defaults and display mappings.
 * Change this file to alter initial demo identities, platform labels, or rank colors.
 */

import { TrackedPlayerIdentity, ApexPlatform } from "@/domain/apex-ranked/types/apex-tracker-types";

// Change this when you want a different account to appear before browser storage loads.
// Platform values must stay as "PC", "PS4", or "X1" because the external API expects those codes.
export const DEFAULT_PROFILE: TrackedPlayerIdentity = {
  name: "blumoat_onyatta",
  platform: "PS4",
};

// Starter friend cards are empty so the app only tracks people the user actually adds.
// The phone widget will display at most 2 friends plus the main profile.
export const DEFAULT_FRIENDS: TrackedPlayerIdentity[] = [];

const LEGACY_DEMO_FRIEND_KEYS = new Set([
  "pc:nightshift",
  "ps4:novapulse",
  "x1:staticviper",
]);

// Older builds saved demo friends locally. Keep this migration until most testers update.
export function removeLegacyDemoFriends<T extends TrackedPlayerIdentity>(friends: T[]) {
  return friends.filter((friend) => (
    !LEGACY_DEMO_FRIEND_KEYS.has(`${friend.platform}:${friend.name.trim().toLowerCase()}`)
  ));
}

// Change only the right-hand labels if you want different wording in the UI.
export const PLATFORM_DISPLAY_NAME: Record<ApexPlatform, string> = {
  PC: "PC",
  PS4: "PlayStation",
  X1: "Xbox",
};

// Edit these colors to reskin rank badges and rank highlights across the dashboard.
export const RANK_DISPLAY_COLOR: Record<string, string> = {
  Rookie: "#a7adb8",
  Bronze: "#c8875d",
  Silver: "#ced9e5",
  Gold: "#f4c95d",
  Platinum: "#62d5db",
  Diamond: "#9a8cff",
  Master: "#e06cff",
  "Apex Predator": "#ff5261",
};
