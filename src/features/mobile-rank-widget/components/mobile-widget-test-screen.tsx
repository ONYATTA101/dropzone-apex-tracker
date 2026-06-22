/**
 * Dedicated phone preview screen for the Rank Pulse widget.
 * It mirrors the dashboard's tracked roster instead of owning separate tracking controls.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PlayerRankStatus,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import { CompactRankPulseWidget } from "@/features/mobile-rank-widget/components/compact-rank-pulse-widget";
import {
  MOBILE_WIDGET_MAX_TRACKED_PLAYERS,
  MOBILE_WIDGET_REFRESH_INTERVAL_HOURS,
  MOBILE_WIDGET_RESUME_REFRESH_COOLDOWN_MINUTES,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import {
  DEFAULT_FRIENDS,
  DEFAULT_PROFILE,
  removeLegacyDemoFriends,
} from "@/features/tracker-dashboard/config/dashboard-defaults";
import { DASHBOARD_STORAGE_KEYS } from "@/features/tracker-dashboard/config/dashboard-storage-keys";
import { fetchPlayerRankStatuses } from "@/features/tracker-dashboard/data-access/tracker-api-client";

function trackedIdentityKey(identity: TrackedPlayerIdentity) {
  return `${identity.platform}:${identity.name.toLowerCase()}`;
}

function readStoredIdentity(key: string, fallback: TrackedPlayerIdentity) {
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    const parsed = JSON.parse(saved) as TrackedPlayerIdentity;
    return parsed.name && parsed.platform ? parsed : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function readStoredFriends() {
  const saved = window.localStorage.getItem(DASHBOARD_STORAGE_KEYS.friends);
  if (!saved) return DEFAULT_FRIENDS;
  try {
    const parsed = JSON.parse(saved) as TrackedPlayerIdentity[];
    const validFriends = Array.isArray(parsed)
      ? parsed.filter((friend) => friend.name && friend.platform)
      : DEFAULT_FRIENDS;
    const cleanedFriends = removeLegacyDemoFriends(validFriends);

    if (cleanedFriends.length !== validFriends.length) {
      window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.friends, JSON.stringify(cleanedFriends));
    }

    return cleanedFriends;
  } catch {
    window.localStorage.removeItem(DASHBOARD_STORAGE_KEYS.friends);
    return DEFAULT_FRIENDS;
  }
}

export function MobileWidgetTestScreen() {
  const [profile, setProfile] = useState<TrackedPlayerIdentity>(DEFAULT_PROFILE);
  const [friendIds, setFriendIds] = useState<TrackedPlayerIdentity[]>(DEFAULT_FRIENDS);
  const [owner, setOwner] = useState<PlayerRankStatus | null>(null);
  const [friends, setFriends] = useState<PlayerRankStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading your widget preview...");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [darkThemeEnabled, setDarkThemeEnabled] = useState(true);

  const widgetPlayers = useMemo(
    () => (owner ? [owner, ...friends].slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS) : []),
    [owner, friends],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDarkThemeEnabled(window.localStorage.getItem(DASHBOARD_STORAGE_KEYS.theme) !== "light");
      setProfile(readStoredIdentity(DASHBOARD_STORAGE_KEYS.profile, DEFAULT_PROFILE));
      setFriendIds(readStoredFriends());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkThemeEnabled ? "dark" : "light";
    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.theme, darkThemeEnabled ? "dark" : "light");
  }, [darkThemeEnabled]);

  const loadWidgetData = useCallback(async (
    activeProfile: TrackedPlayerIdentity,
    activeFriends: TrackedPlayerIdentity[],
    quiet = false,
    forceRefresh = false,
  ) => {
    if (!quiet) {
      setLoading(true);
      setStatus("Refreshing widget data...");
    }

    try {
      const widgetFriends = activeFriends.slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS - 1);
      const trackedPlayers = [
        { ...activeProfile, primary: true, requestKey: trackedIdentityKey(activeProfile) },
        ...widgetFriends.map((friend) => ({
          ...friend,
          primary: false,
          requestKey: trackedIdentityKey(friend),
        })),
      ];
      const rosterResponse = await fetchPlayerRankStatuses(trackedPlayers, { forceRefresh });
      const ownerKey = trackedIdentityKey(activeProfile);
      const ownerResult = rosterResponse.results.find((result) => result.requestKey === ownerKey)?.player;

      if (!ownerResult) {
        throw new Error(rosterResponse.errors[0]?.error ?? "Could not load your widget profile.");
      }

      setOwner(ownerResult);
      setFriends(
        rosterResponse.results
          .filter((result) => result.requestKey !== ownerKey)
          .map((result) => result.player),
      );
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setStatus(
        rosterResponse.errors.length > 0
          ? `${rosterResponse.errors.length} friend${rosterResponse.errors.length === 1 ? "" : "s"} could not be loaded.`
          : "Widget is synced with your tracked squad.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not refresh widget data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWidgetData(profile, friendIds), 0);
    return () => window.clearTimeout(timer);
  }, [profile, friendIds, loadWidgetData]);

  useEffect(() => {
    const refreshMs = MOBILE_WIDGET_REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
    const interval = window.setInterval(() => void loadWidgetData(profile, friendIds, true, true), refreshMs);
    return () => window.clearInterval(interval);
  }, [profile, friendIds, loadWidgetData]);

  // Refresh when this phone preview becomes active again after matches.
  useEffect(() => {
    let lastResumeRefresh = Date.now();
    const resumeRefreshCooldownMs = MOBILE_WIDGET_RESUME_REFRESH_COOLDOWN_MINUTES * 60 * 1000;
    const refreshAfterReturn = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastResumeRefresh < resumeRefreshCooldownMs) return;
      lastResumeRefresh = now;
      void loadWidgetData(profile, friendIds, true, true);
    };

    window.addEventListener("focus", refreshAfterReturn);
    document.addEventListener("visibilitychange", refreshAfterReturn);
    return () => {
      window.removeEventListener("focus", refreshAfterReturn);
      document.removeEventListener("visibilitychange", refreshAfterReturn);
    };
  }, [profile, friendIds, loadWidgetData]);

  return (
    <main className="widget-test-shell">
      <header className="widget-mobile-topbar">
        <strong>{profile.name}</strong>
        <Link className="widget-test-link" href="/">Dashboard</Link>
      </header>

      <section className="widget-test-hero">
        <div className="widget-phone-frame" aria-label="Phone widget preview frame">
          <div className="widget-phone-notch" />
          <CompactRankPulseWidget owner={owner} friends={friends} />
          <small>Mirrors dashboard tracked squad automatically</small>
        </div>

        <section className="widget-control-panel widget-sync-panel" aria-label="Widget sync status">
          <div className="widget-test-actions">
            <button
              className="primary-button"
              disabled={loading}
              onClick={() => void loadWidgetData(profile, friendIds, false)}
              type="button"
            >
              {loading ? "Loading" : "Refresh"}
            </button>
            <button
              className={`theme-mode-button ${darkThemeEnabled ? "active" : ""}`}
              onClick={() => setDarkThemeEnabled((enabled) => !enabled)}
              type="button"
            >
              {darkThemeEnabled ? "Dark" : "Light"}
            </button>
          </div>
          <p className="widget-test-status">
            {status}
            {lastUpdated ? ` ${lastUpdated}` : ""}
          </p>

          <div className="widget-auto-sync-card">
            <span>Automatic roster</span>
            <strong>{widgetPlayers.length}/{MOBILE_WIDGET_MAX_TRACKED_PLAYERS} players shown</strong>
            <small>Track or remove squadmates on the dashboard. Rank Pulse updates from that same roster.</small>
          </div>
          <Link className="widget-test-link" href="/#tracked-squad-section">Manage tracked squad</Link>
        </section>
      </section>
    </main>
  );
}
