# Publishing Guide

This guide explains how to publish Dropzone Apex Tracker so other people can use it, and how
updates reach users after the first launch.

## Recommended Hosting

Use GitHub for the source code and Vercel for the live Next.js app.

Why this setup works well:

- GitHub gives you issues, pull requests, branches, reviews, and releases.
- GitHub Actions checks every pull request before it is merged.
- Vercel creates preview links for branches and production deployments from `main`.
- The private `APEX_API_KEY` stays on the server as an environment variable.

References:

- Vercel Git deployments: https://vercel.com/docs/git
- Vercel environment variables: https://vercel.com/docs/environment-variables
- GitHub Node.js Actions: https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs
- GitHub releases: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

## One-Time GitHub Setup

Create a new empty GitHub repository named something like:

```text
dropzone-apex-tracker
```

Then push this local project:

```powershell
git add .
git commit -m "Initial Dropzone Apex Tracker release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dropzone-apex-tracker.git
git push -u origin main
```

Do not commit `.env.local`. The `.gitignore` file is already set to keep local secrets out of
Git.

## One-Time Vercel Setup

1. Sign in to Vercel.
2. Choose `Add New` then `Project`.
3. Import the GitHub repository.
4. Keep the framework preset as `Next.js`.
5. Add this environment variable in the Vercel project settings:

```env
APEX_API_KEY=your_real_api_key
```

Add the variable to Production and Preview environments so pull request previews can use live
data too. If you want previews to avoid using API quota, add it only to Production.

After Vercel deploys, it will give you a live URL. Later, you can add a custom domain from the
Vercel project settings.

## How Updates Reach Users

Use this flow for normal feature work:

1. Create or pick a GitHub issue.
2. Create a branch from `main`.
3. Make the change.
4. Open a pull request.
5. Wait for `Quality Checks` to pass.
6. Test the Vercel preview link.
7. Merge into `main`.
8. Vercel deploys the new production version.

## Publishing A Stable Version

Use a GitHub Release when a version is stable enough to announce.

1. Update `CHANGELOG.md`.
2. Run `npm version 1.0.0 --no-git-tag-version` to update `package.json` and
   `package-lock.json`.
3. Commit the release changes.
4. Create and push a tag:

```powershell
npm version 1.0.0 --no-git-tag-version
git add CHANGELOG.md package.json package-lock.json
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

The `Release` GitHub Action will run `npm run lint`, run `npm run build`, and create a GitHub
Release if the tag passes.

## Rollback Plan

If a bad update reaches users:

1. In Vercel, open the project deployments.
2. Pick the last good deployment.
3. Promote or redeploy it.
4. Create a GitHub issue explaining the bug.
5. Fix the bug in a branch and merge it through a pull request.

## Secret Safety Rules

- Keep API keys in `.env.local` locally and in Vercel environment variables online.
- Never paste API keys into GitHub issues, pull requests, screenshots, or comments.
- If a key leaks, revoke it and create a new key immediately.
- Do not expose the Apex API key with a `NEXT_PUBLIC_` prefix.
