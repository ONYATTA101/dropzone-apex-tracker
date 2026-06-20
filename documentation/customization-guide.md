# Customization Guide

This guide shows where to make common changes yourself. Source files also include comments
near the safest edit points.

## Change Your Default Account

Open:

```text
src/features/tracker-dashboard/config/dashboard-defaults.ts
```

Edit:

```ts
export const DEFAULT_PROFILE = {
  name: "your_account_name",
  platform: "PS4",
};
```

Valid platform values:

- `PC`
- `PS4`
- `X1`

The UI displays `PS4` as PlayStation and `X1` as Xbox.

## Change Starter Friends

Open:

```text
src/features/tracker-dashboard/config/dashboard-defaults.ts
```

Edit `DEFAULT_FRIENDS`.

The full dashboard can show more than 3 friends, but the planned mobile widget will show only
3 total players: you plus 2 friends.

## Add Apex Friends To Track

The app cannot automatically pull the friend list from your Apex account because the public
stats API does not expose it.

Use the dashboard instead:

1. Click **Add friend**.
2. Paste one friend per line.
3. Pick the default platform.
4. Add `, Xbox` or `, PlayStation` after a name if that friend is on another platform.

Example:

```text
NovaPulse
StaticViper, Xbox
FriendName, PlayStation
```

Saved friends are stored in browser localStorage under `dropzone-friends`.

## Change Rank Colors

Open:

```text
src/features/tracker-dashboard/config/dashboard-defaults.ts
```

Edit `RANK_DISPLAY_COLOR`.

These colors affect rank badges and rank highlights.

## Change App Theme Colors

Open:

```text
src/styles/dropzone-application.css
```

Edit the CSS variables at the top:

```css
:root {
  --bg: #080b12;
  --panel: #10151f;
  --accent: #ff4656;
  --cyan: #62d5db;
}
```

This is the safest way to reskin the app without touching every component.

The dashboard and Rank Pulse widget now share the same theme system. The active theme is
stored in browser localStorage under:

```text
dropzone-theme-mode
```

Dark mode variables live in:

```css
html[data-theme="dark"] {
  ...
}
```

The glass redesign overrides are grouped under:

```css
Unified Apple/OnePlus-inspired glass theme
```

Edit that block when you want the main dashboard to look more or less like the widget.

## Change Fonts

Open:

```text
src/app/layout.tsx
```

The font imports are near the top of the file. Change them if you want a softer Apple style,
a sharper OnePlus style, or a more gaming-style display font.

## Change RP Thresholds

Open:

```text
src/domain/apex-ranked/rank-calculations/rank-progress-calculator.ts
```

Edit `RANK_STEPS` only when EA changes ranked RP requirements.

Important:

- Keep the list in ascending RP order.
- Keep each rank/division pair unique.
- Master is the final fixed RP floor.
- Predator is treated as a leaderboard tier, not a fixed RP threshold.

## Change Demo Data

Player demo data:

```text
src/domain/apex-ranked/demo-data/demo-player-rank-factory.ts
```

Map demo data:

```text
src/domain/apex-ranked/demo-data/demo-ranked-map-factory.ts
```

Use these files when you want demo mode to preview different ranks, Legends, or maps.

## Change API Refresh Timing

Server cache timing lives in:

```text
src/app/api/apex/player-rank-status/route.ts
src/app/api/apex/ranked-map-rotation/route.ts
```

Look for:

```ts
next: { revalidate: 60 }
```

That number is seconds.

The planned phone widget's 2-hour refresh setting lives in:

```text
src/features/mobile-rank-widget/config/mobile-widget-settings.ts
```

## View Or Change The Phone Widget Preview

The widget preview component lives here:

```text
src/features/mobile-rank-widget/components/compact-rank-pulse-widget.tsx
```

The dedicated phone test screen lives here:

```text
src/features/mobile-rank-widget/components/mobile-widget-test-screen.tsx
```

Open the public phone test page here:

```text
https://dropzone-apex-tracker.vercel.app/widget
```

The dashboard renders it here:

```text
src/features/tracker-dashboard/components/apex-tracker-dashboard.tsx
```

Look for:

```tsx
<CompactRankPulseWidget owner={me} friends={friends} />
```

The widget is capped at 3 players by:

```text
src/features/mobile-rank-widget/config/mobile-widget-settings.ts
```

The visual style is in:

```text
src/styles/dropzone-application.css
```

Look for the comment:

```css
Compact Rank Pulse phone-widget preview
```

## Change Notification Messages

Open:

```text
src/features/mobile-rank-widget/config/rank-notification-messages.ts
```

Add more strings to the event arrays:

- `rankUp`
- `rankDown`
- `rpGain`
- `rpLoss`

Supported placeholders:

- `{player}`
- `{rpChange}`
- `{rank}`

Example:

```ts
rankDown: [
  "{player} needs to be carried.",
  "{player} dropped to {rank}. Someone save them.",
],
```

## Change Friend Card Layout

Open:

```text
src/features/tracker-dashboard/components/friend-rank-card.tsx
```

This controls each friend's card in the dashboard.

## Change Main Dashboard Layout

Open:

```text
src/features/tracker-dashboard/components/apex-tracker-dashboard.tsx
```

The file has comments marking the sidebar, topbar, rank panel, map panel, stat cards, friend
section, and modal.

## Change Number Or Countdown Formatting

Open:

```text
src/features/tracker-dashboard/utilities/dashboard-display-formatters.ts
```

This file controls:

- RP number formatting.
- Placeholder initials.
- Map countdown formatting.

## When External API Fields Change

Player response mapping:

```text
src/integrations/apex-legends-status/player-rank-response-normalizer.ts
```

Map response mapping:

```text
src/integrations/apex-legends-status/ranked-map-response-normalizer.ts
```

Change these files when Apex Legends Status changes field names or nesting.

## Safe Change Checklist

After changing code, run:

```powershell
npm run lint
npm run build
```

If both pass, the change is probably safe.
