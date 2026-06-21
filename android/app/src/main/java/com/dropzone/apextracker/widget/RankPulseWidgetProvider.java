package com.dropzone.apextracker.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import com.dropzone.apextracker.R;

/**
 * Updates the native Android Rank Pulse home-screen widget.
 *
 * The first version uses local preview data so the Apex API key stays off the device. When the
 * server snapshot endpoint exists, replace buildPreviewRows() with a cached server summary read
 * and keep the API key protected inside the Next.js/Vercel backend.
 */
public class RankPulseWidgetProvider extends AppWidgetProvider {
    private static final String DASHBOARD_URL = "https://dropzone-apex-tracker.vercel.app";
    private static final int TREND_THRESHOLD_RP = 150;
    private static final int STRONG_TREND_THRESHOLD_RP = 300;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateWidget(
        Context context,
        AppWidgetManager appWidgetManager,
        int appWidgetId
    ) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.rank_pulse_widget);
        RankPulseRow[] rows = buildPreviewRows();

        bindOpenDashboardTap(context, views);
        bindRow(views, rows[0], RowViews.PLAYER_ONE);
        bindRow(views, rows[1], RowViews.PLAYER_TWO);
        bindRow(views, rows[2], RowViews.PLAYER_THREE);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void bindOpenDashboardTap(Context context, RemoteViews views) {
        Intent openDashboardIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(DASHBOARD_URL));
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            openDashboardIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.rank_pulse_widget_root, pendingIntent);
    }

    private static void bindRow(RemoteViews views, RankPulseRow row, RowViews rowViews) {
        views.setTextViewText(rowViews.badgeTextId, row.badgeText);
        views.setTextViewText(rowViews.playerNameId, row.playerName);
        views.setTextViewText(rowViews.rankTextId, row.rankName);
        views.setTextViewText(rowViews.rpTextId, row.currentRp + " RP");
        views.setTextViewText(rowViews.dailyNetTextId, formatDailyNet(row.dailyNetRp));
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

    private static RankPulseRow[] buildPreviewRows() {
        return new RankPulseRow[] {
            new RankPulseRow("PL", "blumoat_onyatta", "Plat II", 9820, 76, 220, true),
            new RankPulseRow("GD", "NightShift", "Gold I", 7290, 58, -160, false),
            new RankPulseRow("PL", "NovaPulse", "Plat IV", 8200, 8, 0, false),
        };
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

        RankPulseRow(
            String badgeText,
            String playerName,
            String rankName,
            int currentRp,
            int progressPercent,
            int dailyNetRp,
            boolean hasHeatStreak
        ) {
            this.badgeText = badgeText;
            this.playerName = playerName;
            this.rankName = rankName;
            this.currentRp = currentRp;
            this.progressPercent = progressPercent;
            this.dailyNetRp = dailyNetRp;
            this.hasHeatStreak = hasHeatStreak;
        }
    }

    private static final class RowViews {
        static final RowViews PLAYER_ONE = new RowViews(
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
