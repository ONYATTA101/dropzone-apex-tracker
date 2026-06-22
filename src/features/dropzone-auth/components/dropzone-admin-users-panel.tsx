/**
 * Admin user viewer for safe Dropzone account metadata.
 * The admin secret unlocks user visibility without exposing password hashes.
 */

"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import { ApexPlatform } from "@/domain/apex-ranked/types/apex-tracker-types";
import { PLATFORM_DISPLAY_NAME } from "@/features/tracker-dashboard/config/dashboard-defaults";
import { formatNumber } from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

type AdminUser = {
  apexName: string;
  createdAt: string;
  id: string;
  lastLoginAt: string | null;
  loginCount: number;
  platform: ApexPlatform;
  verifiedRankDivision: number | null;
  verifiedRankName: string | null;
  verifiedRankScore: number | null;
};

type AdminUsersResponse = {
  storageMode: string;
  updatedAt: string;
  userCount: number;
  users: AdminUser[];
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function DropzoneAdminUsersPanel() {
  const [adminSecret, setAdminSecret] = useState("");
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${adminSecret}`,
        },
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error ?? "Could not load users.");
      setData(responseData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page admin-users-page">
      <section className="auth-card admin-users-card">
        <div className="auth-card-header">
          <span className="auth-icon"><Users size={22} /></span>
          <div>
            <span className="eyebrow">Admin console</span>
            <h1>Logged-in users</h1>
            <p>View account metadata and login activity. Passwords are hashed and never shown.</p>
          </div>
        </div>

        <form className="auth-form admin-secret-form" onSubmit={loadUsers}>
          <label>
            Admin secret
            <input
              autoComplete="off"
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Enter DROPZONE_ADMIN_SECRET"
              type="password"
              value={adminSecret}
            />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            <ShieldCheck size={16} />
            {loading ? "Checking..." : "Unlock users"}
          </button>
        </form>

        {error && <div className="auth-message error">{error}</div>}

        {data && (
          <>
            <div className="admin-summary-grid">
              <div><span>Total users</span><strong>{data.userCount}</strong></div>
              <div><span>Storage</span><strong>{data.storageMode}</strong></div>
              <div><span>Updated</span><strong>{formatDate(data.updatedAt)}</strong></div>
            </div>
            <div className="admin-user-list">
              {data.users.map((user) => (
                <article className="admin-user-card" key={user.id}>
                  <div>
                    <strong>{user.apexName}</strong>
                    <span>{PLATFORM_DISPLAY_NAME[user.platform]}</span>
                  </div>
                  <div>
                    <span>Rank</span>
                    <strong>
                      {user.verifiedRankName
                        ? `${user.verifiedRankName} ${user.verifiedRankDivision ?? ""}`
                        : "Unknown"}
                    </strong>
                    {typeof user.verifiedRankScore === "number" && <small>{formatNumber(user.verifiedRankScore)} RP</small>}
                  </div>
                  <div>
                    <span>Logins</span>
                    <strong>{user.loginCount}</strong>
                    <small>Last: {formatDate(user.lastLoginAt)}</small>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{formatDate(user.createdAt)}</strong>
                  </div>
                </article>
              ))}
              {data.users.length === 0 && <div className="auth-message">No Dropzone accounts yet.</div>}
            </div>
          </>
        )}

        <div className="auth-footer">
          <Link href="/">Back to dashboard</Link>
          <Link href="/login">Login page</Link>
        </div>
      </section>
    </main>
  );
}
