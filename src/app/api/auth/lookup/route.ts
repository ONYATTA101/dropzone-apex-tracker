/**
 * Checks whether an Apex ID exists and whether a Dropzone account is already registered.
 */

import { NextRequest, NextResponse } from "next/server";
import { lookupDropzoneAccount, DropzoneAuthError } from "@/features/dropzone-auth/server/dropzone-auth-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { name?: string; platform?: string } | null;

  try {
    const result = await lookupDropzoneAccount({
      name: String(body?.name ?? ""),
      platform: body?.platform === "PS4" || body?.platform === "X1" ? body.platform : "PC",
    });

    return NextResponse.json({
      accountExists: result.accountExists,
      player: {
        name: result.player.name,
        platform: result.player.platform,
        rankDivision: result.player.rankDivision,
        rankName: result.player.rankName,
        rankScore: result.player.rankScore,
      },
      storageMode: result.storageMode,
    });
  } catch (error) {
    const status = error instanceof DropzoneAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not check Dropzone account." },
      { status },
    );
  }
}
