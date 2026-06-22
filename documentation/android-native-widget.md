# Android Native Widget

This document explains the Android-first path for turning Dropzone into a real phone app with
a home-screen Rank Pulse widget.

## Why Android Needs Native Code

The current `/widget` page is a web preview. It is useful for designing and testing the phone
layout, but it cannot appear on the Android home screen like a Weather widget.

Android home-screen widgets are native app widgets. That means Dropzone needs an Android app
that registers an `AppWidgetProvider`, supplies widget metadata XML, and renders a compact
RemoteViews layout.

## Current Native Files

| Path | Purpose |
| --- | --- |
| `android/README.md` | Explains how to open, run, and test the native Android scaffold. |
| `android/settings.gradle.kts` | Names the Android project and includes the `app` module. |
| `android/build.gradle.kts` | Pins the Android Gradle plugin used by the native project. |
| `android/gradle.properties` | Stores Gradle and Android build settings. |
| `android/app/build.gradle.kts` | Configures package name, Android SDK 36 levels, and version numbers. |
| `android/app/src/main/AndroidManifest.xml` | Declares the launcher activity and Rank Pulse widget receiver. |
| `android/app/src/main/java/com/dropzone/apextracker/MainActivity.java` | Shows the live web dashboard inside the native shell. |
| `android/app/src/main/java/com/dropzone/apextracker/widget/RankPulseWidgetProvider.java` | Fetches the server widget summary and updates the native home-screen widget. |
| `android/app/src/main/java/com/dropzone/apextracker/widget/RankPulseWidgetRosterStore.java` | Copies the dashboard-tracked roster from WebView storage into Android shared preferences for the widget. |
| `android/app/src/main/res/layout/activity_main.xml` | Native in-app dashboard WebView layout. |
| `android/app/src/main/res/layout/rank_pulse_widget.xml` | Compact widget layout with three tracked-player rows. |
| `android/app/src/main/res/xml/rank_pulse_widget_info.xml` | Android widget sizing, category, layout, and update metadata. |
| `android/app/src/main/res/values/colors.xml` | Native color tokens for app and widget styling. |
| `android/app/src/main/res/values/strings.xml` | Native user-facing app and widget copy. |
| `android/app/src/main/res/values/styles.xml` | Shared widget text, row, badge, and progress bar styles. |
| `android/app/src/main/res/drawable/*` | Native backgrounds, progress bars, launcher mark, and heat icon. |

## Data Safety Rule

Do not place `APEX_API_KEY` inside Android code, XML, or Gradle files.

Android apps can be inspected after installation, so any bundled API key should be treated as
public. The Android app should call a Dropzone server endpoint that already has the data
prepared. The server keeps the real Apex key in Vercel environment variables.

## Live Data Contract

The Android widget calls this server endpoint:

```text
GET /api/mobile/rank-pulse-summary
GET /api/mobile/rank-pulse-summary?players=PS4:blumoat_onyatta,PC:FriendOne
```

That endpoint returns no secrets, only the small widget summary:

```json
{
  "updatedAt": "2026-06-21T13:00:00.000Z",
  "players": [
    {
      "name": "blumoat_onyatta",
      "platform": "PS4",
      "rank": "Plat II",
      "currentRp": 9820,
      "progressPercent": 76,
      "dailyNetRp": 220,
      "lastDeltaRp": 120,
      "highestRpToday": 9820,
      "lowestRpToday": 9600,
      "badgeLabel": "PL",
      "hasHeatStreak": true,
      "updatesTracked": 4
    }
  ]
}
```

The Android widget displays only the first three players: the owner account plus two friends.
When the native app has been opened, `MainActivity.java` reads the same dashboard roster saved in
browser storage and `RankPulseWidgetRosterStore.java` passes that roster to the endpoint with the
optional `players` query parameter. If the app has not synced a roster yet, the endpoint falls
back to the server roster from `DROPZONE_MOBILE_WIDGET_PLAYERS`.

## Daily RP Plan

The mobile endpoint now uses the server RP history layer. It calculates daily RP from the first
RP value stored for that player on the current day and also returns last delta, high/low RP,
tracked update count, and heat-streak state.

For durable production behavior, use Option 2 from the earlier discussion:

- Vercel Cron refreshes tracked players on the server.
- Upstash Redis, Vercel KV, or a small database stores the first RP snapshot of the day and the latest RP.
- Daily net RP is calculated as `latest RP - first RP snapshot of the day`.
- The Android widget reads the server summary every two hours.

This is the path that lets the widget update reliably even when the app was not opened that day.

## Native Refresh Notes

The scaffold sets `android:updatePeriodMillis="7200000"`, which is two hours. Android may still
delay background updates to protect battery life. The widget is draggable from the Android
launcher after the user places it on the home screen. For richer background behavior later, add
WorkManager and let it fetch the server summary, then update the widget.

## How To Change The Widget

- Change the roster sync keys or default owner in `MainActivity.java`.
- Change how WebView roster JSON becomes a server query in `RankPulseWidgetRosterStore.java`.
- Change the widget title and refresh label in `strings.xml`.
- Change colors in `colors.xml`.
- Change row spacing and text sizes in `styles.xml`.
- Change the compact layout in `rank_pulse_widget.xml`.
- Change the trend thresholds in `RankPulseWidgetProvider.java`.

## What To Build Next

1. Store the user's selected roster on the server instead of only browser local storage.
2. Add Upstash Redis or Vercel KV env vars in production so RP history survives cold starts.
3. Add Android background refresh with WorkManager.
4. Add Android notifications for rank-up, rank-down, RP gain, and RP loss.
5. Add release signing and a Play Store publishing checklist.
