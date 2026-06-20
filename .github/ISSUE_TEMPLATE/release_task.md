---
name: Release task
about: Prepare and publish a stable app version
title: "Release: v"
labels: release
assignees: ""
---

## Version

Target version:

## Release goal

What should this version deliver to users?

## Checklist

- [ ] All planned pull requests are merged into `main`.
- [ ] `npm run verify` passes locally.
- [ ] `CHANGELOG.md` has a section for this version.
- [ ] `package.json` and `package-lock.json` versions are updated.
- [ ] Release commit is pushed to `main`.
- [ ] Version tag is pushed.
- [ ] GitHub `Release` workflow passes.
- [ ] Vercel production deployment is healthy.

## Notes

Known risks, rollback notes, or follow-up work.
