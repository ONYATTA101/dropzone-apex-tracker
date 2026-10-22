/**
 * Dropzone login route.
 * Users verify their Apex ID before creating or using a Dropzone password.
 * Already signed-in users go straight to the gated dashboard.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DropzoneLoginPanel } from "@/features/dropzone-auth/components/dropzone-login-panel";
import {
  DROPZONE_SESSION_COOKIE,
  getSessionUser,
  verifySessionCookieValue,
} from "@/features/dropzone-auth/server/dropzone-auth-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage() {
  const cookieStore = await cookies();

  let signedIn = false;
  try {
    const session = verifySessionCookieValue(cookieStore.get(DROPZONE_SESSION_COOKIE)?.value);
    signedIn = Boolean(await getSessionUser(session));
  } catch {
    // Stay on the login page if the session cannot be verified.
    signedIn = false;
  }

  // redirect() throws a control-flow error, so it must stay outside try/catch.
  if (signedIn) {
    redirect("/");
  }

  return <DropzoneLoginPanel />;
}
