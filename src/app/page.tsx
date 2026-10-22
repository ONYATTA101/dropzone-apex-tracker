/**
 * Home route entry point.
 * Next.js requires this route entry file to be named page.tsx.
 *
 * The dashboard is gated: visitors without a valid Dropzone session
 * (Apex ID + Dropzone password, see /login) are sent to the login page first.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ApexTrackerDashboard from "@/features/tracker-dashboard/components/apex-tracker-dashboard";
import {
  DROPZONE_SESSION_COOKIE,
  getSessionUser,
  verifySessionCookieValue,
} from "@/features/dropzone-auth/server/dropzone-auth-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const cookieStore = await cookies();

  let user = null;
  try {
    const session = verifySessionCookieValue(cookieStore.get(DROPZONE_SESSION_COOKIE)?.value);
    user = await getSessionUser(session);
  } catch {
    // A missing session secret or unreadable auth store must never lock
    // people into a blank page — treat it as "not signed in".
    user = null;
  }

  if (!user) {
    redirect("/login");
  }

  return <ApexTrackerDashboard />;
}
