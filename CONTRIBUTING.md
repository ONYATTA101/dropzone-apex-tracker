# Contributing To Dropzone Apex Tracker

Thanks for helping improve Dropzone. This project uses a simple Git workflow so changes can
be reviewed safely before they become part of the app.

## Before You Start

1. Read the project docs in `documentation/`.
2. Install dependencies:

```powershell
npm install
```

3. Create `.env.local` from `.env.example` if you need live API data.

Never commit `.env.local` or API keys.

## Branch Workflow

Create a new branch for each change:

```powershell
git checkout -b feature/rank-pulse-notifications
```

Use branch prefixes:

- `feature/` for new features.
- `fix/` for bug fixes.
- `docs/` for documentation changes.
- `refactor/` for internal code cleanup.

## Required Checks

Run these before opening a pull request:

```powershell
npm run verify
```

The GitHub `Quality Checks` workflow runs the same verification on every pull request.

## Pull Request Rules

Each pull request should:

- Explain what changed.
- Link the issue it fixes, if there is one.
- Include screenshots for UI changes.
- Include the Vercel preview link when the app is already published.
- Mention any known limitations.
- Avoid unrelated cleanup.

## Review And Merge Rules

- Keep `main` stable.
- Use one pull request per feature or bug fix.
- Wait for GitHub Actions to pass before merging.
- Review API-key or deployment changes carefully.
- Squash or rebase noisy commits if the branch history is hard to follow.

## Code Style

- Keep files purpose-named.
- Keep comments useful and short.
- Put API integration changes in `src/integrations`.
- Put game-rule changes in `src/domain`.
- Put dashboard UI changes in `src/features`.
- Keep API keys on the server only.

## Adding Notification Messages

Edit:

```text
src/features/mobile-rank-widget/config/rank-notification-messages.ts
```

Keep messages short enough for phone notifications.

## Reporting Bugs

Use the bug report template and include:

- What you expected.
- What happened instead.
- Steps to reproduce.
- Screenshots if the issue is visual.
- Browser and device.
