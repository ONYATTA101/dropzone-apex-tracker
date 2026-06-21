# Architecture And Data Flow

## Architecture Layers

The source is separated by responsibility:

1. `src/app` contains Next.js framework entry points and server API routes.
2. `src/features/tracker-dashboard` contains the user-facing dashboard feature.
3. `src/domain/apex-ranked` contains Apex Ranked rules, contracts, and demo data.
4. `src/integrations/apex-legends-status` translates external API responses.
5. `src/styles` contains application-wide styling.

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
