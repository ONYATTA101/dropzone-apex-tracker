/**
 * Creates deterministic demo player ranks when no Apex API key is configured.
 * The same player name always receives the same demo rank, making local testing predictable.
 */

import { getRankSteps, calculateRankProgress } from "@/domain/apex-ranked/rank-calculations/rank-progress-calculator";
import { ApexPlatform, PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";

function hashPlayerName(value: string) {
  // This tiny hash makes demo data stable per name without needing a database.
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
}

export function createDemoPlayerRankStatus(
  name: string,
  platform: ApexPlatform,
  primary = false,
): PlayerRankStatus {
  const rankSteps = getRankSteps();
  const hash = hashPlayerName(name);
  // Change these rank filters if you want demo players to appear in different tiers.
  const demoSteps = primary
    ? rankSteps.filter((step) => step.rank === "Platinum")
    : rankSteps.filter((step) => ["Gold", "Platinum", "Diamond"].includes(step.rank));
  const step = demoSteps[hash % demoSteps.length];
  const globalIndex = rankSteps.findIndex(
    (item) => item.rank === step.rank && item.division === step.division,
  );
  const next = rankSteps[globalIndex + 1];
  const size = next ? next.floor - step.floor : 1000;
  const score = step.floor + (hash % Math.max(1, size - 40));
  // Add or remove legends here if you want different demo labels.
  const legends = ["Wraith", "Lifeline", "Pathfinder", "Bangalore", "Bloodhound", "Horizon"];

  return {
    id: `demo-${platform}-${name}`,
    name,
    platform,
    avatar: null,
    level: 150 + (hash % 650),
    rankName: step.rank,
    rankDivision: step.division,
    rankScore: score,
    rankPosition: null,
    rankImage: null,
    legend: legends[hash % legends.length],
    updatedAt: new Date().toISOString(),
    source: "demo",
    progress: calculateRankProgress(step.rank, step.division, score),
  };
}
