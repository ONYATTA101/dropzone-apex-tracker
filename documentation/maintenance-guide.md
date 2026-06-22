# Maintenance Guide

## Update Ranked RP Thresholds

Edit `src/domain/apex-ranked/rank-calculations/rank-progress-calculator.ts`.

Update the `RANK_STEPS` values in ascending order, then run:

```powershell
npm run verify
```

## Handle External API Field Changes

- Player response changes belong in
  `src/integrations/apex-legends-status/player-rank-response-normalizer.ts`.
- Map response changes belong in
  `src/integrations/apex-legends-status/ranked-map-response-normalizer.ts`.

Keeping external response handling there prevents provider changes from spreading into the UI.

## Add A Dashboard Component

1. Create a purpose-named file in `src/features/tracker-dashboard/components`.
2. Add a file-header comment describing its responsibility.
3. Keep API calls in `data-access`, display-only helpers in `utilities`, and defaults in `config`.
4. Import and render the component from `apex-tracker-dashboard.tsx`.

## Add More Notification Messages

Edit:

```text
src/features/mobile-rank-widget/config/rank-notification-messages.ts
```

Add a new message to the correct event group. Keep messages short so they fit phone
notifications.

## Future Todo: Account History

Build an Account page history dropdown after the core tracker is stable.

Version 1 should use the existing server RP history snapshots. It should show day-to-day net RP
history, so a player can review whether each day ended positive, negative, or flat. This is
reliable because the app already stores each day's baseline RP, current RP, daily net RP, last
delta, and high/low RP in Upstash.

Version 2 can add exact per-game ranked records only if match-history access becomes available.
The Apex API match-history endpoint requires special access, so do not promise exact game-by-game
records until that provider limitation is solved.

Planned controls:

- Current season only
- Today
- This week
- This month
- Day-by-day net RP gain or loss
- RP gained or lost per tracked snapshot
- Later: exact ranked match list with RP gain/loss per game

## Add A New Server Endpoint

1. Create a descriptive folder under `src/app/api`.
2. Add the framework-required `route.ts` file.
3. Put the external response conversion in `src/integrations`.
4. Add shared result types to `src/domain/apex-ranked/types`.
5. Document the endpoint in `api-and-data-behavior.md`.

## Naming Rules

- Folders describe the responsibility they group.
- Files describe the exact behavior or data they own.
- React component filenames use descriptive kebab case.
- Framework-required filenames keep their required name and use a descriptive parent folder.
- Generated and JSON files are documented instead of receiving invalid or unstable comments.
