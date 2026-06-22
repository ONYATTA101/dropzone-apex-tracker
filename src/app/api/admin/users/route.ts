/**
 * Admin-only user list endpoint.
 * It returns account metadata and never returns password hashes or salts.
 */

import { NextRequest, NextResponse } from "next/server";
import { DropzoneAuthError, listAdminUsers } from "@/features/dropzone-auth/server/dropzone-auth-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerSecret = authHeader.replace(/^Bearer\s+/i, "");
  const querySecret = request.nextUrl.searchParams.get("secret") ?? "";

  try {
    return NextResponse.json(await listAdminUsers(bearerSecret || querySecret));
  } catch (error) {
    const status = error instanceof DropzoneAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load admin users." },
      { status },
    );
  }
}
