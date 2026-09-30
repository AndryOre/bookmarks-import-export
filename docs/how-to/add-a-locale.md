# How to add a new locale

1. Add a new JSON file under `locales/`, named after the locale code (see the
   existing `locales/en.json` and `locales/es.json` for the naming convention
   and file shape — one top-level key per message, each an object with a
   `message` field and an optional `description` field).

2. Give the new file the same set of top-level message keys as
   `locales/en.json`. `lib/locale-parity.test.ts` asserts that every locale's
   key set matches `en.json`'s exactly (the `description` field is exempt from
   that check — locales are allowed to diverge there, since it's a translator
   note, not shipped copy). Run `bun run test` to confirm parity before opening
   a PR; a missing or extra key fails that test.

3. Wire the locale into `@wxt-dev/i18n` by adding the file under `locales/` —
   the module auto-discovers locale files there, the same way `en.json` (the
   manifest's `default_locale`) and `es.json` already are. No manual
   registration elsewhere is required.

4. Run `bun run check` and `bun run test` to confirm the new locale doesn't
   break type generation or parity.
