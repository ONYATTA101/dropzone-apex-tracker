# Architecture And Data Flow

## Architecture Layers

The source is separated by responsibility:

1. `src/app` contains Next.js framework entry points and server API routes.
2. `src/features/tracker-dashboard` contains the user-facing dashboard feature.
3. `src/domain/apex-ranked` contains Apex Ranked rules, contracts, and demo data.
4. `src/integrations/apex-legends-status` translates external API responses.
5. `src/styles` contains application-wide styling.
6. `android` contains the native Android app and home-screen widget scaffold.

## Player Rank Data Flow

1. `apex-tracker-dashboard.tsx` asks `tracker-api-client.ts` for the full tracked roster.
2. The API client calls `/api/apex/player-rank-statuses` once.
3. The batch server route passes each player to `player-rank-service.ts`.
4. Without a key, `demo-player-rank-factory.ts` creates demo data.
5. With a key, the service calls Apex Legends Status.
6. `player-rank-response-normalizer.ts` converts the external response into the app contract.
7. `rank-progress-calculator.ts` calculates RP earned, RP remaining, and progress percentage.
8. `rp-history-service.ts` stores the first RP seen today, latest RP, last delta, and high/low RP.
9. The dashboard renders the owner, friend cards, compact widget, and server RP history from the batched result.

## Ranked Map Data Flow

1. The dashboard API client calls `/api/apex/ranked-map-rotation`.
2. The server route returns demo data or calls Apex Legends Status.
3. `ranked-map-response-normalizer.ts` converts live data into the app contract.
4. The dashboard starts a browser countdown using the rotation end time.

## Browser Storage

The dashboard stores these values in browser `localStorage`:

- `dropzone-profile`: the main player's name and platform.
- `dropzone-friends`: the list of tracked friends and platforms.
- `dropzone-tracked-player-history`: recently removed tracked players and their last known rank.

No account password or API key is stored there.

## Security Boundary

The browser calls only internal Next.js API routes. `APEX_API_KEY` is read exclusively by
server route files, preventing it from being included in browser JavaScript.

The Android app follows the same rule. Do not place `APEX_API_KEY` in Android source, XML,
Gradle files, or packaged assets. The native widget reads a safe server summary that contains
only display data.

## Android Widget Data Flow

The native widget renders cached server rows first so it can appear quickly on the home screen.
It then refreshes from the mobile summary endpoint in the background and stores the latest JSON
for offline use.

The current live flow is:

1. Android asks `/api/mobile/rank-pulse-summary` for the three-player Rank Pulse summary.
2. The server route uses the private `APEX_API_KEY` to load rank data.
3. The server writes the latest player snapshot into the RP history store.
4. The response includes current RP, daily net RP, last delta, high/low RP, rank label, progress percentage, and heat streak state.
5. `RankPulseWidgetProvider.java` caches the response and renders it into the home-screen widget.

## Server RP History Flow

1. `.github/workflows/refresh-rank-pulse.yml` calls `/api/cron/refresh-rank-pulse` every 2 hours.
2. Vercel Cron also calls the same route daily as a fallback refresh.
3. The route fetches live RP through `player-rank-service.ts`.
4. `rp-history-service.ts` stores the first RP of the day and updates latest RP.
5. Local development stores history in `.dropzone-data/rp-history.json`.
6. Production uses Upstash Redis or Vercel KV when `UPSTASH_REDIS_REST_*` or `KV_REST_API_*` env vars exist.
7. If no durable production store is configured, the app falls back to memory and marks that response with `historyStorageMode: "memory"`.
