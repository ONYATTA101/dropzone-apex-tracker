# Folder And File Guide

Every manually maintained program file starts with a short comment explaining its purpose.
JSON files cannot safely contain comments, and generated files should not be manually edited.

## Root Files

| Path | Purpose |
| --- | --- |
| `.github/workflows/refresh-rank-pulse.yml` | Calls the secure production RP refresh endpoint every 2 hours. |
| `.env.example` | Documents the environment variable required for live data. |
| `.gitignore` | Prevents dependencies, builds, and secrets from entering version control. |
| `eslint.config.mjs` | Defines code-quality rules. |
| `next-env.d.ts` | Generated Next.js TypeScript declarations; Next.js says not to edit it. |
| `package.json` | JSON package manifest, scripts, and dependencies. JSON does not allow comments. |
| `package-lock.json` | npm-generated exact dependency versions. Do not manually edit it. |
| `tsconfig.json` | TypeScript compiler configuration. |
| `vercel.json` | Configures the safe daily Vercel Cron fallback for RP history refresh. |
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
| `documentation/android-native-widget.md` | Explains the Android native app and real home-screen widget path. |
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
| `src/app/login/page.tsx` | Renders the Dropzone account login and registration page. |
| `src/app/admin/users/page.tsx` | Renders the admin-safe registered users viewer. |
| `src/app/widget/page.tsx` | Renders the dedicated phone widget test page at `/widget`. |
| `src/app/api/_shared/api-request-guard.ts` | Provides same-origin and rate-limit protection for API routes. |
| `src/app/api/admin/users/route.ts` | Returns safe registered-user metadata when the admin secret is supplied. |
| `src/app/api/apex/player-rank-status/route.ts` | Protects the API key and returns player rank data. |
| `src/app/api/apex/player-rank-statuses/route.ts` | Protects the API key and returns a batched roster of player rank data. |
| `src/app/api/apex/rp-history-calendar/route.ts` | Returns day-by-day RP history for the Statistics History calendar. |
| `src/app/api/apex/rp-history-comparison/route.ts` | Returns stored RP comparison graph data for the Statistics Comparison tab. |
| `src/app/api/auth/login/route.ts` | Verifies a Dropzone password and sets the signed login cookie. |
| `src/app/api/auth/logout/route.ts` | Clears the signed login cookie. |
| `src/app/api/auth/lookup/route.ts` | Verifies an Apex ID and reports whether a Dropzone account exists. |
| `src/app/api/auth/register/route.ts` | Creates a Dropzone account with a salted password hash. |
| `src/app/api/auth/session/route.ts` | Returns the safe currently signed-in user from the session cookie. |
| `src/app/api/apex/ranked-map-rotation/route.ts` | Protects the API key and returns ranked map data. |
| `src/app/api/cron/refresh-rank-pulse/route.ts` | Refreshes configured Rank Pulse players and stores server RP history on a schedule. |
| `src/app/api/mobile/rank-pulse-summary/route.ts` | Returns mobile-safe widget display data without exposing the Apex API key. |

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
| `components/draggable-rank-pulse-widget.tsx` | Renders the movable dashboard Rank Pulse widget that mirrors tracked players. |
| `components/friend-rank-card.tsx` | Renders one friend's rank status. |
| `components/rank-badge.tsx` | Renders live or fallback rank badge artwork. |
| `components/account-statistics-modal.tsx` | Renders the Statistics modal with History calendar and Comparison graph tabs. |
| `config/dashboard-defaults.ts` | Stores default profiles, labels, and rank colors. |
| `data-access/tracker-api-client.ts` | Calls protected internal API routes from the browser. |
| `utilities/dashboard-display-formatters.ts` | Formats numbers, initials, and map countdowns. |

### `src/features/dropzone-auth`: Dropzone Account Feature

| Path | Purpose |
| --- | --- |
| `components/dropzone-login-panel.tsx` | Handles Apex ID lookup, account creation, login, logout, and dashboard handoff. |
| `components/dropzone-admin-users-panel.tsx` | Shows registered-user metadata after the admin secret is entered. |
| `server/dropzone-auth-service.ts` | Verifies Apex IDs, hashes passwords, signs sessions, and prepares safe admin summaries. |
| `server/dropzone-auth-store.ts` | Provides local file, memory, and Upstash/Vercel KV REST storage for Dropzone users. |
| `server/dropzone-auth-cookies.ts` | Sets and clears the signed HTTP-only Dropzone session cookie. |

### `src/features/mobile-rank-widget`: Planned Mobile Widget Feature

These files define and preview the compact Rank Pulse widget before it becomes a native phone
home-screen widget.

| Path | Purpose |
| --- | --- |
| `components/compact-rank-pulse-widget.tsx` | Renders the compact live widget preview. |
| `components/mobile-widget-test-screen.tsx` | Renders the dedicated `/widget` phone preview/status screen. |
| `config/mobile-widget-settings.ts` | Stores planned widget limits, refresh timing, and storage keys. |
| `config/rank-notification-messages.ts` | Stores editable rank/RP notification message templates. |
| `utilities/widget-daily-rp-baselines.ts` | Stores local daily RP baselines and momentum snapshots for net gain/loss display. |

### `src/features/rp-history`: Server RP History Feature

| Path | Purpose |
| --- | --- |
| `server/rank-pulse-roster.ts` | Selects the configured server-side Rank Pulse roster. |
| `server/rp-history-service.ts` | Calculates and stores daily RP baseline, latest RP, last delta, high/low RP, and heat streaks. |
| `server/rp-history-store.ts` | Provides local file, memory, and Upstash/Vercel KV REST storage adapters. |

### `src/styles`: Visual Design

| Path | Purpose |
| --- | --- |
| `dropzone-application.css` | Contains the complete global, dark theme, glass redesign, widget, and responsive visual system. |

## Android Folder

The `android` folder contains the first native Android scaffold for a real phone app and
home-screen widget. Android XML and Gradle files include comments because they are manually
maintained. Generated Android Studio folders such as `.gradle`, `build`, `.idea`, and
`local.properties` should stay out of Git.

| Path | Purpose |
| --- | --- |
| `android/README.md` | Explains how to open, run, and test the native Android scaffold. |
| `android/settings.gradle.kts` | Names the Android project and includes the native `app` module. |
| `android/build.gradle.kts` | Stores the Android Gradle plugin version. |
| `android/gradle.properties` | Stores Android Gradle build settings. |
| `android/gradlew` | Unix-like shell script for running the pinned Gradle version. |
| `android/gradlew.bat` | Windows script for running the pinned Gradle version. |
| `android/gradle/wrapper/gradle-wrapper.properties` | Configures the pinned Gradle wrapper distribution. |
| `android/gradle/wrapper/gradle-wrapper.jar` | Gradle wrapper bootstrap jar generated by Gradle. |
| `android/app/build.gradle.kts` | Configures the app package, SDK levels, and version. |
| `android/app/src/main/AndroidManifest.xml` | Declares the launcher activity and Rank Pulse widget receiver. |
| `android/app/src/main/java/com/dropzone/apextracker/MainActivity.java` | Shows the live Dropzone dashboard inside the native app shell. |
| `android/app/src/main/java/com/dropzone/apextracker/widget/RankPulseWidgetProvider.java` | Fetches mobile-safe data and updates the native Rank Pulse home-screen widget. |
| `android/app/src/main/res/layout/activity_main.xml` | Defines the in-app dashboard WebView layout. |
| `android/app/src/main/res/layout/rank_pulse_widget.xml` | Defines the compact Android home-screen widget UI. |
| `android/app/src/main/res/xml/rank_pulse_widget_info.xml` | Defines widget sizing, category, preview, and update metadata. |
| `android/app/src/main/res/values/colors.xml` | Stores native app and widget color tokens. |
| `android/app/src/main/res/values/strings.xml` | Stores native Android labels and copy. |
| `android/app/src/main/res/values/styles.xml` | Stores native widget row, badge, text, and progress styles. |
| `android/app/src/main/res/drawable/*` | Stores native backgrounds, progress bars, heat icon, and launcher mark. |
| `android/app/src/main/res/mipmap-anydpi-v26/*` | Stores adaptive Android launcher icon definitions. |
