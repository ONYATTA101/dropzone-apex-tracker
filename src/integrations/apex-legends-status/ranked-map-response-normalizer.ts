/**
 * Converts the unofficial Apex Legends Status map response into the app's ranked-map contract.
 */

import { RankedMapRotation } from "@/domain/apex-ranked/types/apex-tracker-types";

export function normalizeRankedMapResponse(data: Record<string, unknown>): RankedMapRotation {
  // The provider has used both "ranked" and "battle_royale" containers, so support both.
  const ranked = (data.ranked ?? data.battle_royale) as Record<string, unknown> | undefined;
  const current = ranked?.current as Record<string, unknown> | undefined;
  const next = ranked?.next as Record<string, unknown> | undefined;

  return {
    current: String(current?.map ?? "Unknown map"),
    next: String(next?.map ?? "Unknown map"),
    asset: typeof current?.asset === "string" ? current.asset : null,
    // Prefer the API end timestamp. If it is absent, estimate from remaining seconds.
    endsAt: Number(
      current?.end ?? Math.floor(Date.now() / 1000) + Number(current?.remainingSecs ?? 0),
    ),
    source: "live",
  };
}
