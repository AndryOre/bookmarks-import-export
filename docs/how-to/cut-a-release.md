# How to cut a release

1. Bump the `version` field in `package.json` to the new version number.

2. Add a new entry to the top of the array `getChangelog()` returns in
   `lib/changelog.ts`: a `version`, an `isoDate` (`YYYY-MM-DD`), and one or more
   `items` (each an object with a `textKey` and, optionally, a `linkKey` +
   `linkUrl` for entries that link to a specific page, e.g. an App route built
   with `getAppUrl` (`lib/app-url.ts`) or via `browser.runtime.getURL`). Add the
   same entry (version, date, and items) to the top of the root `CHANGELOG.md`
   at the same time.

3. Add the i18n keys that entry references (every item's `textKey` and any
   `linkKey`; the date needs no key) to **every** file in `locales/` (all 10:
   `de`, `en`, `es`, `fr`, `it`, `ja`, `ko`, `pt_BR`, `ru`, `zh_CN`).
   `lib/locale-parity.test.ts` requires every locale to carry the same top-level
   key set as `en.json`, so a new changelog entry with keys missing from either
   file fails that test.

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

7. Once the GitHub Release job finishes, a second job,
   `publish-chrome-web-store`, submits the same zip to the Chrome Web Store via
   `wxt submit` (the `publish-browser-extension` package), using Chrome Web
   Store API v2 and a service account. This job runs in the `chrome-web-store`
   GitHub Environment, which must hold these secrets:

   - `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` — the service account's
     `client_email`.
   - `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` — the service account's `private_key`.
   - `CHROME_PUBLISHER_ID` — the Chrome Web Store publisher ID that owns the
     extension.
   - `CHROME_EXTENSION_ID` — the extension's ID in the Chrome Web Store.

   `CHROME_API_VERSION` is set to `v2` directly in the workflow, not as a secret
   — `publish-browser-extension` falls back to the sunsetting v1.1 API if it's
   left unset. A guard step runs before `wxt submit` and fails the job with an
   explicit message naming any missing secret, instead of letting the CLI fail
   further in with a less legible error. See
   [ADR 0005](../adr/0005-store-publishing-via-cws-api-v2.md) for the rationale.

   Listing text, screenshots, promo graphics, and privacy-practice fields are
   out of scope for this step — those stay dashboard-managed in the Chrome Web
   Store Developer Dashboard. Work through the
   [pre-publish checklist](../store/README.md#pre-publish-checklist) before
   pushing the tag.
