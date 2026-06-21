# Dropzone Android App

This folder holds the native Android version of Dropzone Apex Tracker. The first Android
target is a home-screen Rank Pulse widget, because the web app cannot create a true
Weather-style Android widget by itself.

## What Exists Now

- A native Android project that Android Studio can open from this `android` folder.
- A small launcher activity that opens the live Dropzone dashboard.
- A native `AppWidgetProvider` named `RankPulseWidgetProvider`.
- A compact dark Rank Pulse widget layout with three tracked-player rows.
- Commented Java, XML, and Gradle files so you can see where to change labels, colors, and
  refresh behavior later.

The widget currently uses safe placeholder squad data. This is intentional: an Android APK can
be inspected, so the Apex API key must stay on the server, never inside the phone app.

## Requirements

- Android Studio with the Android SDK installed.
- JDK 17. Android Studio normally bundles this.
- Android Gradle plugin 9.2.0 support.
- Gradle 9.4.1, or the checked-in `gradlew.bat` wrapper.
- Android SDK Platform 36 and Build-Tools 36.1.0 for command-line builds.

This workspace uses local command-line Android tools when Android Studio is not available.
Android Studio is still the easiest way to install emulators and visually inspect the widget.

## How To Open

1. Open Android Studio.
2. Choose `File > Open`.
3. Select this `android` folder.
4. Let Android Studio sync the Gradle project.
5. Connect an Android phone or start an emulator.
6. Run the `app` configuration.

## How To Build From Terminal

```powershell
cd android
.\gradlew.bat assembleDebug
```

The debug APK is created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## How To Test The Widget

1. Install/run the Android app on the phone.
2. Long-press the Android home screen.
3. Choose `Widgets`.
4. Find `Dropzone`.
5. Drag `Rank Pulse` to the home screen.

The widget is designed as a compact information widget. It fits the same idea as the web
preview: owner plus two friends, rank text, current RP, daily net RP, and a trend-colored bar.

## Next Android Milestones

1. Add a secure server summary endpoint for the widget.
2. Add Android background refresh with WorkManager.
3. Store the user's selected roster on the server instead of only browser local storage.
4. Connect rank-up, rank-down, RP gain, and RP loss notifications.
5. Add Play Store signing and release build steps.

## Important Backend Reminder

For real daily net RP that does not depend on opening the app, use the earlier Option 2 plan:
Vercel Cron plus a small database or Redis store. The server should snapshot tracked players
throughout the day, and the Android widget should read the latest server summary.
