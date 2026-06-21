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
| `android/app/build.gradle.kts` | Configures package name, SDK levels, and version numbers. |
| `android/app/src/main/AndroidManifest.xml` | Declares the launcher activity and Rank Pulse widget receiver. |
| `android/app/src/main/java/com/dropzone/apextracker/MainActivity.java` | Opens the live web dashboard from the native shell. |
| `android/app/src/main/java/com/dropzone/apextracker/widget/RankPulseWidgetProvider.java` | Updates the native home-screen Rank Pulse widget. |
| `android/app/src/main/res/layout/activity_main.xml` | Native landing screen layout. |
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

## Planned Live Data Contract

Later, the Android widget should call a server endpoint similar to:

```text
GET /api/mobile/rank-pulse-summary
```

That endpoint should return no secrets, only the small widget summary:

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
      "badgeLabel": "PL",
      "hasHeatStreak": true
    }
  ]
}
```

The Android widget should display only the first three players: the owner account plus two
friends.

## Daily RP Plan

The current web preview calculates daily RP from the first RP value the browser saw today.
That is useful for local testing, but it still depends on the app being opened.

For real Android widget behavior, use Option 2 from the earlier discussion:

- Vercel Cron refreshes tracked players on the server.
- Redis or a small database stores the first RP snapshot of the day and the latest RP.
- Daily net RP is calculated as `latest RP - first RP snapshot of the day`.
- The Android widget reads the server summary every two hours.

This is the path that lets the widget update even when the app was not opened that day.

## Native Refresh Notes

The scaffold sets `android:updatePeriodMillis="7200000"`, which is two hours. Android may still
delay background updates to protect battery life. For richer background behavior later, add
WorkManager and let it fetch the server summary, then update the widget.

## How To Change The Widget

- Change player preview data in `RankPulseWidgetProvider.java`.
- Change the widget title and refresh label in `strings.xml`.
- Change colors in `colors.xml`.
- Change row spacing and text sizes in `styles.xml`.
- Change the compact layout in `rank_pulse_widget.xml`.
- Change the trend thresholds in `RankPulseWidgetProvider.java`.

## What To Build Next

1. Install Android Studio and verify the scaffold on a real Android phone.
2. Add the secure server summary endpoint.
3. Replace preview rows in the widget provider with fetched server data.
4. Add Android notifications for rank-up, rank-down, RP gain, and RP loss.
5. Add release signing and a Play Store publishing checklist.
