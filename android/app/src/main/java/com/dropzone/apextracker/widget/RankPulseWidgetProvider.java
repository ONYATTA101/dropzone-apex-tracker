package com.dropzone.apextracker.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import com.dropzone.apextracker.MainActivity;
import com.dropzone.apextracker.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

/**
 * Updates the native Android Rank Pulse home-screen widget.
 *
 * The widget reads a mobile-safe server summary instead of storing the Apex API key on-device.
 * If the phone is offline, it reuses the last cached summary or hides empty rows.
 */
public class RankPulseWidgetProvider extends AppWidgetProvider {
    private static final String WIDGET_SUMMARY_URL =
        "https://dropzone-apex-tracker.vercel.app/api/mobile/rank-pulse-summary";
    private static final String WIDGET_PREFS_SUMMARY_JSON = "latest_summary_json";
    private static final int TREND_THRESHOLD_RP = 150;
    private static final int STRONG_TREND_THRESHOLD_RP = 300;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        RankPulseRow[] cachedRows = readCachedRows(context);
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId, cachedRows);
        }

        fetchServerSummary(context, appWidgetManager, appWidgetIds);
    }

    public static void refreshAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, RankPulseWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
        if (appWidgetIds.length == 0) {
            return;
        }

        new RankPulseWidgetProvider().onUpdate(context, appWidgetManager, appWidgetIds);
    }

    private static void updateWidget(
        Context context,
        AppWidgetManager appWidgetManager,
        int appWidgetId,
        RankPulseRow[] rows
    ) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.rank_pulse_widget);

        bindOpenDashboardButton(context, views);
        bindRow(views, rows[0], RowViews.PLAYER_ONE);
        bindRow(views, rows[1], RowViews.PLAYER_TWO);
        bindRow(views, rows[2], RowViews.PLAYER_THREE);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void bindOpenDashboardButton(Context context, RemoteViews views) {
        Intent openDashboardIntent = new Intent(context, MainActivity.class);
        openDashboardIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            openDashboardIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_open_app_button, pendingIntent);
    }

    private static void fetchServerSummary(
        Context context,
        AppWidgetManager appWidgetManager,
        int[] appWidgetIds
    ) {
        new Thread(() -> {
            try {
                String summaryJson = fetchSummaryJson(context);
                RankPulseRow[] rows = parseRows(summaryJson);
                SharedPreferences prefs = context.getSharedPreferences(
                    RankPulseWidgetRosterStore.WIDGET_PREFS_NAME,
                    Context.MODE_PRIVATE
                );
                prefs.edit().putString(WIDGET_PREFS_SUMMARY_JSON, summaryJson).apply();

                for (int appWidgetId : appWidgetIds) {
                    updateWidget(context, appWidgetManager, appWidgetId, rows);
                }
            } catch (Exception ignored) {
                // Keep the last rendered rows when the phone is offline or the server is busy.
            }
        }).start();
    }

    private static String fetchSummaryJson(Context context) throws Exception {
        String rosterQuery = RankPulseWidgetRosterStore.readRosterQuery(context);
        String summaryUrl = WIDGET_SUMMARY_URL + "?refresh=" + System.currentTimeMillis();
        if (!rosterQuery.isEmpty()) {
            summaryUrl += "&players=" + URLEncoder.encode(rosterQuery, "UTF-8");
        }

        HttpURLConnection connection = (HttpURLConnection) new URL(summaryUrl).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        connection.setRequestMethod("GET");
        connection.setUseCaches(false);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Cache-Control", "no-cache");
        connection.setRequestProperty("Pragma", "no-cache");
        connection.setRequestProperty("User-Agent", "DropzoneAndroidWidget/0.1");

        int statusCode = connection.getResponseCode();
        if (statusCode < 200 || statusCode >= 300) {
            throw new IllegalStateException("Widget summary request failed: " + statusCode);
        }

        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(connection.getInputStream())
        )) {
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
            return builder.toString();
        } finally {
            connection.disconnect();
        }
    }

    private static RankPulseRow[] readCachedRows(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(
            RankPulseWidgetRosterStore.WIDGET_PREFS_NAME,
            Context.MODE_PRIVATE
        );
        String summaryJson = prefs.getString(WIDGET_PREFS_SUMMARY_JSON, null);
        if (summaryJson == null) {
            return createEmptyRows();
        }

        try {
            return parseRows(summaryJson);
        } catch (Exception ignored) {
            return createEmptyRows();
        }
    }

    private static RankPulseRow[] parseRows(String summaryJson) throws Exception {
        RankPulseRow[] rows = createEmptyRows();
        JSONArray players = new JSONObject(summaryJson).optJSONArray("players");
        if (players == null) {
            return rows;
        }

        int rowIndex = 0;
        for (int playerIndex = 0; playerIndex < players.length() && rowIndex < rows.length; playerIndex += 1) {
            JSONObject player = players.getJSONObject(playerIndex);
            String playerName = player.optString("name", "");
            String platform = player.optString("platform", "");
            if (isLegacyDemoPlayer(playerName, platform)) {
                continue;
            }

            String rankName = player.optString("rank", "");
            rows[rowIndex] = new RankPulseRow(
                player.optString("badgeLabel", createBadgeLabel(rankName)),
                playerName,
                shortenRankName(rankName),
                player.optInt("currentRp", 0),
                player.optInt("progressPercent", 0),
                player.optInt("dailyNetRp", 0),
                player.optBoolean("hasHeatStreak", false),
                true
            );
            rowIndex += 1;
        }

        return rows;
    }

    private static RankPulseRow[] createEmptyRows() {
        return new RankPulseRow[] {
            RankPulseRow.empty(),
            RankPulseRow.empty(),
            RankPulseRow.empty(),
        };
    }

    private static boolean isLegacyDemoPlayer(String playerName, String platform) {
        String key = platform.trim().toLowerCase() + ":" + playerName.trim().toLowerCase();
        return "pc:nightshift".equals(key)
            || "ps4:novapulse".equals(key)
            || "x1:staticviper".equals(key);
    }

    private static String createBadgeLabel(String rankName) {
        if (rankName == null || rankName.trim().isEmpty()) {
            return "--";
        }

        String[] parts = rankName.trim().split("\\s+");
        StringBuilder label = new StringBuilder();
        for (String part : parts) {
            if (!part.isEmpty()) {
                label.append(part.charAt(0));
            }
            if (label.length() >= 2) {
                break;
            }
        }

        return label.length() == 0 ? "--" : label.toString().toUpperCase();
    }

    private static String shortenRankName(String rankName) {
        return rankName
            .replace("Platinum", "Plat")
            .replace("Diamond", "Dia");
    }

    private static void bindRow(RemoteViews views, RankPulseRow row, RowViews rowViews) {
        views.setViewVisibility(rowViews.rowRootId, row.isVisible ? View.VISIBLE : View.GONE);
        if (!row.isVisible) {
            return;
        }

        views.setTextViewText(rowViews.badgeTextId, row.badgeText);
        views.setTextViewText(rowViews.playerNameId, row.playerName);
        views.setTextViewText(rowViews.rankTextId, row.rankName);
        views.setTextViewText(rowViews.rpTextId, row.currentRp + " RP");
        views.setTextViewText(rowViews.dailyNetTextId, formatDailyNet(row.dailyNetRp));
        bindDailyNetPill(views, rowViews.dailyNetTextId, row.dailyNetRp);
        views.setProgressBar(rowViews.blueProgressId, 100, row.progressPercent, false);
        views.setProgressBar(rowViews.lightGreenProgressId, 100, row.progressPercent, false);
        views.setProgressBar(rowViews.strongGreenProgressId, 100, row.progressPercent, false);
        views.setProgressBar(rowViews.lightRedProgressId, 100, row.progressPercent, false);
        views.setProgressBar(rowViews.strongRedProgressId, 100, row.progressPercent, false);

        TrendStyle trendStyle = getTrendStyle(row.dailyNetRp);
        views.setViewVisibility(rowViews.blueProgressId, trendStyle == TrendStyle.BLUE ? View.VISIBLE : View.GONE);
        views.setViewVisibility(rowViews.lightGreenProgressId, trendStyle == TrendStyle.LIGHT_GREEN ? View.VISIBLE : View.GONE);
        views.setViewVisibility(rowViews.strongGreenProgressId, trendStyle == TrendStyle.STRONG_GREEN ? View.VISIBLE : View.GONE);
        views.setViewVisibility(rowViews.lightRedProgressId, trendStyle == TrendStyle.LIGHT_RED ? View.VISIBLE : View.GONE);
        views.setViewVisibility(rowViews.strongRedProgressId, trendStyle == TrendStyle.STRONG_RED ? View.VISIBLE : View.GONE);
        views.setViewVisibility(rowViews.heatIconId, row.hasHeatStreak ? View.VISIBLE : View.GONE);
    }

    private static void bindDailyNetPill(RemoteViews views, int dailyNetTextId, int dailyNetRp) {
        if (dailyNetRp > 0) {
            views.setTextColor(dailyNetTextId, Color.rgb(54, 213, 106));
            views.setInt(dailyNetTextId, "setBackgroundResource", R.drawable.widget_daily_net_gain);
            return;
        }

        if (dailyNetRp < 0) {
            views.setTextColor(dailyNetTextId, Color.rgb(255, 107, 98));
            views.setInt(dailyNetTextId, "setBackgroundResource", R.drawable.widget_daily_net_loss);
            return;
        }

        views.setTextColor(dailyNetTextId, Color.rgb(174, 180, 191));
        views.setInt(dailyNetTextId, "setBackgroundResource", R.drawable.widget_daily_net_neutral);
    }

    private static String formatDailyNet(int dailyNetRp) {
        if (dailyNetRp > 0) {
            return "+" + dailyNetRp;
        }

        return String.valueOf(dailyNetRp);
    }

    private static TrendStyle getTrendStyle(int dailyNetRp) {
        if (dailyNetRp <= -STRONG_TREND_THRESHOLD_RP) {
            return TrendStyle.STRONG_RED;
        }

        if (dailyNetRp <= -TREND_THRESHOLD_RP) {
            return TrendStyle.LIGHT_RED;
        }

        if (dailyNetRp >= STRONG_TREND_THRESHOLD_RP) {
            return TrendStyle.STRONG_GREEN;
        }

        if (dailyNetRp >= TREND_THRESHOLD_RP) {
            return TrendStyle.LIGHT_GREEN;
        }

        return TrendStyle.BLUE;
    }

    private enum TrendStyle {
        BLUE,
        LIGHT_GREEN,
        STRONG_GREEN,
        LIGHT_RED,
        STRONG_RED
    }

    private static final class RankPulseRow {
        final String badgeText;
        final String playerName;
        final String rankName;
        final int currentRp;
        final int progressPercent;
        final int dailyNetRp;
        final boolean hasHeatStreak;
        final boolean isVisible;

        RankPulseRow(
            String badgeText,
            String playerName,
            String rankName,
            int currentRp,
            int progressPercent,
            int dailyNetRp,
            boolean hasHeatStreak,
            boolean isVisible
        ) {
            this.badgeText = badgeText;
            this.playerName = playerName;
            this.rankName = rankName;
            this.currentRp = currentRp;
            this.progressPercent = progressPercent;
            this.dailyNetRp = dailyNetRp;
            this.hasHeatStreak = hasHeatStreak;
            this.isVisible = isVisible;
        }

        static RankPulseRow empty() {
            return new RankPulseRow("", "", "", 0, 0, 0, false, false);
        }
    }

    private static final class RowViews {
        static final RowViews PLAYER_ONE = new RowViews(
            R.id.player_one_row,
            R.id.player_one_badge,
            R.id.player_one_name,
            R.id.player_one_rank,
            R.id.player_one_rp,
            R.id.player_one_daily_net,
            R.id.player_one_progress_blue,
            R.id.player_one_progress_light_green,
            R.id.player_one_progress_strong_green,
            R.id.player_one_progress_light_red,
            R.id.player_one_progress_strong_red,
            R.id.player_one_heat_icon
        );

        static final RowViews PLAYER_TWO = new RowViews(
            R.id.player_two_row,
            R.id.player_two_badge,
            R.id.player_two_name,
            R.id.player_two_rank,
            R.id.player_two_rp,
            R.id.player_two_daily_net,
            R.id.player_two_progress_blue,
            R.id.player_two_progress_light_green,
            R.id.player_two_progress_strong_green,
            R.id.player_two_progress_light_red,
            R.id.player_two_progress_strong_red,
            R.id.player_two_heat_icon
        );

        static final RowViews PLAYER_THREE = new RowViews(
            R.id.player_three_row,
            R.id.player_three_badge,
            R.id.player_three_name,
            R.id.player_three_rank,
            R.id.player_three_rp,
            R.id.player_three_daily_net,
            R.id.player_three_progress_blue,
            R.id.player_three_progress_light_green,
            R.id.player_three_progress_strong_green,
            R.id.player_three_progress_light_red,
            R.id.player_three_progress_strong_red,
            R.id.player_three_heat_icon
        );

        final int rowRootId;
        final int badgeTextId;
        final int playerNameId;
        final int rankTextId;
        final int rpTextId;
        final int dailyNetTextId;
        final int blueProgressId;
        final int lightGreenProgressId;
        final int strongGreenProgressId;
        final int lightRedProgressId;
        final int strongRedProgressId;
        final int heatIconId;

        RowViews(
            int rowRootId,
            int badgeTextId,
            int playerNameId,
            int rankTextId,
            int rpTextId,
            int dailyNetTextId,
            int blueProgressId,
            int lightGreenProgressId,
            int strongGreenProgressId,
            int lightRedProgressId,
            int strongRedProgressId,
            int heatIconId
        ) {
            this.rowRootId = rowRootId;
            this.badgeTextId = badgeTextId;
            this.playerNameId = playerNameId;
            this.rankTextId = rankTextId;
            this.rpTextId = rpTextId;
            this.dailyNetTextId = dailyNetTextId;
            this.blueProgressId = blueProgressId;
            this.lightGreenProgressId = lightGreenProgressId;
            this.strongGreenProgressId = strongGreenProgressId;
            this.lightRedProgressId = lightRedProgressId;
            this.strongRedProgressId = strongRedProgressId;
            this.heatIconId = heatIconId;
        }
    }
}
