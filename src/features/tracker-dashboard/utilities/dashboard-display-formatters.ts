/**
 * Small presentation helpers used by dashboard components.
 * These functions contain display formatting only and do not change game data.
 */

export function formatNumber(value: number) {
  // Change the locale if you prefer a different number format.
  return new Intl.NumberFormat("en-US").format(value);
}

export function createPlayerInitials(name: string) {
  // Used for placeholder avatars. Increase slice(0, 2) if you want more letters.
  return name
    .split(/[\s_-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function formatMapCountdown(endsAt: number) {
  // endsAt comes from the API as Unix seconds, so compare it against Date.now() / 1000.
  const seconds = Math.max(0, endsAt - Math.floor(Date.now() / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
