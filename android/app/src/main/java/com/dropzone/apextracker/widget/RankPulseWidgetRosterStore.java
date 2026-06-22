package com.dropzone.apextracker.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Stores the dashboard-tracked roster for the native Android home-screen widget.
 *
 * The WebView owns account and friend editing. This store lets the widget read the same roster
 * without needing access to WebView localStorage.
 */
public final class RankPulseWidgetRosterStore {
    public static final String WIDGET_PREFS_NAME = "dropzone_rank_pulse_widget";

    private static final String WIDGET_PREFS_PROFILE_JSON = "tracked_profile_json";
    private static final String WIDGET_PREFS_FRIENDS_JSON = "tracked_friends_json";
    private static final int MAX_WIDGET_PLAYERS = 3;

    private RankPulseWidgetRosterStore() {
    }

    public static void saveTrackedRoster(Context context, String profileJson, String friendsJson) {
        SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString(WIDGET_PREFS_PROFILE_JSON, profileJson == null ? "" : profileJson)
            .putString(WIDGET_PREFS_FRIENDS_JSON, friendsJson == null ? "[]" : friendsJson)
            .apply();
    }

    public static String readRosterQuery(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE);
        List<String> rosterEntries = new ArrayList<>();

        appendProfileEntry(rosterEntries, prefs.getString(WIDGET_PREFS_PROFILE_JSON, ""));
        appendFriendEntries(rosterEntries, prefs.getString(WIDGET_PREFS_FRIENDS_JSON, "[]"));

        return String.join(",", rosterEntries);
    }

    private static void appendProfileEntry(List<String> rosterEntries, String profileJson) {
        if (rosterEntries.size() >= MAX_WIDGET_PLAYERS || profileJson == null || profileJson.trim().isEmpty()) {
            return;
        }

        try {
            JSONObject profile = new JSONObject(profileJson);
            appendEntry(rosterEntries, profile.optString("platform", "PC"), profile.optString("name", ""));
        } catch (Exception ignored) {
            // Keep the previous server fallback when the WebView has not synced a valid profile yet.
        }
    }

    private static void appendFriendEntries(List<String> rosterEntries, String friendsJson) {
        if (friendsJson == null || friendsJson.trim().isEmpty()) {
            return;
        }

        try {
            JSONArray friends = new JSONArray(friendsJson);
            for (int index = 0; index < friends.length() && rosterEntries.size() < MAX_WIDGET_PLAYERS; index += 1) {
                JSONObject friend = friends.getJSONObject(index);
                appendEntry(rosterEntries, friend.optString("platform", "PC"), friend.optString("name", ""));
            }
        } catch (Exception ignored) {
            // Invalid friend JSON should not break widget refreshes.
        }
    }

    private static void appendEntry(List<String> rosterEntries, String platform, String name) {
        String cleanedName = name == null ? "" : name.trim();
        if (cleanedName.isEmpty()) {
            return;
        }

        String normalizedPlatform = normalizePlatform(platform);
        String normalizedKey = (normalizedPlatform + ":" + cleanedName).toLowerCase();
        for (String existingEntry : rosterEntries) {
            if (existingEntry.toLowerCase().equals(normalizedKey)) {
                return;
            }
        }

        rosterEntries.add(normalizedPlatform + ":" + cleanedName);
    }

    private static String normalizePlatform(String platform) {
        String value = platform == null ? "PC" : platform.trim().toUpperCase();
        if ("PS4".equals(value) || "X1".equals(value) || "PC".equals(value)) {
            return value;
        }

        return "PC";
    }
}
