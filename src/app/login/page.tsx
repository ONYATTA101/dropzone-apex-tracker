/**
 * Dropzone login route.
 * Users verify their Apex ID before creating or using a Dropzone password.
 */

import { DropzoneLoginPanel } from "@/features/dropzone-auth/components/dropzone-login-panel";

export default function LoginPage() {
  return <DropzoneLoginPanel />;
}
