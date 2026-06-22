# Mobile Widget And Notifications

## Compact Widget Direction

The dashboard now includes a draggable in-app preview of the compact Rank Pulse widget. It is not
yet the Android launcher widget itself, but it behaves more like a movable home-screen card inside
the Dropzone dashboard.

The Android-first native scaffold now lives in `android/`. See
[`android-native-widget.md`](android-native-widget.md) for the real home-screen widget path.

Open the dedicated phone test page on a real phone:

```text
https://dropzone-apex-tracker.vercel.app/widget
```

The preview page loads the roster saved on that phone. Friends added on a PC do not automatically
copy to the phone because the current app stores the roster in each browser's local storage.
Track squadmates from the dashboard; `/widget` mirrors that tracked roster automatically.

The `/widget` page is now a focused preview/status page. It does not include Daily RP test buttons
or its own player-tracking form, because the widget should only reflect the dashboard's tracked
teammates.

The mobile widget should occupy no more than one quarter of a phone screen.

Visual style:

- Frosted dark glass card.
- Modern geometric typography with a OnePlus-inspired feel.
- Rounded mobile-widget corners.
- Blue progress bars.
- Green daily-gain capsules.
- Red daily-loss capsules.
- Gray unchanged capsules.
- Maximum of 3 tracked players total, including the owner.

The full dashboard now uses the same dark glass design language as this widget, including
shared theme colors, rounded cards, blue progress bars, and compact modern typography.

Widget rows:

1. Owner account pinned at the top.
2. Friend one.
3. Friend two.

The widget uses the first two friends from the local dashboard roster. Apex itself does not
provide an importable in-game friends list through the current public stats APIs.

Each row shows:

- Player name.
- Current rank.
- Current RP.
- Progress bar toward next rank or division.
- Net RP change for the day.

## Daily RP Refresh Logic

The tracker refreshes player RP every 2 hours when the app is open. It also refreshes when
the user opens the dashboard, manually taps refresh, or returns to the app after playing.
Player-rank requests bypass browser/CDN caches, but the server keeps a short 5-minute
per-player cache so repeated refreshes do not burn through the Apex API key. Return-to-app
refreshes are also throttled to once every 10 minutes.

The widget preview stores:

- The first RP value seen for each player on the current day.
- The latest RP value from the most recent 2-hour refresh.
- The previous rank and latest rank.
- The timestamp of the last refresh.

Daily net RP uses the user's local calendar day and the first RP value the app saw for that
player today:

```text
current RP - first RP seen today
```

For a real Android home-screen widget that updates even when the app was not opened that day,
the server stores RP snapshots in Upstash. GitHub Actions calls the secure refresh endpoint every
2 hours, and Vercel Cron keeps a daily fallback refresh.

Important testing behavior:

- If the app opens for the first time today, the baseline is set to the current RP and the
  widget shows `0`.
- If the same browser already saved an earlier baseline today, the widget can show gain or
  loss immediately.
- If the player key changes because the stats provider changes casing or ID details, the app
  tries to recover today's baseline from the latest saved snapshot before falling back to `0`.
- If the Apex provider rate-limits the key, the server can reuse a recent cached rank instead
  of failing the whole dashboard.
- The dashboard and `/widget` preview no longer include fake Daily RP test controls. Visual trend
  states should come from real stored RP history or purpose-built local development tests.

Daily net styling:

- Daily net RP between -149 and +149: blue progress bar.
- Daily net RP of -150 or worse: lighter red progress bar.
- Daily net RP of -300 or worse: darker red progress bar.
- Daily net RP of +150 or better: lighter green progress bar.
- Daily net RP of +300 or better: darker green progress bar.
- Positive daily RP capsule: green.
- Zero daily RP capsule: gray.
- Negative daily RP capsule: red.

Heat streak behavior:

- The Apex API returns current RP, not individual match history.
- Because of that, the app treats each observed RP jump of +100 or more as a hot update.
- Three hot updates in a row shows the flame-style heat streak icon beside the player name.
- If a single refresh sees a +300 RP jump, it counts as three hot updates because the app
  cannot split that total into exact match results.

## Notification System

The app should notify when tracked players move meaningfully.

Notification triggers:

- Player ranks up.
- Player ranks down.
- Player gains RP since the last refresh.
- Player loses RP since the last refresh.

Notification tone:

- Friendly, teasing squad banter.
- Short enough to fit mobile notifications.
- Message templates must be easy to add or edit later.

Default message templates:

Rank down:

```text
{player} needs to be carried.
```

RP lost:

```text
{player} lost {rpChange} RP. Time to carry them.
```

Rank up:

```text
{player} thinks he's the best.
```

RP gained:

```text
{player} gained {rpChange} RP and thinks he's the best.
```

## Future Message Template Design

Messages live in a separate purpose-named configuration file so they are easy to edit:

```text
src/features/mobile-rank-widget/config/rank-notification-messages.ts
```

The config groups messages by event type:

- `rankUp`
- `rankDown`
- `rpGain`
- `rpLoss`

The app should choose one message from the matching group. This makes it simple to add more
messages later without changing the notification logic.

Example future structure:

```ts
export const RANK_NOTIFICATION_MESSAGES = {
  rankUp: [
    "{player} thinks he's the best.",
    "{player} is feeling dangerous after that rank up.",
  ],
  rankDown: [
    "{player} needs to be carried.",
    "{player} had a rough one. Queue the rescue mission.",
  ],
  rpGain: [
    "{player} gained {rpChange} RP and thinks he's the best.",
  ],
  rpLoss: [
    "{player} lost {rpChange} RP. Time to carry them.",
  ],
};
```

## Permission Note

Browser notifications require the user to grant notification permission. On mobile browsers,
background notifications are limited unless the app is installed as a Progressive Web App or
rebuilt as a native mobile app.
