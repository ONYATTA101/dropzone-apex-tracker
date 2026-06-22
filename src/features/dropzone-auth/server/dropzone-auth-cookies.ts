/**
 * Shared helpers for setting and clearing Dropzone auth cookies from API routes.
 */

import { NextResponse } from "next/server";
import {
  DROPZONE_SESSION_COOKIE,
  DROPZONE_SESSION_TTL_SECONDS,
} from "@/features/dropzone-auth/server/dropzone-auth-service";

export function setDropzoneSessionCookie(response: NextResponse, value: string) {
  response.cookies.set(DROPZONE_SESSION_COOKIE, value, {
    httpOnly: true,
    maxAge: DROPZONE_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearDropzoneSessionCookie(response: NextResponse) {
  response.cookies.set(DROPZONE_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
