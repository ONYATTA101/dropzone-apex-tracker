/**
 * Dedicated phone testing screen for the Rank Pulse widget preview.
 * This is still a web preview, not a native iOS or Android home-screen widget.
 */

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  ApexPlatform,
  PlayerRankStatus,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import { CompactRankPulseWidget } from "@/features/mobile-rank-widget/components/compact-rank-pulse-widget";
import {
  MOBILE_WIDGET_MAX_TRACKED_PLAYERS,
  MOBILE_WIDGET_REFRESH_INTERVAL_HOURS,
  MOBILE_WIDGET_RESUME_REFRESH_COOLDOWN_MINUTES,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import { setWidgetDailyChangeForTesting } from "@/features/mobile-rank-widget/utilities/widget-daily-rp-baselines";
import {
  DEFAULT_FRIENDS,
  DEFAULT_PROFILE,
  PLATFORM_DISPLAY_NAME,
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
  const [baselineRefreshToken, setBaselineRefreshToken] = useState(0);

  const widgetPlayers = useMemo(
    () => (owner ? [owner, ...friends].slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS) : []),
    [owner, friends],
  );
  const widgetFriendIds = useMemo(
    () => friendIds.slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS - 1),
    [friendIds],
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

  // Refresh when this phone preview becomes active again after matches.
  useEffect(() => {
    let lastResumeRefresh = Date.now();
    const resumeRefreshCooldownMs = MOBILE_WIDGET_RESUME_REFRESH_COOLDOWN_MINUTES * 60 * 1000;
    const refreshAfterReturn = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastResumeRefresh < resumeRefreshCooldownMs) return;
      lastResumeRefresh = now;
      void loadWidgetData(profile, friendIds, true);
    };

    window.addEventListener("focus", refreshAfterReturn);
    document.addEventListener("visibilitychange", refreshAfterReturn);
    return () => {
      window.removeEventListener("focus", refreshAfterReturn);
      document.removeEventListener("visibilitychange", refreshAfterReturn);
    };
  }, [profile, friendIds, loadWidgetData]);

  function updateTestRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextProfile = {
      name: String(form.get("name") ?? "").trim(),
      platform: String(form.get("platform") ?? "PC") as ApexPlatform,
    };
    const friendName = String(form.get("friendName") ?? "").trim();
    const friendPlatform = String(form.get("friendPlatform") ?? nextProfile.platform) as ApexPlatform;

    if (!nextProfile.name) {
      setStatus("Add your Apex ID before testing the widget.");
      return;
    }

    let nextFriends = [...friendIds];
    if (friendName) {
      const friendToAdd = { name: friendName, platform: friendPlatform };
      const friendKey = trackedIdentityKey(friendToAdd);
      const existingKeys = new Set(nextFriends.map((friend) => trackedIdentityKey(friend)));

      if (existingKeys.has(friendKey)) {
        setStatus(`${friendName} is already tracked.`);
      } else if (widgetFriendIds.length >= MOBILE_WIDGET_MAX_TRACKED_PLAYERS - 1) {
        setStatus("Remove a friend before adding another.");
      } else {
        nextFriends = [...nextFriends, friendToAdd];
        setStatus(`${friendName} added.`);
      }
    } else {
      setStatus("Saved this phone's widget roster.");
    }

    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.profile, JSON.stringify(nextProfile));
    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.friends, JSON.stringify(nextFriends));
    setProfile(nextProfile);
    setFriendIds(nextFriends);
  }

  function removeTrackedFriend(identity: TrackedPlayerIdentity) {
    const updated = friendIds.filter((friend) => trackedIdentityKey(friend) !== trackedIdentityKey(identity));
    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.friends, JSON.stringify(updated));
    setFriendIds(updated);
    setStatus(`${identity.name} removed.`);
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
      <header className="widget-mobile-topbar">
        <strong>{profile.name}</strong>
        <Link className="widget-test-link" href="/">Dashboard</Link>
      </header>

      <section className="widget-test-hero">
        <div className="widget-phone-frame" aria-label="Phone widget preview frame">
          <div className="widget-phone-notch" />
          <CompactRankPulseWidget owner={owner} friends={friends} baselineRefreshToken={baselineRefreshToken} />
          <div className="widget-baseline-tools" aria-label="Daily RP test controls">
            <span>Daily RP test</span>
            <button onClick={() => testDailyRpChange(250)} type="button">+250</button>
            <button onClick={() => testDailyRpChange(-250)} type="button">-250</button>
            <button onClick={() => testDailyRpChange(0)} type="button">Reset</button>
          </div>
        </div>

        <section className="widget-control-panel" aria-label="Widget controls">
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

          <div className="tracked-player-list" aria-label="Tracked players">
            <article className="tracked-player-chip owner">
              <span>You</span>
              <strong>{profile.name}</strong>
              <small>{PLATFORM_DISPLAY_NAME[profile.platform]}</small>
            </article>
            {widgetFriendIds.map((friend) => (
              <article className="tracked-player-chip" key={trackedIdentityKey(friend)}>
                <span>Friend</span>
                <strong>{friend.name}</strong>
                <small>{PLATFORM_DISPLAY_NAME[friend.platform]}</small>
                <button
                  aria-label={`Remove ${friend.name}`}
                  onClick={() => removeTrackedFriend(friend)}
                  type="button"
                >
                  <Trash2 size={13} />
                </button>
              </article>
            ))}
          </div>

          <form className="widget-test-form compact" onSubmit={updateTestRoster}>
            <label>
              You
              <input name="name" defaultValue={profile.name} placeholder="Apex ID" />
            </label>
            <label>
              Platform
              <select name="platform" defaultValue={profile.platform}>
                <option value="PC">PC</option>
                <option value="PS4">PlayStation</option>
                <option value="X1">Xbox</option>
              </select>
            </label>
            <label>
              Track squadmate
              <input name="friendName" placeholder="Squadmate ID" />
            </label>
            <label>
              Platform
              <select name="friendPlatform" defaultValue={profile.platform}>
                <option value="PC">PC</option>
                <option value="PS4">PlayStation</option>
                <option value="X1">Xbox</option>
              </select>
            </label>
            <button className="primary-button widget-test-form-wide" type="submit">Save</button>
          </form>
        </section>
      </section>
    </main>
  );
}
