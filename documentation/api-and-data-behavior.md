# API And Data Behavior

## External Provider

The app uses the unofficial Apex Legends Status API:

- Player statistics: `https://api.apexlegendsstatus.com/bridge`
- Map rotation: `https://api.apexlegendsstatus.com/maprotation?version=2`

The provider is unofficial and does not guarantee uptime.

## Apex Friends List Limitation

The current public Apex stats APIs do not expose a player's in-game Apex friends list. The app
therefore cannot automatically import friends already added inside Apex Legends.

Instead, the dashboard provides a manual roster tool:

- Click **Track a squadmate**.
- Enter one Apex ID.
- Choose PC, PlayStation, or Xbox from the platform options.
- Submit the popup to save that squadmate locally.

Example:

```text
FriendApexID + PlayStation
```

Once saved, those friends are stored locally in the browser and their live ranks are fetched
from the player rank endpoint.

## Internal Endpoints

### `GET /api/apex/player-rank-status`

Query parameters:

| Parameter | Required | Meaning |
| --- | --- | --- |
| `player` | Yes | Player's account name. |
| `platform` | Yes | `PC`, `PS4`, or `X1`. |
| `primary` | No | Makes the no-key demo profile use a Platinum rank. |

Returns the `PlayerRankStatus` contract.

### `POST /api/apex/player-rank-statuses`

Body:

```json
{
  "players": [
    { "name": "blumoat_onyatta", "platform": "PS4", "primary": true },
    { "name": "FriendName", "platform": "PC" }
  ]
}
```

Returns:

```text
PlayerRankBatchResponse
```

This is the optimized route used by the dashboard. It lets the browser request the full roster
with one call while the server safely handles provider requests and API-key protection.

The response includes stable request keys so the UI can map each result back to the exact
requested player:

```text
results[].requestKey
results[].player
results[].player.rpHistory
```

`rpHistory` includes server-calculated daily RP fields such as `dailyNetRp`, `lastDeltaRp`,
`highestRp`, `lowestRp`, `updateCount`, and `hasHeatStreak`.

## API Protection

The internal Apex proxy routes use:

- same-origin request checks
- in-memory per-route rate limiting
- server-only API key access

This protects casual public abuse, but a production deployment with many users should add
durable rate limiting at the hosting or database layer.

Player rank lookups use a short in-memory cache to avoid hitting provider limits. Manual refresh,
return-to-app refresh, and native widget refresh bypass that short cache so Dropzone asks Apex
Legends Status for the newest value it has. If the provider still returns an older RP than the
in-game lobby, the app cannot see the newer RP until the provider updates its data.

### `GET /api/mobile/rank-pulse-summary`

Returns the mobile-safe summary used by the native Android home-screen widget. It does not
accept arbitrary player names from the phone, and it does not expose `APEX_API_KEY`.

The roster comes from `DROPZONE_MOBILE_WIDGET_PLAYERS` when configured:

```env
DROPZONE_MOBILE_WIDGET_PLAYERS=PS4:blumoat_onyatta,PC:FriendOne,PS4:FriendTwo
```

If that variable is missing, the endpoint uses the default dashboard profile plus any configured
starter friends. The starter friend list is empty by default so demo friends do not appear.

Daily RP baselines are stored by the server history layer using `DROPZONE_WIDGET_TIME_ZONE`,
which defaults to `Africa/Nairobi`. Local development writes `.dropzone-data/rp-history.json`.
Production should set Upstash Redis or Vercel KV REST env vars so history survives server restarts.

The response also includes `historyStorageMode` so you can see whether the deployment is using
`upstash`, `file`, or `memory`.

### `GET /api/cron/refresh-rank-pulse`

Refreshes the configured Rank Pulse roster and writes RP history without the dashboard being open.
Vercel Cron calls this route with `GET`.

Security:

- Set `DROPZONE_CRON_SECRET` in production.
- Call with `Authorization: Bearer <DROPZONE_CRON_SECRET>` when using an external scheduler.
- Vercel Cron can call the route directly, but a secret is stronger.

### `GET /api/apex/ranked-map-rotation`

Returns the `RankedMapRotation` contract containing current map, next map, optional image,
rotation end time, and whether the data is live or demo.

## RP Calculation

The external API supplies the player's rank name, division, and total RP. The app calculates:

- The RP floor for the current division.
- RP earned inside the current division.
- RP remaining to the next division.
- Division completion percentage.

These thresholds live in `rank-progress-calculator.ts` and should be reviewed when EA changes
the Ranked system.

## Demo Data

Demo player data uses a deterministic hash of the player's name. It is intentionally stable:
refreshing the same name produces the same rank, score, level, and selected Legend.

## Caching

Server calls to the external provider use a short in-memory fresh cache unless the request asks
for a force refresh. Manual refresh, return-to-app refresh, native widget refresh, and cron
refresh bypass that fresh cache.
