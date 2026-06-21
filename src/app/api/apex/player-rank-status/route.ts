/**
 * Server-only GET endpoint for a player's current Apex rank status.
 * It protects the API key from the browser and returns demo data when no key is configured.
 *
 * Next.js requires API handler files to be named route.ts; the descriptive parent folder
 * defines this endpoint's public URL and purpose.
 */

import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/app/api/_shared/api-request-guard";
import {
  ApexPlayerRankError,
  getPlayerRankStatus,
  normalizeApexPlatform,
} from "@/integrations/apex-legends-status/player-rank-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const guarded = guardApiRequest(request, {
    limit: 80,
    routeKey: "player-rank-status",
    windowMs: 60_000,
  });
  if (guarded) return guarded;

  // Query parameters are validated here before calling the external Apex provider.
  const player = request.nextUrl.searchParams.get("player")?.trim();
  const platform = normalizeApexPlatform(request.nextUrl.searchParams.get("platform"));
  const primary = request.nextUrl.searchParams.get("primary") === "true";
  const forceRefresh = request.nextUrl.searchParams.get("forceRefresh") === "true";

  if (!player) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getPlayerRankStatus({ name: player, platform }, primary, { forceRefresh }));
  } catch (error) {
    if (error instanceof ApexPlayerRankError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Could not connect to the Apex stats service." },
      { status: 502 },
    );
  }
}
