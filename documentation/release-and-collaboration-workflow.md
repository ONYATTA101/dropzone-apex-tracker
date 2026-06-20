# Release And Collaboration Workflow

Use this workflow when the app is ready for users and you want other people to help with
features, bug fixes, testing, and documentation.

## Workflow Summary

The project uses this path:

```text
issue -> branch -> pull request -> local verify -> Vercel preview -> review -> merge -> production deploy -> release tag
```

`main` is the production branch. Keep it stable.

GitHub Actions are currently disabled because this GitHub account has billing removed. When
billing is fixed, re-enable the `Quality Checks` and `Release` workflows in the GitHub Actions
tab.

## One-Time Setup

First commit the project locally:

```powershell
git add .
git commit -m "Initial Dropzone Apex Tracker release"
```

After creating an empty GitHub repository, connect it:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/dropzone-apex-tracker.git
git branch -M main
git push -u origin main
```

Then connect the GitHub repository to Vercel by following `publishing-guide.md`.

## Issues

Use GitHub issues for:

- Bugs.
- Feature requests.
- UI improvements.
- API problems.
- Documentation improvements.
- Release tasks.

Good issue examples:

- `Bug: friend rank card disappears after refresh`
- `Feature: add push notifications for RP loss`
- `UI: make Rank Pulse widget smaller on iPhone`

## Branches

Create a branch for each change:

```powershell
git checkout -b feature/notifications
git checkout -b fix/friend-roster-duplicates
git checkout -b docs/setup-guide
```

Branch prefixes:

- `feature/` for new features.
- `fix/` for bugs.
- `docs/` for documentation.
- `refactor/` for internal cleanup.
- `release/` for version preparation.

## Pull Requests

A pull request is how someone proposes a change.

Before opening a pull request:

```powershell
npm run verify
```

Before merging a pull request:

- The contributor must run `npm run verify` and paste the result.
- UI changes should include screenshots.
- Published apps should include the Vercel preview link.
- API-key or deployment changes should get extra review.
- Unrelated cleanup should be moved to a separate pull request.

## Automated Checks

The `.github/workflows/quality-checks.yml` workflow is ready for future use, but it is disabled
while GitHub Actions billing is blocked.

When enabled, it checks:

- Dependency installation with `npm ci`.
- Code style with `npm run lint`.
- Production compilation with `npm run build`.

Dependabot is configured with `.github/dependabot.yml`, but dependency automation may also be
blocked while the account billing issue remains.

## Vercel Deployment Flow

Vercel should be connected to the GitHub repository:

- Every pull request gets a preview deployment.
- Every merge into `main` creates a production deployment.
- The `APEX_API_KEY` value belongs in Vercel environment variables.

Use the preview link to test UI and live API behavior before merging.

## Version Numbers

Use semantic versioning:

- `v1.0.0`: first stable public release.
- `v1.1.0`: new feature release.
- `v1.1.1`: bug fix release.
- `v2.0.0`: major redesign or breaking change.

## Release Checklist

1. Confirm all planned pull requests are merged into `main`.
2. Run `npm run verify` locally.
3. Update `CHANGELOG.md` with a new version section.
4. Update the `version` value in `package.json`.
5. Commit the release changes.
6. Create a version tag.
7. Push `main` and the tag.
8. Create the GitHub Release manually.
9. Confirm Vercel production deployment is healthy.

Example:

```powershell
git checkout main
git pull
npm run verify
# Edit CHANGELOG.md, then update package.json and package-lock.json together.
npm version 1.0.0 --no-git-tag-version
git add CHANGELOG.md package.json package-lock.json
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

When GitHub Actions are enabled, pushing the tag starts `.github/workflows/release.yml`, which
verifies the app and creates a GitHub Release.

## Suggested Labels

Create these issue labels on GitHub:

- `bug`
- `feature`
- `documentation`
- `ui`
- `performance`
- `api`
- `dependencies`
- `release`
- `good first issue`
- `help wanted`

Use `good first issue` for simple tasks new contributors can handle.

## Keep Secrets Safe

Never commit:

- `.env.local`
- API keys
- passwords
- private tokens

The `.gitignore` file already protects `.env.local`, but always double-check before pushing.
