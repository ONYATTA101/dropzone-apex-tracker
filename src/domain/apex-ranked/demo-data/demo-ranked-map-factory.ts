/**
 * Supplies a usable ranked-map rotation during local development without an API key.
 */

import { RankedMapRotation } from "@/domain/apex-ranked/types/apex-tracker-types";

export function createDemoRankedMapRotation(): RankedMapRotation {
  // Change these names if you want demo mode to preview a different map rotation.
  return {
    current: "Broken Moon",
    next: "Storm Point",
    asset: null,
    endsAt: Math.floor(Date.now() / 1000) + 60 * 83,
    source: "demo",
  };
}
