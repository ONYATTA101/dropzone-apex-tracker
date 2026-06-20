/**
 * Server-only GET endpoint for the current and next Apex ranked maps.
 * It protects the API key and supplies demo rotation data for key-free development.
 *
 * Next.js requires API handler files to be named route.ts; the descriptive parent folder
 * defines this endpoint's public URL and purpose.
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { guardApiRequest } from "@/app/api/_shared/api-request-guard";
import { createDemoRankedMapRotation } from "@/domain/apex-ranked/demo-data/demo-ranked-map-factory";
import { normalizeRankedMapResponse } from "@/integrations/apex-legends-status/ranked-map-response-normalizer";

export async function GET(request: NextRequest) {
  const guarded = guardApiRequest(request, {
    limit: 120,
    routeKey: "ranked-map-rotation",
    windowMs: 60_000,
  });
  if (guarded) return guarded;

  const apiKey = process.env.APEX_API_KEY;
  // Demo mode lets the map card render when no external API key is available.
  if (!apiKey) return NextResponse.json(createDemoRankedMapRotation());

  try {
    const response = await fetch("https://api.apexlegendsstatus.com/maprotation?version=2", {
      headers: { Authorization: apiKey },
      // Map data changes on rotation, but 60 seconds is a good lightweight cache.
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Ranked map rotation is temporarily unavailable." },
        { status: response.status },
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return NextResponse.json(normalizeRankedMapResponse(data));
  } catch {
    return NextResponse.json(
      { error: "Could not connect to the map rotation service." },
      { status: 502 },
    );
  }
}
