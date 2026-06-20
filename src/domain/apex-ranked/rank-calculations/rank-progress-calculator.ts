/**
 * Calculates a player's progress through Apex Ranked divisions.
 * Update RANK_STEPS when EA changes the official RP thresholds.
 */

import { RankProgress } from "@/domain/apex-ranked/types/apex-tracker-types";

type RankStep = {
  rank: string;
  division: number;
  floor: number;
  label: string;
};

// CUSTOMIZE RANK RULES HERE:
// If EA changes ranked RP requirements, edit the floor values below in ascending order.
// Master and Predator have no fixed next threshold, so Master is the last fixed floor.
const RANK_STEPS: RankStep[] = [
  { rank: "Rookie", division: 4, floor: 0, label: "Rookie IV" },
  { rank: "Rookie", division: 3, floor: 250, label: "Rookie III" },
  { rank: "Rookie", division: 2, floor: 500, label: "Rookie II" },
  { rank: "Rookie", division: 1, floor: 750, label: "Rookie I" },
  { rank: "Bronze", division: 4, floor: 1000, label: "Bronze IV" },
  { rank: "Bronze", division: 3, floor: 1500, label: "Bronze III" },
  { rank: "Bronze", division: 2, floor: 2000, label: "Bronze II" },
  { rank: "Bronze", division: 1, floor: 2500, label: "Bronze I" },
  { rank: "Silver", division: 4, floor: 3000, label: "Silver IV" },
  { rank: "Silver", division: 3, floor: 3500, label: "Silver III" },
  { rank: "Silver", division: 2, floor: 4000, label: "Silver II" },
  { rank: "Silver", division: 1, floor: 4500, label: "Silver I" },
  { rank: "Gold", division: 4, floor: 5250, label: "Gold IV" },
  { rank: "Gold", division: 3, floor: 6000, label: "Gold III" },
  { rank: "Gold", division: 2, floor: 6750, label: "Gold II" },
  { rank: "Gold", division: 1, floor: 7500, label: "Gold I" },
  { rank: "Platinum", division: 4, floor: 8250, label: "Platinum IV" },
  { rank: "Platinum", division: 3, floor: 9000, label: "Platinum III" },
  { rank: "Platinum", division: 2, floor: 9750, label: "Platinum II" },
  { rank: "Platinum", division: 1, floor: 10750, label: "Platinum I" },
  { rank: "Diamond", division: 4, floor: 11750, label: "Diamond IV" },
  { rank: "Diamond", division: 3, floor: 12750, label: "Diamond III" },
  { rank: "Diamond", division: 2, floor: 13750, label: "Diamond II" },
  { rank: "Diamond", division: 1, floor: 14750, label: "Diamond I" },
  { rank: "Master", division: 0, floor: 15750, label: "Master" },
];

export function normalizeRankName(rankName: string) {
  // The API can return names with slightly different wording. Normalize them before calculations.
  const value = rankName.toLowerCase();
  if (value.includes("predator")) return "Apex Predator";
  if (value.includes("master")) return "Master";
  const match = RANK_STEPS.find((step) => step.rank.toLowerCase() === value);
  return match?.rank ?? rankName;
}

export function createRankLabel(rankName: string, division: number) {
  // This controls labels like "Platinum I". Change this if you prefer shorter names like "Plat I".
  const normalized = normalizeRankName(rankName);
  if (normalized === "Master" || normalized === "Apex Predator") return normalized;
  return `${normalized} ${["", "I", "II", "III", "IV"][division] ?? division}`;
}

export function calculateRankProgress(
  rankName: string,
  division: number,
  rankScore: number,
): RankProgress {
  // The progress bar is based on the distance between this rank floor and the next rank floor.
  const normalized = normalizeRankName(rankName);
  const index = RANK_STEPS.findIndex(
    (step) => step.rank === normalized && step.division === division,
  );

  if (index < 0 || normalized === "Apex Predator") {
    // Unknown ranks and Predator are treated as complete because there is no stable next RP target.
    return {
      currentFloor: rankScore,
      nextThreshold: null,
      remaining: null,
      earned: 0,
      divisionSize: null,
      percent: 100,
      nextLabel: "Top tier",
    };
  }

  const current = RANK_STEPS[index];
  const next = RANK_STEPS[index + 1];
  if (!next) {
    // Master is the final fixed RP floor. Predator placement depends on leaderboard position.
    return {
      currentFloor: current.floor,
      nextThreshold: null,
      remaining: null,
      earned: Math.max(0, rankScore - current.floor),
      divisionSize: null,
      percent: 100,
      nextLabel: "Apex Predator",
    };
  }

  const divisionSize = next.floor - current.floor;
  const earned = Math.max(0, rankScore - current.floor);
  return {
    currentFloor: current.floor,
    nextThreshold: next.floor,
    remaining: Math.max(0, next.floor - rankScore),
    earned,
    divisionSize,
    percent: Math.min(100, Math.max(0, (earned / divisionSize) * 100)),
    nextLabel: next.label,
  };
}

export function getRankSteps() {
  // Demo data uses this so demo ranks stay aligned with the real RP threshold table.
  return RANK_STEPS;
}
