# Contributing

Create a feature branch and open a pull request targeting `main`. Install development tools with `npm ci` and `npx playwright install chromium`, then run `npm run check`. Review changed wardrobe pieces at `/pawn-review.html` in all eight directions and at minimum/maximum proportions.

For non-administrators, `main` requires resolved review conversations and one code-owner approval from `@ineedacookie`; new commits dismiss stale approvals. Current and future administrators may bypass branch protection, as authorized by the repository owner. Prefer feature branches and pull requests so changes stay reviewable.

GitHub Actions runs `npm run check`: unit/server tests, real release-tarball JavaScript/TypeScript consumer checks, and headless Chromium pixel regression checks. Browser artifacts are uploaded for inspection. Runtime modules remain dependency-free; TypeScript and Playwright are development-only dependencies.

Before a release, bump the package and lockfile version together and run the full checks. `npm pack --pack-destination /tmp` creates an installable, versioned tarball. Publishing to a registry is a separate action.
