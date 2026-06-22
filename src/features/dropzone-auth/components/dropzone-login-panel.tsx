/**
 * Client-side login/create-account panel for Dropzone accounts.
 * It first verifies the Apex ID, then either asks for login or account creation.
 */

"use client";

import { ChevronRight, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApexPlatform } from "@/domain/apex-ranked/types/apex-tracker-types";
import { PLATFORM_DISPLAY_NAME } from "@/features/tracker-dashboard/config/dashboard-defaults";
import { DASHBOARD_STORAGE_KEYS } from "@/features/tracker-dashboard/config/dashboard-storage-keys";
import { formatNumber } from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

type LookupPlayer = {
  name: string;
  platform: ApexPlatform;
  rankDivision: number;
  rankName: string;
  rankScore: number;
};

type PublicUser = {
  apexName: string;
  platform: ApexPlatform;
};

type AuthStep = "lookup" | "login" | "register";

const PLATFORM_OPTIONS: ApexPlatform[] = ["PC", "PS4", "X1"];

export function DropzoneLoginPanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<ApexPlatform>("PS4");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [player, setPlayer] = useState<LookupPlayer | null>(null);
  const [step, setStep] = useState<AuthStep>("lookup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await response.json();
      setSessionUser(data.user ?? null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function saveProfileAndOpenDashboard(nextPlayer: LookupPlayer | PublicUser) {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEYS.profile,
      JSON.stringify({ name: "name" in nextPlayer ? nextPlayer.name : nextPlayer.apexName, platform: nextPlayer.platform }),
    );
    router.push("/");
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/lookup", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not check Apex ID.");

      setPlayer(data.player);
      setStep(data.accountExists ? "login" : "register");
      setStatus(data.accountExists
        ? "Dropzone account found. Enter your password."
        : "Apex ID found. Create your Dropzone password.");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Could not check Apex ID.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!player) return;
    if (step === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(step === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: player.name, password, platform: player.platform }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not sign in.");

      setStatus(step === "register" ? "Dropzone account created." : "Signed in.");
      saveProfileAndOpenDashboard(data.player ?? data.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionUser(null);
    setStatus("Signed out.");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-header">
          <span className="auth-icon"><ShieldCheck size={22} /></span>
          <div>
            <span className="eyebrow">Dropzone account</span>
            <h1>Sign in with Apex ID</h1>
            <p>We verify the Apex account first, then store a hashed Dropzone password.</p>
          </div>
        </div>

        {sessionUser && (
          <div className="auth-session-card">
            <div>
              <span>Signed in as</span>
              <strong>{sessionUser.apexName}</strong>
              <small>{PLATFORM_DISPLAY_NAME[sessionUser.platform]}</small>
            </div>
            <button onClick={logout} type="button"><LogOut size={14} /> Sign out</button>
          </div>
        )}

        {step === "lookup" ? (
          <form className="auth-form" onSubmit={handleLookup}>
            <label>
              Apex ID
              <input
                autoComplete="username"
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder="blumoat_onyatta"
                value={name}
              />
            </label>
            <label>
              Platform
              <select onChange={(event) => setPlatform(event.target.value as ApexPlatform)} value={platform}>
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option} value={option}>{PLATFORM_DISPLAY_NAME[option]}</option>
                ))}
              </select>
            </label>
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Checking..." : "Check Apex ID"}
              <ChevronRight size={17} />
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitPassword}>
            {player && (
              <div className="auth-player-confirmation">
                <span>Verified Apex account</span>
                <strong>{player.name}</strong>
                <small>{player.rankName} {player.rankDivision} | {formatNumber(player.rankScore)} RP</small>
              </div>
            )}
            <label>
              Dropzone password
              <input
                autoComplete={step === "register" ? "new-password" : "current-password"}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                type="password"
                value={password}
              />
            </label>
            {step === "register" && (
              <label>
                Confirm password
                <input
                  autoComplete="new-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat password"
                  type="password"
                  value={confirmPassword}
                />
              </label>
            )}
            <button className="primary-button" disabled={loading} type="submit">
              <LockKeyhole size={16} />
              {loading ? "Working..." : step === "register" ? "Create account" : "Sign in"}
            </button>
            <button className="ghost-button" onClick={() => { setStep("lookup"); setPassword(""); setConfirmPassword(""); }} type="button">
              Use another Apex ID
            </button>
          </form>
        )}

        {error && <div className="auth-message error">{error}</div>}
        {status && <div className="auth-message success">{status}</div>}

        <div className="auth-footer">
          <Link href="/">Back to dashboard</Link>
          <Link href="/admin/users">Admin users</Link>
        </div>
      </section>
    </main>
  );
}
