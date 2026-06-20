# Dropzone Apex Tracker

Dropzone is a responsive Apex Legends companion dashboard for tracking:

- Your current Battle Royale rank and RP
- RP earned and remaining to the next division
- Friends' current ranks and progress
- The current and next ranked map with a live countdown

## Quick Start

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Live App

Production URL: [https://dropzone-apex-tracker.vercel.app](https://dropzone-apex-tracker.vercel.app)

Phone widget test URL:
[https://dropzone-apex-tracker.vercel.app/widget](https://dropzone-apex-tracker.vercel.app/widget)

Without an API key, the application uses predictable demo data. For live data, create a
free key at [apexlegendsapi.com](https://apexlegendsapi.com/) and set it in `.env.local`:

```env
APEX_API_KEY=your_real_api_key
```

## Documentation

All detailed project documentation lives in the purpose-named [`documentation`](documentation)
folder:

- [Project overview](documentation/project-overview.md)
- [Architecture and data flow](documentation/architecture-and-data-flow.md)
- [Folder and file guide](documentation/folder-and-file-guide.md)
- [Setup, running, and verification](documentation/setup-running-and-verification.md)
- [API and data behavior](documentation/api-and-data-behavior.md)
- [Mobile widget and notifications](documentation/mobile-widget-and-notifications.md)
- [Customization guide](documentation/customization-guide.md)
- [Optimization techniques](documentation/optimization-techniques.md)
- [Publishing guide](documentation/publishing-guide.md)
- [Release and collaboration workflow](documentation/release-and-collaboration-workflow.md)
- [Maintenance guide](documentation/maintenance-guide.md)

## Publishing

The recommended public setup is GitHub plus Vercel:

- GitHub stores the code, issues, pull requests, and releases.
- Vercel deploys previews for branches and production from `main`.

GitHub Actions are currently disabled because this GitHub account has billing removed. Until
Actions are re-enabled, run `npm run verify` locally before pushing updates.

Follow [Publishing guide](documentation/publishing-guide.md) before sharing the app with users.

## Contributing

Use [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, pull request, and testing workflow.
Track user-facing changes in [CHANGELOG.md](CHANGELOG.md).

## Important Notes

- PC searches require the player's EA/Origin account name, even if they play through Steam.
- Friends and the main profile are stored locally in the browser.
- Match history is not included because the external API requires special whitelisting.
- This project is not affiliated with or endorsed by EA or Respawn.
