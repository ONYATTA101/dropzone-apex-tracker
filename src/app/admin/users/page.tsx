/**
 * Admin users route.
 * Protect this page with DROPZONE_ADMIN_SECRET before using it in production.
 */

import { DropzoneAdminUsersPanel } from "@/features/dropzone-auth/components/dropzone-admin-users-panel";

export default function AdminUsersPage() {
  return <DropzoneAdminUsersPanel />;
}
