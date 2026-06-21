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
8. The dashboard renders the owner, friend cards, and compact widget from the batched result.

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
Gradle files, or packaged assets. The native widget should eventually read a safe server summary
that contains only display data.

## Android Widget Data Flow

The current native widget uses placeholder preview rows so it can be designed and tested before
server-side roster storage exists.

The planned live flow is:

1. Vercel Cron refreshes tracked player RP on the server.
2. Redis or a small database stores the first RP snapshot of the day and latest snapshot.
3. A mobile-safe server endpoint returns only the three-player Rank Pulse summary.
4. Android WorkManager refreshes the summary roughly every two hours.
5. `RankPulseWidgetProvider.java` renders the latest cached summary into the home-screen widget.
