# Mobile Widget And Notifications

## Compact Widget Direction

The dashboard now includes a live in-app preview of the compact Rank Pulse widget. It is not
yet a native phone home-screen widget, but it shows the design and behavior inside the web app.

Open the dedicated phone test page on a real phone:

```text
https://dropzone-apex-tracker.vercel.app/widget
```

The test page loads the roster saved on that phone. Friends added on a PC do not automatically
copy to the phone because the current app stores the roster in each browser's local storage.
Use the form on `/widget` to add your phone test roster.

The `/widget` page is designed as a one-screen phone control panel. It shows removable tracked
player chips, with a delete icon on friend chips so players can be removed without scrolling
through a long roster form.

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
Player-rank requests bypass app-level caches so the daily RP number reacts to fresh provider data.

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

Important testing behavior:

- If the app opens for the first time today, the baseline is set to the current RP and the
  widget shows `0`.
- If the same browser already saved an earlier baseline today, the widget can show gain or
  loss immediately.
- If the player key changes because the stats provider changes casing or ID details, the app
  tries to recover today's baseline from the latest saved snapshot before falling back to `0`.
- The dashboard widget preview and `/widget` test page include Daily RP test buttons so you
  can confirm the green gain and red loss states without waiting for a real RP change.

Daily net styling:

- Positive value: green.
- Zero: gray.
- Negative value: red.

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
