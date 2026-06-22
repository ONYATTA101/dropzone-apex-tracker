/**
 * Clears the Dropzone session cookie.
 */

import { NextResponse } from "next/server";
import { clearDropzoneSessionCookie } from "@/features/dropzone-auth/server/dropzone-auth-cookies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearDropzoneSessionCookie(response);
  return response;
}
