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

// These are the starter friend cards. Users can still add/remove friends in the browser.
// Keep this list short for the dashboard; the planned phone widget will display only 2 friends plus you.
export const DEFAULT_FRIENDS: TrackedPlayerIdentity[] = [
  { name: "NightShift", platform: "PC" },
  { name: "NovaPulse", platform: "PS4" },
  { name: "StaticViper", platform: "X1" },
];

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
