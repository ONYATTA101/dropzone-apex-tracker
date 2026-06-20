/**
 * Settings for the compact phone rank widget.
 * Edit this file when you want to change widget limits, refresh timing, or storage keys.
 */

// The phone widget should show 3 total players: you plus up to 2 friends.
export const MOBILE_WIDGET_MAX_TRACKED_PLAYERS = 3;

// The app should refresh live RP every 2 hours when open or when the user returns.
export const MOBILE_WIDGET_REFRESH_INTERVAL_HOURS = 2;

// Use this to keep the widget inside roughly the top quarter of a phone screen.
export const MOBILE_WIDGET_MAX_SCREEN_HEIGHT_RATIO = 0.25;

// These storage keys will hold daily RP baselines and the most recent refresh snapshot.
export const MOBILE_WIDGET_STORAGE_KEYS = {
  dailyBaseline: "dropzone-widget-daily-baseline",
  latestSnapshot: "dropzone-widget-latest-snapshot",
};
