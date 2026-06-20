# Folder And File Guide

Every manually maintained program file starts with a short comment explaining its purpose.
JSON files cannot safely contain comments, and generated files should not be manually edited.

## Root Files

| Path | Purpose |
| --- | --- |
| `.env.example` | Documents the environment variable required for live data. |
| `.gitignore` | Prevents dependencies, builds, and secrets from entering version control. |
| `eslint.config.mjs` | Defines code-quality rules. |
| `next-env.d.ts` | Generated Next.js TypeScript declarations; Next.js says not to edit it. |
| `package.json` | JSON package manifest, scripts, and dependencies. JSON does not allow comments. |
| `package-lock.json` | npm-generated exact dependency versions. Do not manually edit it. |
| `tsconfig.json` | TypeScript compiler configuration. |
| `README.md` | Quick project entry point and documentation links. |
| `CONTRIBUTING.md` | Explains how collaborators should branch, test, and open pull requests. |
| `CHANGELOG.md` | Tracks user-facing changes by version. |

## Documentation Folder

| Path | Purpose |
| --- | --- |
| `documentation/project-overview.md` | Explains the app's goal, technology, and scope. |
| `documentation/architecture-and-data-flow.md` | Explains layers and runtime data flow. |
| `documentation/folder-and-file-guide.md` | Explains every maintained folder and file. |
| `documentation/setup-running-and-verification.md` | Gives install, run, and test commands. |
| `documentation/api-and-data-behavior.md` | Explains APIs, demo behavior, and data contracts. |
| `documentation/mobile-widget-and-notifications.md` | Defines the compact phone widget and notification behavior. |
| `documentation/customization-guide.md` | Shows where to edit common features yourself. |
| `documentation/optimization-techniques.md` | Explains the performance optimizations used in the project. |
| `documentation/publishing-guide.md` | Explains how to publish the app with GitHub and Vercel. |
| `documentation/release-and-collaboration-workflow.md` | Explains Git, GitHub, issues, pull requests, and releases. |
| `documentation/maintenance-guide.md` | Explains common future changes. |

## GitHub Collaboration Files

| Path | Purpose |
| --- | --- |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Form for users to report bugs. |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Form for users to request features. |
| `.github/ISSUE_TEMPLATE/release_task.md` | Checklist for preparing a stable version release. |
| `.github/ISSUE_TEMPLATE/config.yml` | GitHub issue-template settings. |
| `.github/pull_request_template.md` | Checklist for proposed code changes. |
| `.github/workflows/quality-checks.yml` | Runs lint and production build checks for pull requests and `main`. |
| `.github/workflows/release.yml` | Creates GitHub Releases from version tags after verification passes. |
| `.github/dependabot.yml` | Opens dependency update pull requests on a weekly schedule. |

## Source Folder

### `src/app`: Next.js Entry Points

Next.js requires the generic filenames `layout.tsx`, `page.tsx`, and `route.ts`. Their
purpose-named parent folders and header comments explain what they do.

| Path | Purpose |
| --- | --- |
| `src/app/layout.tsx` | Creates the shared HTML shell, metadata, fonts, and global styles. |
| `src/app/page.tsx` | Renders the tracker dashboard at `/`. |
| `src/app/api/_shared/api-request-guard.ts` | Provides same-origin and rate-limit protection for API routes. |
| `src/app/api/apex/player-rank-status/route.ts` | Protects the API key and returns player rank data. |
| `src/app/api/apex/player-rank-statuses/route.ts` | Protects the API key and returns a batched roster of player rank data. |
| `src/app/api/apex/ranked-map-rotation/route.ts` | Protects the API key and returns ranked map data. |

### `src/domain/apex-ranked`: Game Rules And Contracts

| Path | Purpose |
| --- | --- |
| `types/apex-tracker-types.ts` | Defines shared player, rank progress, map, and platform contracts. |
| `rank-calculations/rank-progress-calculator.ts` | Stores RP thresholds and calculates rank progress. |
| `demo-data/demo-player-rank-factory.ts` | Creates predictable demo player ranks. |
| `demo-data/demo-ranked-map-factory.ts` | Creates a demo ranked-map rotation. |

### `src/integrations/apex-legends-status`: External API Translation

| Path | Purpose |
| --- | --- |
| `player-rank-response-normalizer.ts` | Converts external player fields into the internal contract. |
| `player-rank-service.ts` | Shares server-side Apex player fetch, cache, demo fallback, and error logic. |
| `ranked-map-response-normalizer.ts` | Converts external map fields into the internal contract. |

### `src/features/tracker-dashboard`: Dashboard Feature

| Path | Purpose |
| --- | --- |
| `components/apex-tracker-dashboard.tsx` | Coordinates dashboard state, loading, forms, and layout. |
| `components/friend-rank-card.tsx` | Renders one friend's rank status. |
| `components/rank-badge.tsx` | Renders live or fallback rank badge artwork. |
| `config/dashboard-defaults.ts` | Stores default profiles, labels, and rank colors. |
| `data-access/tracker-api-client.ts` | Calls protected internal API routes from the browser. |
| `utilities/dashboard-display-formatters.ts` | Formats numbers, initials, and map countdowns. |

### `src/features/mobile-rank-widget`: Planned Mobile Widget Feature

These files define and preview the compact Rank Pulse widget before it becomes a native phone
home-screen widget.

| Path | Purpose |
| --- | --- |
| `components/compact-rank-pulse-widget.tsx` | Renders the compact live widget preview. |
| `config/mobile-widget-settings.ts` | Stores planned widget limits, refresh timing, and storage keys. |
| `config/rank-notification-messages.ts` | Stores editable rank/RP notification message templates. |

### `src/styles`: Visual Design

| Path | Purpose |
| --- | --- |
| `dropzone-application.css` | Contains the complete global, dark theme, glass redesign, widget, and responsive visual system. |
