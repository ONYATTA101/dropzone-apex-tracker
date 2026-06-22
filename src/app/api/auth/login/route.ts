/**
 * Signs into an existing Dropzone account and refreshes safe user metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { setDropzoneSessionCookie } from "@/features/dropzone-auth/server/dropzone-auth-cookies";
import { DropzoneAuthError, loginDropzoneAccount } from "@/features/dropzone-auth/server/dropzone-auth-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; password?: string; platform?: string }
    | null;

  try {
    const result = await loginDropzoneAccount(
      {
        name: String(body?.name ?? ""),
        platform: body?.platform === "PS4" || body?.platform === "X1" ? body.platform : "PC",
      },
      String(body?.password ?? ""),
    );
    const response = NextResponse.json({
      player: result.player,
      user: result.user,
    });
    setDropzoneSessionCookie(response, result.sessionCookie);
    return response;
  } catch (error) {
    const status = error instanceof DropzoneAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign in." },
      { status },
    );
  }
}
