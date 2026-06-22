# Changelog

All notable changes to Dropzone Apex Tracker should be documented here.

This project follows semantic versioning:

- `MAJOR`: breaking or very large changes.
- `MINOR`: new features.
- `PATCH`: bug fixes.

## Unreleased

- Added server-side RP history with file/memory/Upstash storage, scheduled refresh API, daily high/low RP, and dashboard history stats.
- Added force-refresh rank lookups for manual refresh, return-to-app refresh, and native widget refresh so app-side cache does not hide newer RP.
- Replaced the old multiline friend entry with a Track a Squadmate popup that uses one Apex ID field and platform choices.
- Added a mobile-safe Rank Pulse summary API for the native Android widget.
- Changed the Android app and widget taps to open Dropzone inside the app instead of a browser.
- Updated the Android widget to fetch and cache server Rank Pulse data.
- Added an Android-first native app scaffold with a compact Rank Pulse home-screen widget.
- Added Android widget documentation and file-purpose notes.
- Added local Android command-line build requirements for SDK 36.
- Added a Gradle wrapper for repeatable Android command-line builds.
- Made the phone dashboard header name smaller and more minimal.
- Added a DROPZONE account dropdown with Account, History, Widget, and Settings actions.
- Added dashboard player removal history with quick re-track actions.
- Added Rank Pulse trend gradients and heat-streak indicators for strong positive RP movement.
- Added provider-side player-rank caching and resume-refresh cooldowns to prevent Apex API limit spikes.
- Improved daily net RP tracking with fresh player-rank fetches and refresh-on-return behavior.
- Added visible dashboard remove buttons and rank badges inside each Rank Pulse tracked-player row.
- Removed the repeated dashboard stat cards for RP to next rank, squad tracked, and account level.
- Added removable tracked-player chips and a one-screen phone widget control layout.
- Simplified the mobile dashboard header to a single sticky name-only bar.
- Cleaned up the phone widget test layout to reduce gaps, remove repeated copy, and prevent sideways shifting.
- Added dedicated `/widget` phone test page for the Rank Pulse widget preview.
- Added Daily RP baseline test controls to the dashboard and phone widget preview.
- Added collaboration workflow documentation.
- Added GitHub issue and pull request templates.
- Added publishing guide for GitHub and Vercel deployment.
- Added GitHub Actions quality checks and tag-based release automation.
- Added Dependabot configuration for dependency update pull requests.
- Added GitHub release-task issue template.
- Added `npm run verify` for local release checks.
- Documented the manual verification and deployment workflow while GitHub Actions billing is blocked.

## v0.1.0

- Built Apex rank dashboard.
- Added live player rank and map rotation API routes.
- Added Rank Pulse mobile widget preview.
- Added dark glass theme.
- Added friend roster tracking.
- Added batch player rank API optimization.
