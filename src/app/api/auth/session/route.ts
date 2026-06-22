/**
 * Returns the currently signed-in Dropzone user from the secure session cookie.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DROPZONE_SESSION_COOKIE,
  getSessionUser,
  verifySessionCookieValue,
} from "@/features/dropzone-auth/server/dropzone-auth-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionCookieValue(cookieStore.get(DROPZONE_SESSION_COOKIE)?.value);
  const user = await getSessionUser(session);

  return NextResponse.json({ user });
}
