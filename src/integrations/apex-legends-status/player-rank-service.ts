/**
 * Server-side player-rank service shared by single and batch API routes.
 * Centralizing this logic avoids duplicate provider calls, error mapping, and demo fallback code.
 */

import { createDemoPlayerRankStatus } from "@/domain/apex-ranked/demo-data/demo-player-rank-factory";
import {
  ApexPlatform,
  PlayerRankStatus,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import { normalizePlayerRankResponse } from "@/integrations/apex-legends-status/player-rank-response-normalizer";

const VALID_PLATFORMS = new Set(["PC", "PS4", "X1"]);

export class ApexPlayerRankError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApexPlayerRankError";
  }
}

export function normalizeApexPlatform(value: string | null | undefined): ApexPlatform {
  const platform = value?.toUpperCase() ?? "PC";
  return (VALID_PLATFORMS.has(platform) ? platform : "PC") as ApexPlatform;
}

function providerErrorMessage(status: number) {
  const messages: Record<number, string> = {
    403: "The Apex API key is invalid.",
    404: "That Apex player could not be found.",
    429: "The Apex API rate limit was reached. Try again shortly.",
  };

  return messages[status] ?? "Apex player data is temporarily unavailable.";
}

export async function getPlayerRankStatus(
  identity: TrackedPlayerIdentity,
  primary = false,
): Promise<PlayerRankStatus> {
  const apiKey = process.env.APEX_API_KEY;
  const player = identity.name.trim();
  const platform = normalizeApexPlatform(identity.platform);

  if (!player) {
    throw new ApexPlayerRankError("Player name is required.", 400);
  }

  if (!apiKey) {
    // Demo fallback keeps UI development fast and avoids wasting provider calls.
    return createDemoPlayerRankStatus(player, platform, primary);
  }

  const params = new URLSearchParams({ player, platform });
  const response = await fetch(`https://api.apexlegendsstatus.com/bridge?${params}`, {
    headers: { Authorization: apiKey },
    // Provider data is cached server-side for one minute to reduce duplicate requests.
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new ApexPlayerRankError(providerErrorMessage(response.status), response.status);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return normalizePlayerRankResponse(data, player, platform);
}
