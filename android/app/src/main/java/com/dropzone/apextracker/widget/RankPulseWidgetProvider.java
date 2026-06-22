package com.dropzone.apextracker.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
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
import java.util.Locale;

/**
 * Updates the native Android Rank Pulse home-screen widget.
 *
 * The dashboard card uses CSS that Android RemoteViews cannot reproduce directly, so the widget
 * draws a bitmap card with the same Rank Pulse measurements, colors, and row structure.
 */
public class RankPulseWidgetProvider extends AppWidgetProvider {
    private static final String WIDGET_SUMMARY_URL =
        "https://dropzone-apex-tracker.vercel.app/api/mobile/rank-pulse-summary";
    private static final String WIDGET_PREFS_SUMMARY_JSON = "latest_summary_json";
    private static final int TREND_THRESHOLD_RP = 150;
    private static final int STRONG_TREND_THRESHOLD_RP = 300;
    private static final int CARD_WIDTH = 640;
    private static final int CARD_HEIGHT = 282;
    private static final float SCALE = CARD_WIDTH / 460f;

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
        views.setImageViewBitmap(R.id.rank_pulse_widget_bitmap, renderRankPulseCard(rows));
        bindOpenDashboardButton(context, views);
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

    private static Bitmap renderRankPulseCard(RankPulseRow[] rows) {
        Bitmap bitmap = Bitmap.createBitmap(CARD_WIDTH, CARD_HEIGHT, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);

        drawCardBackground(canvas, paint);
        drawHeader(canvas, paint);

        int visibleIndex = 0;
        for (int rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
            if (!rows[rowIndex].isVisible) continue;
            drawPlayerRow(canvas, paint, rows[rowIndex], visibleIndex, rowIndex == 0);
            visibleIndex += 1;
        }

        if (visibleIndex == 0) {
            drawLoadingState(canvas, paint);
        }

        drawFooter(canvas, paint);
        return bitmap;
    }

    private static void drawCardBackground(Canvas canvas, Paint paint) {
        RectF card = new RectF(0, 0, CARD_WIDTH, CARD_HEIGHT);
        float radius = 28f * SCALE;

        paint.setStyle(Paint.Style.FILL);
        paint.setShader(new LinearGradient(
            0,
            0,
            CARD_WIDTH,
            CARD_HEIGHT,
            Color.argb(226, 31, 38, 54),
            Color.argb(232, 16, 18, 25),
            Shader.TileMode.CLAMP
        ));
        canvas.drawRoundRect(card, radius, radius, paint);

        paint.setShader(new LinearGradient(
            0,
            0,
            CARD_WIDTH * 0.72f,
            CARD_HEIGHT * 0.6f,
            Color.argb(26, 255, 255, 255),
            Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        ));
        canvas.drawRoundRect(card, radius, radius, paint);
        paint.setShader(null);

        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(1.4f);
        paint.setColor(Color.argb(38, 255, 255, 255));
        RectF border = new RectF(0.7f, 0.7f, CARD_WIDTH - 0.7f, CARD_HEIGHT - 0.7f);
        canvas.drawRoundRect(border, radius, radius, paint);
        paint.setStyle(Paint.Style.FILL);
    }

    private static void drawHeader(Canvas canvas, Paint paint) {
        float s = SCALE;
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.rgb(255, 59, 48));
        canvas.drawRoundRect(new RectF(14f * s, 13f * s, 32f * s, 15f * s), 2f * s, 2f * s, paint);

        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(12f * s);
        paint.setColor(Color.rgb(247, 248, 251));
        drawTrackingText(canvas, paint, "RANK PULSE", 39f * s, 25f * s, 0.85f * s);

        paint.setTextSize(8f * s);
        String syncText = "2H SYNC";
        float textWidth = measureTrackingText(paint, syncText, 0.75f * s);
        float pillWidth = textWidth + 16f * s;
        float pillHeight = 18f * s;
        float pillLeft = CARD_WIDTH - 14f * s - pillWidth;
        float pillTop = 8f * s;

        paint.setColor(Color.argb(31, 10, 132, 255));
        RectF pill = new RectF(pillLeft, pillTop, pillLeft + pillWidth, pillTop + pillHeight);
        canvas.drawRoundRect(pill, 99f * s, 99f * s, paint);

        paint.setColor(Color.rgb(112, 184, 255));
        drawTrackingText(
            canvas,
            paint,
            syncText,
            pillLeft + 8f * s,
            centeredTextBaseline(paint, pill),
            0.75f * s
        );
    }

    private static void drawPlayerRow(
        Canvas canvas,
        Paint paint,
        RankPulseRow row,
        int visibleIndex,
        boolean featured
    ) {
        float s = SCALE;
        float contentLeft = 14f * s;
        float contentRight = CARD_WIDTH - 14f * s;
        float rowTop = 42f * s + visibleIndex * 43f * s;
        float lineCenterY = rowTop + 14f * s;
        float badgeSize = 26f * s;
        float badgeLeft = contentLeft;
        float nameLeft = contentLeft + 35f * s;
        float gap = 7f * s;

        String changeText = formatDailyChange(row.dailyNetRp, featured);
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(8f * s);
        float changeWidth = Math.max(34f * s, paint.measureText(changeText) + 14f * s);
        float changeLeft = contentRight - changeWidth;
        float rpRight = changeLeft - gap;
        float rankRight = rpRight - 58f * s - gap;
        float nameRight = rankRight - 38f * s - gap;

        drawRankBadge(canvas, paint, row, badgeLeft, rowTop + 1f * s, badgeSize);
        drawPlayerName(canvas, paint, row, featured, nameLeft, nameRight, rowTop);
        drawRightText(canvas, paint, row.rankName.toUpperCase(Locale.US), rankRight - 38f * s, rankRight, lineCenterY, 9f * s, Color.rgb(216, 221, 230));
        drawRightText(canvas, paint, formatNumber(row.currentRp) + " RP", rpRight - 58f * s, rpRight, lineCenterY, 9f * s, Color.rgb(244, 247, 251));
        drawDailyChangePill(canvas, paint, changeText, changeLeft, lineCenterY, changeWidth, row.dailyNetRp);
        drawProgressTrack(canvas, paint, row, contentLeft, contentRight, rowTop + 31f * s);
    }

    private static void drawPlayerName(
        Canvas canvas,
        Paint paint,
        RankPulseRow row,
        boolean featured,
        float nameLeft,
        float nameRight,
        float rowTop
    ) {
        float s = SCALE;
        float availableWidth = Math.max(1f, nameRight - nameLeft);

        if (featured) {
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            paint.setTextSize(7f * s);
            paint.setColor(Color.rgb(143, 152, 166));
            drawTrackingText(canvas, paint, "YOU", nameLeft, rowTop + 7.5f * s, 0.6f * s);
        }

        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize((featured ? 11f : 10f) * s);
        paint.setColor(Color.rgb(248, 250, 252));
        String name = ellipsize(row.playerName, paint, availableWidth - (row.hasHeatStreak ? 20f * s : 0f));
        float baseline = featured ? rowTop + 22f * s : rowTop + 18f * s;
        canvas.drawText(name, nameLeft, baseline, paint);

        if (row.hasHeatStreak) {
            float heatX = nameLeft + Math.min(paint.measureText(name) + 5f * s, availableWidth - 15f * s);
            drawHeatStreak(canvas, paint, heatX, baseline - 12f * s);
        }
    }

    private static void drawRankBadge(Canvas canvas, Paint paint, RankPulseRow row, float left, float top, float size) {
        int rankColor = getRankColor(row.rankName);
        Path outer = createRankBadgePath(left, top, size);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(rankColor);
        canvas.drawPath(outer, paint);

        float inset = 3f * SCALE;
        Path inner = createRankBadgePath(left + inset, top + inset, size - inset * 2f);
        paint.setColor(Color.rgb(18, 26, 37));
        canvas.drawPath(inner, paint);

        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(8.5f * SCALE);
        paint.setColor(rankColor);
        paint.setTextAlign(Paint.Align.CENTER);
        Paint.FontMetrics metrics = paint.getFontMetrics();
        float baseline = top + size / 2f - (metrics.ascent + metrics.descent) / 2f;
        canvas.drawText(row.badgeText, left + size / 2f, baseline, paint);
        paint.setTextAlign(Paint.Align.LEFT);
    }

    private static Path createRankBadgePath(float left, float top, float size) {
        Path path = new Path();
        path.moveTo(left + size * 0.5f, top);
        path.lineTo(left + size * 0.92f, top + size * 0.23f);
        path.lineTo(left + size * 0.92f, top + size * 0.76f);
        path.lineTo(left + size * 0.5f, top + size);
        path.lineTo(left + size * 0.08f, top + size * 0.76f);
        path.lineTo(left + size * 0.08f, top + size * 0.23f);
        path.close();
        return path;
    }

    private static void drawRightText(
        Canvas canvas,
        Paint paint,
        String text,
        float left,
        float right,
        float centerY,
        float textSize,
        int color
    ) {
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(textSize);
        paint.setColor(color);
        String displayText = ellipsize(text, paint, Math.max(1f, right - left));
        Paint.FontMetrics metrics = paint.getFontMetrics();
        canvas.drawText(displayText, right - paint.measureText(displayText), centerY - (metrics.ascent + metrics.descent) / 2f, paint);
    }

    private static void drawDailyChangePill(
        Canvas canvas,
        Paint paint,
        String text,
        float left,
        float centerY,
        float width,
        int dailyNetRp
    ) {
        float s = SCALE;
        float height = 18f * s;
        RectF pill = new RectF(left, centerY - height / 2f, left + width, centerY + height / 2f);
        if (dailyNetRp > 0) {
            paint.setColor(Color.argb(41, 48, 209, 88));
        } else if (dailyNetRp < 0) {
            paint.setColor(Color.argb(41, 255, 69, 58));
        } else {
            paint.setColor(Color.argb(41, 142, 142, 147));
        }
        canvas.drawRoundRect(pill, 99f * s, 99f * s, paint);

        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(8f * s);
        paint.setColor(dailyNetRp > 0
            ? Color.rgb(54, 213, 106)
            : dailyNetRp < 0 ? Color.rgb(255, 107, 98) : Color.rgb(174, 180, 191));
        Paint.FontMetrics metrics = paint.getFontMetrics();
        canvas.drawText(
            text,
            left + (width - paint.measureText(text)) / 2f,
            centerY - (metrics.ascent + metrics.descent) / 2f,
            paint
        );
    }

    private static void drawProgressTrack(Canvas canvas, Paint paint, RankPulseRow row, float left, float right, float top) {
        float s = SCALE;
        float height = 4f * s;
        float radius = 99f * s;
        RectF track = new RectF(left, top, right, top + height);
        paint.setShader(null);
        paint.setColor(Color.argb(23, 255, 255, 255));
        canvas.drawRoundRect(track, radius, radius, paint);

        float width = (right - left) * Math.max(0, Math.min(row.progressPercent, 100)) / 100f;
        if (width <= 0f) return;

        int[] colors = getTrackGradient(row.dailyNetRp);
        RectF progress = new RectF(left, top, left + width, top + height);
        paint.setShader(new LinearGradient(left, top, left + width, top, colors[0], colors[1], Shader.TileMode.CLAMP));
        canvas.drawRoundRect(progress, radius, radius, paint);
        paint.setShader(null);
    }

    private static void drawHeatStreak(Canvas canvas, Paint paint, float left, float top) {
        float size = 16f * SCALE;
        RectF badge = new RectF(left, top, left + size, top + size);
        paint.setColor(Color.argb(52, 255, 122, 24));
        canvas.drawRoundRect(badge, size / 2f, size / 2f, paint);
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(8f * SCALE);
        paint.setColor(Color.rgb(255, 176, 32));
        canvas.drawText("H", left + size * 0.32f, top + size * 0.68f, paint);
    }

    private static void drawLoadingState(Canvas canvas, Paint paint) {
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        paint.setTextSize(10f * SCALE);
        paint.setColor(Color.rgb(143, 152, 166));
        canvas.drawText("Loading widget data...", 14f * SCALE, 101f * SCALE, paint);
    }

    private static void drawFooter(Canvas canvas, Paint paint) {
        float s = SCALE;
        String footer = "NET DAILY RP";
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(7f * s);
        paint.setColor(Color.rgb(143, 152, 166));
        float textWidth = measureTrackingText(paint, footer, 0.75f * s);
        drawTrackingText(canvas, paint, footer, CARD_WIDTH - 14f * s - textWidth, CARD_HEIGHT - 12f * s, 0.75f * s);
    }

    private static float centeredTextBaseline(Paint paint, RectF bounds) {
        Paint.FontMetrics metrics = paint.getFontMetrics();
        return bounds.centerY() - (metrics.ascent + metrics.descent) / 2f;
    }

    private static void drawTrackingText(Canvas canvas, Paint paint, String text, float x, float baseline, float spacing) {
        float cursor = x;
        for (int index = 0; index < text.length(); index += 1) {
            String letter = text.substring(index, index + 1);
            canvas.drawText(letter, cursor, baseline, paint);
            cursor += paint.measureText(letter) + spacing;
        }
    }

    private static float measureTrackingText(Paint paint, String text, float spacing) {
        if (text.isEmpty()) return 0f;
        float width = 0f;
        for (int index = 0; index < text.length(); index += 1) {
            width += paint.measureText(text.substring(index, index + 1));
        }
        return width + spacing * (text.length() - 1);
    }

    private static String ellipsize(String text, Paint paint, float maxWidth) {
        if (paint.measureText(text) <= maxWidth) return text;
        String suffix = "...";
        float suffixWidth = paint.measureText(suffix);
        String candidate = text;
        while (candidate.length() > 0 && paint.measureText(candidate) + suffixWidth > maxWidth) {
            candidate = candidate.substring(0, candidate.length() - 1);
        }
        return candidate + suffix;
    }

    private static int[] getTrackGradient(int dailyNetRp) {
        if (dailyNetRp <= -STRONG_TREND_THRESHOLD_RP) {
            return new int[] { Color.rgb(255, 69, 58), Color.rgb(143, 17, 24) };
        }

        if (dailyNetRp <= -TREND_THRESHOLD_RP) {
            return new int[] { Color.rgb(255, 138, 128), Color.rgb(255, 69, 58) };
        }

        if (dailyNetRp >= STRONG_TREND_THRESHOLD_RP) {
            return new int[] { Color.rgb(48, 209, 88), Color.rgb(11, 122, 45) };
        }

        if (dailyNetRp >= TREND_THRESHOLD_RP) {
            return new int[] { Color.rgb(141, 255, 174), Color.rgb(48, 209, 88) };
        }

        return new int[] { Color.rgb(10, 132, 255), Color.rgb(105, 196, 255) };
    }

    private static int getRankColor(String rankName) {
        String loweredRank = rankName.toLowerCase(Locale.US);
        if (loweredRank.contains("rookie")) return Color.rgb(167, 173, 184);
        if (loweredRank.contains("bronze")) return Color.rgb(200, 135, 93);
        if (loweredRank.contains("silver")) return Color.rgb(206, 217, 229);
        if (loweredRank.contains("gold")) return Color.rgb(244, 201, 93);
        if (loweredRank.contains("plat")) return Color.rgb(98, 213, 219);
        if (loweredRank.contains("dia")) return Color.rgb(154, 140, 255);
        if (loweredRank.contains("master")) return Color.rgb(224, 108, 255);
        if (loweredRank.contains("predator")) return Color.rgb(255, 82, 97);
        return Color.rgb(142, 160, 181);
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

        return label.length() == 0 ? "--" : label.toString().toUpperCase(Locale.US);
    }

    private static String shortenRankName(String rankName) {
        return rankName
            .replace("Platinum", "Plat")
            .replace("Diamond", "Dia");
    }

    private static String formatNumber(int value) {
        return String.format(Locale.US, "%,d", value);
    }

    private static String formatDailyChange(int dailyNetRp, boolean featured) {
        if (dailyNetRp == 0) return "0";
        String prefix = dailyNetRp > 0 ? "+" : "";
        return prefix + formatNumber(dailyNetRp) + (featured ? " today" : "");
    }

    private static RankPulseRow[] createEmptyRows() {
        return new RankPulseRow[] {
            RankPulseRow.empty(),
            RankPulseRow.empty(),
            RankPulseRow.empty(),
        };
    }

    private static boolean isLegacyDemoPlayer(String playerName, String platform) {
        String key = platform.trim().toLowerCase(Locale.US) + ":" + playerName.trim().toLowerCase(Locale.US);
        return "pc:nightshift".equals(key)
            || "ps4:novapulse".equals(key)
            || "x1:staticviper".equals(key);
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
}
