# How to cut a release

1. Bump the `version` field in `package.json` to the new version number.

2. Add a new entry to the top of the array `getChangelog()` returns in
   `lib/changelog.ts`: a `version`, a `dateKey`, and one or more `items` (each
   an object with a `textKey` and, optionally, a `linkKey` + `linkUrl` for
   entries that link to a specific page, e.g. the advanced export/import pages
   via `browser.runtime.getURL`). Add the same entry (version, date, and items)
   to the top of the root `CHANGELOG.md` at the same time.

3. Add the i18n keys that entry references (its `dateKey`, every item's
   `textKey`, and any `linkKey`) to **both** `locales/en.json` and
   `locales/es.json`. `lib/locale-parity.test.ts` requires every locale to carry
   the same top-level key set as `en.json`, so a new changelog entry with keys
   missing from either file fails that test.

4. Run `bun run check` and `bun run test` to confirm the version bump, changelog
   entry, and locale keys are all consistent.

5. Run `bun run zip` (the `zip` script, which runs `wxt zip`) to produce the
   distributable extension archive for the new version.

6. After the release PR merges, tag the merge commit with a **signed** tag and
   push it: `git tag -s vX.Y.Z <merge-commit-sha> && git push origin vX.Y.Z`.
   Release tags must be signed (`-s`, GPG or SSH per your `git config`) — an
   unsigned `git tag vX.Y.Z` is not acceptable. Verify a tag's signature at any
   time with `git tag -v vX.Y.Z`. A `v*` tag ruleset already protects these tags
   — see [ADR 0001](../adr/0001-public-repo-security-posture.md). Pushing the
   tag triggers the `release.yml` workflow, which builds the extension zip,
   extracts that version's `CHANGELOG.md` section as release notes, attests
   build provenance, and publishes the GitHub Release — no manual
   `gh release create` needed.
