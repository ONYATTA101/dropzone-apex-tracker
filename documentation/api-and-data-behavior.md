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

### Dropzone Auth

Dropzone accounts use the player's Apex ID as the username. The login flow:

1. `/login` asks for Apex ID and platform.
2. `POST /api/auth/lookup` verifies the Apex ID against the stats provider.
3. If no Dropzone account exists, the user creates a password.
4. `POST /api/auth/register` stores a salted password hash and sets a signed session cookie.
5. `POST /api/auth/login` verifies the password hash and refreshes safe account metadata.

Passwords are never stored as readable text and are never returned to the browser or admin UI.

Admin visibility:

- `/admin/users` asks for `DROPZONE_ADMIN_SECRET`.
- `GET /api/admin/users` returns user metadata, login count, rank snapshot, and timestamps.
- The admin response does not include password hashes, salts, or session cookies.

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

### `GET /api/apex/rp-history-calendar`

Query parameters:

| Parameter | Required | Meaning |
| --- | --- | --- |
| `player` | Yes | Player's account name. |
| `platform` | Yes | `PC`, `PS4`, or `X1`. |
| `month` | No | Calendar month in `YYYY-MM` format. Defaults to the current server month. |

Returns the stored Statistics -> History calendar for the selected month. The response includes:

```text
month
monthLabel
monthlyNetRp
days[]
days[].dailyNetRp
days[].baselineRp
days[].currentRp
days[].highestRp
days[].lowestRp
```

The dashboard uses this route for the Account -> Statistics -> History calendar. It reads existing RP history
from the server store; it does not expose the external Apex API key.

### `POST /api/apex/rp-history-comparison`

Body:

```text
players[]
players[].name
players[].platform
```

Returns stored Statistics -> Comparison graph data for up to three tracked players. Each player
includes daily points with `dailyNetRp` and `cumulativeNetRp`, plus total and average daily RP
fields for the legend cards.

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
expose `APEX_API_KEY`.

By default, the roster comes from `DROPZONE_MOBILE_WIDGET_PLAYERS` when configured:

```env
DROPZONE_MOBILE_WIDGET_PLAYERS=PS4:blumoat_onyatta,PC:FriendOne,PS4:FriendTwo
```

If that variable is missing, the endpoint uses the default dashboard profile plus any configured
starter friends. The starter friend list is empty by default so demo friends do not appear.

The Android app can override that roster for one widget refresh by sending the dashboard-tracked
players in the optional `players` query parameter:

```text
/api/mobile/rank-pulse-summary?players=PS4:blumoat_onyatta,PC:FriendOne,X1:FriendTwo
```

The endpoint caps this override to three players and still fetches data server-side, so the phone
never receives the private Apex API key. This is how the real home-screen widget mirrors the
tracked players already added inside the app.

Daily RP baselines are stored by the server history layer using `DROPZONE_WIDGET_TIME_ZONE`,
which defaults to `Africa/Nairobi`. Local development writes `.dropzone-data/rp-history.json`.
Production should set Upstash Redis or Vercel KV REST env vars so history survives server restarts.
The app keeps `DROPZONE_RP_HISTORY_MAX_DAYS` days per player, defaulting to 120 days so the
calendar can cover a practical current-season window.

The response also includes `historyStorageMode` so you can see whether the deployment is using
`upstash`, `file`, or `memory`.

### `GET /api/cron/refresh-rank-pulse`

Refreshes the configured Rank Pulse roster and writes RP history without the dashboard being open.
GitHub Actions calls this route every 2 hours through `.github/workflows/refresh-rank-pulse.yml`
when Actions is enabled for the repository. Vercel Cron also calls it daily as a fallback.
If GitHub Actions is locked or disabled, use any external HTTP scheduler with the same endpoint
and bearer token.

Security:

- Set `DROPZONE_CRON_SECRET` in production.
- Call with `Authorization: Bearer <DROPZONE_CRON_SECRET>` when using an external scheduler.
- Vercel Cron can call the route directly, but a secret is stronger.

Production roster:

- `DROPZONE_MOBILE_WIDGET_PLAYERS` controls which players the background job refreshes.
- Format: `PS4:Player,PC:Friend,X1:FriendTwo`.
- Keep it to three players so the server history matches the Rank Pulse widget.

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
