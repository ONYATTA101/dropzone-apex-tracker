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
