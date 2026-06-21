/**
 * Main interactive dashboard for profile setup, friend tracking, RP progress, and map rotation.
 * Data fetching and smaller visual components are delegated to purpose-specific modules.
 */

"use client";

import {
  Activity,
  ChevronRight,
  Clock3,
  Crosshair,
  MapPinned,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createRankLabel } from "@/domain/apex-ranked/rank-calculations/rank-progress-calculator";
import {
  ApexPlatform,
  PlayerRankStatus,
  RankedMapRotation,
  TrackedPlayerIdentity,
} from "@/domain/apex-ranked/types/apex-tracker-types";
import { CompactRankPulseWidget } from "@/features/mobile-rank-widget/components/compact-rank-pulse-widget";
import {
  MOBILE_WIDGET_MAX_TRACKED_PLAYERS,
  MOBILE_WIDGET_REFRESH_INTERVAL_HOURS,
  MOBILE_WIDGET_RESUME_REFRESH_COOLDOWN_MINUTES,
} from "@/features/mobile-rank-widget/config/mobile-widget-settings";
import { setWidgetDailyChangeForTesting } from "@/features/mobile-rank-widget/utilities/widget-daily-rp-baselines";
import { FriendRankCard } from "@/features/tracker-dashboard/components/friend-rank-card";
import { RankBadge } from "@/features/tracker-dashboard/components/rank-badge";
import {
  DEFAULT_FRIENDS,
  DEFAULT_PROFILE,
  PLATFORM_DISPLAY_NAME,
} from "@/features/tracker-dashboard/config/dashboard-defaults";
import { DASHBOARD_STORAGE_KEYS } from "@/features/tracker-dashboard/config/dashboard-storage-keys";
import {
  fetchPlayerRankStatuses,
  fetchRankedMapRotation,
} from "@/features/tracker-dashboard/data-access/tracker-api-client";
import {
  createPlayerInitials,
  formatMapCountdown,
  formatNumber,
} from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

type Toast = { message: string; kind: "success" | "error" } | null;

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

export default function ApexTrackerDashboard() {
  const [profile, setProfile] = useState<TrackedPlayerIdentity>(DEFAULT_PROFILE);
  const [friendIds, setFriendIds] = useState<TrackedPlayerIdentity[]>(DEFAULT_FRIENDS);
  const [me, setMe] = useState<PlayerRankStatus | null>(null);
  const [friends, setFriends] = useState<PlayerRankStatus[]>([]);
  const [rankedMap, setRankedMap] = useState<RankedMapRotation | null>(null);
  const [countdown, setCountdown] = useState("00:00:00");
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriendForm, setShowFriendForm] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [darkThemeEnabled, setDarkThemeEnabled] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [widgetBaselineRefreshToken, setWidgetBaselineRefreshToken] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDarkThemeEnabled(window.localStorage.getItem(DASHBOARD_STORAGE_KEYS.theme) !== "light");
      setThemeLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // The dashboard and widget share the same theme attribute.
  useEffect(() => {
    document.documentElement.dataset.theme = darkThemeEnabled ? "dark" : "light";
    if (themeLoaded) {
      window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.theme, darkThemeEnabled ? "dark" : "light");
    }
  }, [darkThemeEnabled, themeLoaded]);

  // Restore the player's locally saved tracking choices after the browser mounts.
  // If you change storage keys, update the constants above and clear old browser storage.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedProfile = window.localStorage.getItem(DASHBOARD_STORAGE_KEYS.profile);
      const savedFriends = window.localStorage.getItem(DASHBOARD_STORAGE_KEYS.friends);
      try {
        if (savedProfile) setProfile(JSON.parse(savedProfile));
        if (savedFriends) setFriendIds(JSON.parse(savedFriends));
      } catch {
        window.localStorage.removeItem(DASHBOARD_STORAGE_KEYS.profile);
        window.localStorage.removeItem(DASHBOARD_STORAGE_KEYS.friends);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Refresh the main player, every friend, and the map concurrently for a fast dashboard load.
  const loadData = useCallback(async (
    activeProfile: TrackedPlayerIdentity,
    activeFriends: TrackedPlayerIdentity[],
    quiet = false,
    showSuccessToast = false,
  ) => {
    await Promise.resolve();
    if (!quiet) setLoading(true);
    try {
      const trackedPlayers = [
        { ...activeProfile, primary: true, requestKey: trackedIdentityKey(activeProfile) },
        ...activeFriends.map((friend) => ({
          ...friend,
          primary: false,
          requestKey: trackedIdentityKey(friend),
        })),
      ];
      const [rosterResponse, mapResponse] = await Promise.all([
        fetchPlayerRankStatuses(trackedPlayers),
        fetchRankedMapRotation(),
      ]);
      const ownerKey = trackedIdentityKey(activeProfile);
      const playerResult = rosterResponse.results.find((result) => result.requestKey === ownerKey)?.player;

      if (!playerResult) {
        throw new Error(rosterResponse.errors[0]?.error ?? "Could not load your player profile.");
      }

      setMe(playerResult);
      setFriends(
        rosterResponse.results
          .filter((result) => result.requestKey !== ownerKey)
          .map((result) => result.player),
      );
      setRankedMap(mapResponse);
      if (rosterResponse.errors.length > 0) {
        setToast({
          message: `${rosterResponse.errors.length} player${rosterResponse.errors.length === 1 ? "" : "s"} could not be loaded.`,
          kind: "error",
        });
      } else if (showSuccessToast) {
        setToast({ message: "Tracker data refreshed.", kind: "success" });
      }
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Could not refresh tracker.", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // This effect reloads dashboard data whenever the selected profile or friend list changes.
    const timer = window.setTimeout(() => void loadData(profile, friendIds), 0);
    return () => window.clearTimeout(timer);
  }, [profile, friendIds, loadData]);

  // The phone widget should refresh RP every 2 hours while the app is open.
  useEffect(() => {
    const refreshMs = MOBILE_WIDGET_REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
    const interval = window.setInterval(
      () => void loadData(profile, friendIds, true),
      refreshMs,
    );
    return () => window.clearInterval(interval);
  }, [profile, friendIds, loadData]);

  // When the user comes back after matches, refresh immediately so daily RP loss/gain updates quickly.
  useEffect(() => {
    let lastResumeRefresh = Date.now();
    const resumeRefreshCooldownMs = MOBILE_WIDGET_RESUME_REFRESH_COOLDOWN_MINUTES * 60 * 1000;
    const refreshAfterReturn = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastResumeRefresh < resumeRefreshCooldownMs) return;
      lastResumeRefresh = now;
      void loadData(profile, friendIds, true);
    };

    window.addEventListener("focus", refreshAfterReturn);
    document.addEventListener("visibilitychange", refreshAfterReturn);
    return () => {
      window.removeEventListener("focus", refreshAfterReturn);
      document.removeEventListener("visibilitychange", refreshAfterReturn);
    };
  }, [profile, friendIds, loadData]);

  // Keep the ranked-map countdown moving without making another API request each second.
  useEffect(() => {
    if (!rankedMap) return;
    const update = () => setCountdown(formatMapCountdown(rankedMap.endsAt));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [rankedMap]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredFriends = useMemo(
    // Search only filters the cards already loaded into the dashboard.
    () => friends.filter((friend) => friend.name.toLowerCase().includes(friendQuery.toLowerCase())),
    [friends, friendQuery],
  );

  const widgetPlayers = useMemo(
    () => (me ? [me, ...friends].slice(0, MOBILE_WIDGET_MAX_TRACKED_PLAYERS) : []),
    [me, friends],
  );

  // Profile and friend handlers persist only the small identities needed for future lookups.
  function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      name: String(form.get("name")).trim(),
      platform: String(form.get("platform")) as ApexPlatform,
    };
    if (!next.name) return;
    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.profile, JSON.stringify(next));
    setProfile(next);
    setShowProfile(false);
  }

  function addFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const defaultPlatform = String(form.get("platform")) as ApexPlatform;
    const rosterInput = String(form.get("names") ?? "").trim();
    const parsedFriends = parseFriendRosterInput(rosterInput, defaultPlatform);

    if (parsedFriends.length === 0) return;

    const existingKeys = new Set(
      friendIds.map((friend) => `${friend.platform}:${friend.name.toLowerCase()}`),
    );
    const newFriends = parsedFriends.filter((friend) => {
      const key = `${friend.platform}:${friend.name.toLowerCase()}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });

    if (newFriends.length === 0) {
      setToast({ message: "Those friends are already tracked.", kind: "error" });
      return;
    }

    const updated = [...friendIds, ...newFriends];
    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.friends, JSON.stringify(updated));
    setFriendIds(updated);
    setShowFriendForm(false);
    setToast({
      message: `${newFriends.length} friend${newFriends.length === 1 ? "" : "s"} added to your roster.`,
      kind: "success",
    });
  }

  const removeFriend = useCallback((player: PlayerRankStatus) => {
    const updated = friendIds.filter(
      (friend) => !(friend.name.toLowerCase() === player.name.toLowerCase() && friend.platform === player.platform),
    );
    window.localStorage.setItem(DASHBOARD_STORAGE_KEYS.friends, JSON.stringify(updated));
    setFriendIds(updated);
  }, [friendIds]);

  function testWidgetDailyRpChange(dailyChange: number) {
    if (widgetPlayers.length === 0) {
      setToast({ message: "Load widget data before testing daily RP change.", kind: "error" });
      return;
    }

    setWidgetDailyChangeForTesting(widgetPlayers, dailyChange);
    setWidgetBaselineRefreshToken((token) => token + 1);
    setToast({
      message: dailyChange === 0
        ? "Daily RP baseline reset to current RP."
        : `Daily RP test set to ${dailyChange > 0 ? "+" : ""}${dailyChange} RP.`,
      kind: "success",
    });
  }

  const label = me ? createRankLabel(me.rankName, me.rankDivision) : "Loading rank";
  // Demo mode is visible so you can quickly tell whether the live API key is being used.
  const usingDemo = me?.source === "demo" || rankedMap?.source === "demo";

  return (
    <main className="app-shell">
      {/* Sidebar navigation is visual for now; add page routing here if the app grows into multiple screens. */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Crosshair size={22} /></span>
          <span>DROPZONE</span>
        </div>
        <nav>
          <button className="nav-item active"><Activity size={18} /><span>Overview</span></button>
          <button className="nav-item"><Trophy size={18} /><span>Rank progress</span></button>
          <button className="nav-item"><Users size={18} /><span>Squad</span></button>
          <button className="nav-item"><MapPinned size={18} /><span>Map rotation</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="status-chip">
            <span className="pulse" />
            {usingDemo ? "Demo data active" : "Live data connected"}
          </div>
          <a href="https://apexlegendsstatus.com" target="_blank" rel="noreferrer">
            Data from Apex Legends Status
          </a>
        </div>
      </aside>

      <section className="workspace">
        {/* Topbar owns manual refresh and profile editing. */}
        <header className="topbar">
          <div>
            <span className="eyebrow">Ranked command center</span>
            <h1>{me?.name ?? profile.name}</h1>
          </div>
          <div className="topbar-actions">
            <button
              className={`theme-mode-button ${darkThemeEnabled ? "active" : ""}`}
              onClick={() => {
                setThemeLoaded(true);
                setDarkThemeEnabled((enabled) => !enabled);
              }}
              type="button"
            >
              <Moon size={15} />
              <span>{darkThemeEnabled ? "Dark" : "Light"}</span>
            </button>
            <button className="icon-button" onClick={() => void loadData(profile, friendIds, true, true)} aria-label="Refresh" disabled={loading}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <button className="profile-pill" onClick={() => setShowProfile(true)}>
              <span className="avatar">{createPlayerInitials(profile.name)}</span>
              <span><strong>{profile.name}</strong><small>{PLATFORM_DISPLAY_NAME[profile.platform]}</small></span>
              <Settings2 size={16} />
            </button>
          </div>
        </header>

        {/* Keep this banner while demo mode exists; it makes API-key issues obvious. */}
        {usingDemo && (
          <div className="demo-banner">
            <Zap size={16} />
            <span>Demo mode is active. Add <code>APEX_API_KEY</code> to <code>.env.local</code> for live ranks and maps.</span>
            <button onClick={() => setShowProfile(true)}>Set your Apex ID</button>
          </div>
        )}

        <section className="widget-preview-section">
          <div className="widget-preview-copy">
            <span className="eyebrow">Phone widget preview</span>
            <h2>Rank Pulse</h2>
            <p>Shows you plus two friends, daily net RP, and refreshes every {MOBILE_WIDGET_REFRESH_INTERVAL_HOURS} hours while open.</p>
            <div className="widget-baseline-tools compact" aria-label="Dashboard daily RP test controls">
              <span>Daily RP test</span>
              <button onClick={() => testWidgetDailyRpChange(250)} type="button">+250</button>
              <button onClick={() => testWidgetDailyRpChange(-250)} type="button">-250</button>
              <button onClick={() => testWidgetDailyRpChange(0)} type="button">Reset</button>
            </div>
            <Link className="widget-test-link" href="/widget">Open phone test view</Link>
          </div>
          <CompactRankPulseWidget owner={me} friends={friends} baselineRefreshToken={widgetBaselineRefreshToken} />
        </section>

        <section className="hero-grid">
          {/* Main rank panel: change this block when redesigning the primary rank summary. */}
          <article className="panel rank-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">Battle Royale</span><h2>Your ranked progress</h2></div>
              <span className="season-pill"><span /> Ranked</span>
            </div>
            {me ? (
              <div className="rank-content">
                <RankBadge player={me} large />
                <div className="rank-copy">
                  <span className="eyebrow">Current division</span>
                  <h3>{label}</h3>
                  <p><strong>{formatNumber(me.rankScore)}</strong> Ranked Points</p>
                </div>
                <div className="rp-target">
                  <span className="eyebrow">Next objective</span>
                  <strong>{me.progress.remaining === null ? "Top tier" : `${formatNumber(me.progress.remaining)} RP`}</strong>
                  <small>{me.progress.remaining === null ? "Keep climbing the leaderboard" : `remaining to ${me.progress.nextLabel}`}</small>
                </div>
                <div className="rank-progress">
                  <div className="progress-labels">
                    <span>{formatNumber(me.progress.earned)} RP earned</span>
                    <span>{me.progress.divisionSize ? `${formatNumber(me.progress.divisionSize)} RP total` : "Leaderboard rank"}</span>
                  </div>
                  <div className="progress-track"><span style={{ width: `${me.progress.percent}%` }} /></div>
                  <div className="progress-meta">
                    <span>{Math.round(me.progress.percent)}% complete</span>
                    <span>Updated just now</span>
                  </div>
                </div>
              </div>
            ) : <div className="loading-card">Loading your ranked profile...</div>}
          </article>

          {/* Map panel: all map names and image assets come from rankedMap. */}
          <article className="panel map-panel" style={rankedMap?.asset ? { backgroundImage: `linear-gradient(110deg, rgba(8, 11, 18, .96), rgba(8, 11, 18, .35)), url("${rankedMap.asset}")` } : undefined}>
            <div className="map-grid-lines" />
            <div className="panel-heading">
              <div><span className="eyebrow">Live rotation</span><h2>Current ranked map</h2></div>
              <MapPinned size={20} />
            </div>
            <div className="map-content">
              <span className="live-tag"><span /> Live now</span>
              <h3>{rankedMap?.current ?? "Loading map..."}</h3>
              <div className="countdown">
                <Clock3 size={18} />
                <div><span>Rotation ends in</span><strong>{countdown}</strong></div>
              </div>
              <div className="next-map">
                <span>Up next</span>
                <strong>{rankedMap?.next ?? "Loading..."}</strong>
                <ChevronRight size={18} />
              </div>
            </div>
          </article>
        </section>

        <section className="friends-section">
          {/* Friend cards are separate from friend identities so failed lookups do not break the whole dashboard. */}
          <div className="section-heading">
            <div>
              <span className="eyebrow">Your squad</span>
              <h2>Friends rank status</h2>
              <p className="section-note">Apex does not expose your in-game friends list, so add your roster here once for easy tracking.</p>
            </div>
            <div className="section-actions">
              <label className="search-box"><Search size={16} /><input value={friendQuery} onChange={(event) => setFriendQuery(event.target.value)} placeholder="Find a friend" /></label>
              <button className="primary-button" onClick={() => setShowFriendForm(true)}><Plus size={17} /> Add friend</button>
            </div>
          </div>
          <div className="friends-grid">
            {filteredFriends.map((friend) => <FriendRankCard key={friend.id} player={friend} onRemove={removeFriend} />)}
            {!loading && filteredFriends.length === 0 && (
              <button className="empty-friend" onClick={() => setShowFriendForm(true)}><Plus size={22} /><strong>Track a squadmate</strong><span>Add their Apex ID and platform</span></button>
            )}
          </div>
        </section>
      </section>

      {/* The same modal handles profile edits and friend additions to keep the UI compact. */}
      {(showProfile || showFriendForm) && (
        <div className="modal-backdrop" onMouseDown={() => { setShowProfile(false); setShowFriendForm(false); }}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowProfile(false); setShowFriendForm(false); }}><X size={18} /></button>
            <span className="eyebrow">{showProfile ? "Main profile" : "Squad tracker"}</span>
            <h2>{showProfile ? "Set your Apex account" : "Add a friend"}</h2>
            <p>{showProfile ? "Use the EA/Origin account name for PC players, even when they play through Steam." : "Paste one friend per line. Add , PlayStation or , Xbox after a name to override the default platform."}</p>
            <form onSubmit={showProfile ? updateProfile : addFriend}>
              {showProfile ? (
                <label>Apex ID<input name="name" defaultValue={profile.name} autoFocus placeholder="Enter player name" /></label>
              ) : (
                <label>Friend Apex IDs<textarea name="names" autoFocus placeholder={"NovaPulse\nStaticViper, Xbox\nFriendName, PlayStation"} /></label>
              )}
              <label>Platform<select name="platform" defaultValue={showProfile ? profile.platform : "PC"}><option value="PC">PC</option><option value="PS4">PlayStation</option><option value="X1">Xbox</option></select></label>
              <button className="primary-button" type="submit">{showProfile ? "Update profile" : "Track friend"}<ChevronRight size={17} /></button>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </main>
  );
}
