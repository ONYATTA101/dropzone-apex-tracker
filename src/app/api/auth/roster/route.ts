/**
 * Account-synced roster for the signed-in Dropzone user.
 * GET returns the friends + previously-tracked players saved to the account
 * (null fields mean "never synced", so the client keeps its local copy).
 * PUT saves the current roster so it follows the user to any device.
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  DROPZONE_SESSION_COOKIE,
  DropzoneAuthError,
  getDropzoneAccountRoster,
  updateDropzoneAccountRoster,
  verifySessionCookieValue,
} from "@/features/dropzone-auth/server/dropzone-auth-service";
import { TrackedPlayerIdentity } from "@/domain/apex-ranked/types/apex-tracker-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSession() {
  const cookieStore = await cookies();
  try {
    return verifySessionCookieValue(cookieStore.get(DROPZONE_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

function errorResponse(error: unknown) {
  const status = error instanceof DropzoneAuthError ? error.status : 500;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Could not sync your roster." },
    { status },
  );
}

export async function GET() {
  try {
    const roster = await getDropzoneAccountRoster(await getSession());
    return NextResponse.json(roster, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { friends?: TrackedPlayerIdentity[]; trackedHistory?: unknown[] }
    | null;

  try {
    const roster = await updateDropzoneAccountRoster(await getSession(), {
      friends: body?.friends,
      trackedHistory: body?.trackedHistory as Parameters<typeof updateDropzoneAccountRoster>[1]["trackedHistory"],
    });
    return NextResponse.json(roster, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
