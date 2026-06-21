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
const PLAYER_RANK_FRESH_CACHE_MS = 5 * 60 * 1000;
const PLAYER_RANK_STALE_CACHE_MS = 24 * 60 * 60 * 1000;

type CachedPlayerRankStatus = {
  cachedAt: number;
  value: PlayerRankStatus;
};

declare global {
  var __dropzonePlayerRankCache: Map<string, CachedPlayerRankStatus> | undefined;
}

const playerRankCache = globalThis.__dropzonePlayerRankCache ?? new Map<string, CachedPlayerRankStatus>();
globalThis.__dropzonePlayerRankCache = playerRankCache;

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

function getPlayerRankCacheKey(player: string, platform: ApexPlatform) {
  return `${platform}:${player.trim().toLowerCase()}`;
}

function readCachedPlayerRank(cacheKey: string, maxAgeMs: number) {
  const cached = playerRankCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.cachedAt > maxAgeMs) {
    return null;
  }

  return cached.value;
}

function writeCachedPlayerRank(cacheKey: string, value: PlayerRankStatus) {
  playerRankCache.set(cacheKey, {
    cachedAt: Date.now(),
    value,
  });
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

  const cacheKey = getPlayerRankCacheKey(player, platform);
  const freshCachedPlayer = readCachedPlayerRank(cacheKey, PLAYER_RANK_FRESH_CACHE_MS);
  if (freshCachedPlayer) return freshCachedPlayer;

  const params = new URLSearchParams({ player, platform });
  let response: Response;
  try {
    response = await fetch(`https://api.apexlegendsstatus.com/bridge?${params}`, {
      headers: { Authorization: apiKey },
      // Keep the browser/CDN from caching; the small in-memory cache above controls provider load.
      cache: "no-store",
    });
  } catch {
    const staleCachedPlayer = readCachedPlayerRank(cacheKey, PLAYER_RANK_STALE_CACHE_MS);
    if (staleCachedPlayer) return staleCachedPlayer;
    throw new ApexPlayerRankError("Could not connect to the Apex stats service.", 502);
  }

  if (!response.ok) {
    const staleCachedPlayer = response.status === 429
      ? readCachedPlayerRank(cacheKey, PLAYER_RANK_STALE_CACHE_MS)
      : null;
    if (staleCachedPlayer) return staleCachedPlayer;

    throw new ApexPlayerRankError(providerErrorMessage(response.status), response.status);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const normalized = normalizePlayerRankResponse(data, player, platform);
  writeCachedPlayerRank(cacheKey, normalized);
  return normalized;
}
