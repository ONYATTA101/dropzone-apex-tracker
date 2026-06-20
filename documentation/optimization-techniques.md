# Optimization Techniques

This project now uses a few practical optimizations that are safe for a small live tracker.

## Implemented Optimizations

### 1. Batch Player Fetching

Before optimization, the browser made one request for the owner and one request per friend.

Now the browser calls:

```text
POST /api/apex/player-rank-statuses
```

That endpoint receives the whole roster, then the server requests player data from Apex
Legends Status. This reduces browser network overhead and keeps the API key protected.

Batch responses include a stable `requestKey`, so the dashboard matches results back to the
requested owner/friend even if the external API returns a different display-name casing.

Files:

```text
src/app/api/apex/player-rank-statuses/route.ts
src/integrations/apex-legends-status/player-rank-service.ts
src/features/tracker-dashboard/data-access/tracker-api-client.ts
```

### 2. Shared Server Fetch Logic

Single-player and batch-player endpoints both use:

```text
src/integrations/apex-legends-status/player-rank-service.ts
```

This prevents duplicated provider logic and keeps cache/error behavior consistent.

### 3. Server-Side Request Caching

Player and map provider calls use:

```ts
next: { revalidate: 60 }
```

That means repeated requests can reuse server-side cached data for 60 seconds.

### 4. Basic API Abuse Protection

The Apex API proxy routes use a shared same-origin and in-memory rate-limit guard:

```text
src/app/api/_shared/api-request-guard.ts
```

This is a first layer of protection against public quota abuse. If the app becomes popular,
replace or extend it with durable hosting-level rate limiting.

### 5. Memoized Repeated Components

Repeated UI pieces are memoized:

```text
src/features/tracker-dashboard/components/friend-rank-card.tsx
src/features/tracker-dashboard/components/rank-badge.tsx
```

This reduces unnecessary re-render work when unrelated dashboard state changes.

### 6. Browser Rendering Hints

CSS uses containment and offscreen rendering hints for heavier card sections:

```css
contain: layout paint;
content-visibility: auto;
```

These hints live in:

```text
src/styles/dropzone-application.css
```

## Good Future Optimizations

### Add Local Stale Cache

Store the latest successful roster result in `localStorage`, render it immediately, then
refresh in the background. This makes the app feel instant on mobile.

### Add Friend Pagination

If the roster grows large, render only the first group and paginate or virtualize the rest.

### Add PWA Support

PWA support would allow installable mobile behavior, better caching, and more widget-like
launch behavior.

### Add Image Optimization

If the app starts displaying many rank or map images, move them through a controlled image
component or proxy to control size and caching.

## What To Avoid

- Do not expose `APEX_API_KEY` in browser code.
- Do not refresh every few seconds; Apex provider rate limits can block the key.
- Do not store full external API responses unless there is a clear reason.
- Do not optimize by making the code unreadable. Small, measurable changes are better.
