/**
 * Dedicated phone testing screen for the Rank Pulse widget preview.
 * This is still a web preview, not a native iOS or Android home-screen widget.
 */

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ApexPlatform,
  PlayerRankStatus,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import { CompactRankPulseWidget } from "@/features/mobile-rank-widget/components/compact-rank-pulse-widget";
import {
  MOBILE_WIDGET_MAX_TRACKED_PLAYERS,
  MOBILE_WIDGET_REFRESH_INTERVAL_HOURS,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import { setWidgetDailyChangeForTesting } from "@/features/mobile-rank-widget/utilities/widget-daily-rp-baselines";
import { DEFAULT_FRIENDS, DEFAULT_PROFILE } from "@/features/tracker-dashboard/config/dashboard-defaults";
import { DASHBOARD_STORAGE_KEYS } from "@/features/tracker-dashboard/config/dashboard-storage-keys";
import { fetchPlayerRankStatuses } from "@/features/tracker-dashboard/data-access/tracker-api-client";

function normalizePlatformInput(value: string): ApexPlatform {
  const platform = value.trim().toUpperCase();
  if (["PLAYSTATION", "PS", "PS4", "PS5"].includes(platform)) return "PS4";
  if (["XBOX", "XB", "X1", "XSX"].includes(platform)) return "X1";
  return "PC";
}

function parseFriendRosterInput(value: string, defaultPlatform: ApexPlatform): TrackedPlayerIdentity[] {
  return value
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, platform] = line.split(",").map((part) => part.trim());
      return {
        name,
        platform: platform ? normalizePlatformInput(platform) : defaultPlatform,
      };
    })
    .filter((friend) => friend.name.length > 0);
}

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
    return Array.isArray(parsed) ? parsed : DEFAULT_FRIENDS;
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
  const [baselineRefreshToken, setBaselineRefreshToken] = useState(0);

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
      const rosterResponse = await fetchPlayerRankStatuses(trackedPlayers);
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
          : "Widget data is live.",
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
    const interval = window.setInterval(() => void loadWidgetData(profile, friendIds, true), refreshMs);
    return () => window.clearInterval(interval);
  }, [profile, friendIds, loadWidgetData]);

  function updateTestRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextProfile = {
      name: String(form.get("name") ?? "").trim(),
      platform: String(form.get("platform") ?? "PC") as ApexPlatform,
    };
    const defaultFriendPlatform = String(form.get("friendPlatform") ?? nextProfile.platform) as ApexPlatform;
    const nextFriends = parseFriendRosterInput(String(form.get("friends") ?? ""), defaultFriendPlatform);

    if (!nextProfile.name) {
      setStatus("Add your Apex ID before testing the widget.");
      return;
    }

    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.profile, JSON.stringify(nextProfile));
    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.friends, JSON.stringify(nextFriends));
    setProfile(nextProfile);
    setFriendIds(nextFriends);
    setStatus("Saved this phone's widget roster.");
  }

  function testDailyRpChange(dailyChange: number) {
    if (widgetPlayers.length === 0) {
      setStatus("Load widget data before testing daily RP change.");
      return;
    }

    setWidgetDailyChangeForTesting(widgetPlayers, dailyChange);
    setBaselineRefreshToken((token) => token + 1);
    setStatus(
      dailyChange === 0
        ? "Daily RP baseline reset to current RP."
        : `Daily RP test set to ${dailyChange > 0 ? "+" : ""}${dailyChange} RP.`,
    );
  }

  return (
    <main className="widget-test-shell">
      <section className="widget-test-hero">
        <div className="widget-test-copy">
          <span className="eyebrow">Phone test mode</span>
          <h1>Rank Pulse Widget</h1>
          <p>
            Open this page on your phone to test the compact widget layout. It uses this phone&apos;s
            saved roster and refreshes every {MOBILE_WIDGET_REFRESH_INTERVAL_HOURS} hours while open.
          </p>
          <div className="widget-test-actions">
            <button
              className="primary-button"
              disabled={loading}
              onClick={() => void loadWidgetData(profile, friendIds, false)}
              type="button"
            >
              {loading ? "Refreshing..." : "Refresh widget"}
            </button>
            <button
              className={`theme-mode-button ${darkThemeEnabled ? "active" : ""}`}
              onClick={() => setDarkThemeEnabled((enabled) => !enabled)}
              type="button"
            >
              {darkThemeEnabled ? "Dark" : "Light"}
            </button>
            <Link className="widget-test-link" href="/">Dashboard</Link>
          </div>
          <p className="widget-test-status">
            {status}
            {lastUpdated ? ` Last updated ${lastUpdated}.` : ""}
          </p>
        </div>

        <div className="widget-phone-frame" aria-label="Phone widget preview frame">
          <div className="widget-phone-notch" />
          <CompactRankPulseWidget owner={owner} friends={friends} baselineRefreshToken={baselineRefreshToken} />
          <small>Preview size: under one quarter of the phone screen.</small>
          <div className="widget-baseline-tools" aria-label="Daily RP test controls">
            <span>Daily RP test</span>
            <button onClick={() => testDailyRpChange(250)} type="button">Show +250</button>
            <button onClick={() => testDailyRpChange(-250)} type="button">Show -250</button>
            <button onClick={() => testDailyRpChange(0)} type="button">Reset 0</button>
          </div>
        </div>
      </section>

      <section className="widget-test-panel">
        <div>
          <span className="eyebrow">This phone&apos;s roster</span>
          <h2>Test your Apex account and two friends</h2>
          <p>
            Friends added on your PC do not automatically copy to your phone. Add them here once,
            or open the dashboard on this phone and use the normal friend tracker.
          </p>
        </div>

        <form className="widget-test-form" onSubmit={updateTestRoster}>
          <label>
            Your Apex ID
            <input name="name" defaultValue={profile.name} placeholder="blumoat_onyatta" />
          </label>
          <label>
            Your platform
            <select name="platform" defaultValue={profile.platform}>
              <option value="PC">PC</option>
              <option value="PS4">PlayStation</option>
              <option value="X1">Xbox</option>
            </select>
          </label>
          <label>
            Friend platform default
            <select name="friendPlatform" defaultValue={profile.platform}>
              <option value="PC">PC</option>
              <option value="PS4">PlayStation</option>
              <option value="X1">Xbox</option>
            </select>
          </label>
          <label className="widget-test-form-wide">
            Friends, one per line
            <textarea
              name="friends"
              defaultValue={friendIds.map((friend) => `${friend.name}, ${friend.platform}`).join("\n")}
              placeholder={"FriendOne, PS4\nFriendTwo, PC"}
            />
          </label>
          <button className="primary-button widget-test-form-wide" type="submit">Save and test widget</button>
        </form>
      </section>
    </main>
  );
}
