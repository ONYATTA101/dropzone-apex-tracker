/**
 * Converts the unofficial Apex Legends Status player response into the app's stable
 * PlayerRankStatus contract. This isolates external API field changes to one file.
 */

import { calculateRankProgress, normalizeRankName } from "@/domain/apex-ranked/rank-calculations/rank-progress-calculator";
import { ApexPlatform, PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";

export function normalizePlayerRankResponse(
  data: Record<string, unknown>,
  requestedName: string,
  platform: ApexPlatform,
): PlayerRankStatus {
  // The provider nests most useful account data under "global".
  const global = (data.global ?? {}) as Record<string, unknown>;
  const rank = (global.rank ?? {}) as Record<string, unknown>;
  const realtime = (data.realtime ?? {}) as Record<string, unknown>;
  const selected = (data.legends as Record<string, unknown> | undefined)?.selected as
    | Record<string, unknown>
    | undefined;

  const rankName = String(rank.rankName ?? "Rookie");
  const rankDivision = Number(rank.rankDiv ?? 4);
  const rankScore = Number(rank.rankScore ?? 0);

  return {
    // Fallbacks keep the UI from crashing if the external provider omits a field.
    id: String(global.uid ?? `${platform}-${requestedName}`),
    name: String(global.name ?? requestedName),
    platform,
    avatar: typeof global.avatar === "string" ? global.avatar : null,
    level: Number(global.level ?? 0),
    rankName: normalizeRankName(rankName),
    rankDivision,
    rankScore,
    rankPosition: rank.ladderPos ? Number(rank.ladderPos) : null,
    rankImage: typeof rank.rankImg === "string" ? rank.rankImg : null,
    legend: String(realtime.selectedLegend ?? selected?.LegendName ?? "Unknown"),
    updatedAt: new Date().toISOString(),
    source: "live",
    progress: calculateRankProgress(rankName, rankDivision, rankScore),
  };
}
