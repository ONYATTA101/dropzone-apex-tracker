# Project Overview

## Purpose

Dropzone gives an Apex Legends player one place to view:

- Their current ranked tier, division, and Ranked Points (RP).
- How much RP they have earned in their division.
- How much RP remains before the next division.
- The rank status of locally tracked friends.
- The current and next Battle Royale ranked maps.

The default tracked profile is `blumoat_onyatta` on PlayStation. A user can replace this
profile from the dashboard, and that choice is then stored in their browser.

## Technology

- **Next.js App Router:** UI pages and protected server API routes.
- **React:** Interactive dashboard state and components.
- **TypeScript:** Shared data contracts and safer logic.
- **CSS:** Responsive visual design.
- **Apex Legends Status API:** Unofficial source for live player and map data.

## Application Modes

### Live mode

When `APEX_API_KEY` exists in `.env.local`, the server API routes request current data from
Apex Legends Status. The API key never reaches the browser.

### Demo mode

When no API key exists, purpose-specific demo factories return predictable player ranks and
map rotation data. This allows development and interface testing without external access.

## Current Scope

The application tracks current rank state and maps. It does not track individual match
history because that external endpoint is unavailable to ordinary new API users.
