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

   **Plural messages.** Count-bearing messages (`import_submit`,
   `importPreviewCount`, `exportPage_exportButton`, `exportPage_successTitle`,
   `popup_exportSuccessTitle`, `exportPage_selectionCount`,
   `import_replaceDiffTitle`) are plural objects, not `{ message }` entries:

   ```json
   "import_submit": { "1": "Import $1 bookmark", "n": "Import $1 bookmarks" }
   ```

   `n` is the required fallback; `0` and `1` are optional. `@wxt-dev/i18n` only
   knows the `1`/`n` (or `0`/`1`/`n`) split, so a language with more categories
   (Russian, Polish) should word the message so one form reads correctly for
   every count, as `ru.json` does with "Закладок: $1". French and Brazilian
   Portuguese use `0`, `1` and `n` because zero is singular there. Languages
   without plurals (ja, ko, zh_CN) provide only `n`. Use `$1`, `$2` tokens (no
   named placeholders); call sites pass the count plus
   `Intl.NumberFormat`-formatted substitutions through `formatCount`. Keep a key
   plural in every locale if it is plural in `en.json`. The parity test checks
   that each plural entry uses only the `0`, `1` and `n` forms, has an `n` form
   and no empty form, and uses the same `$N` tokens as `en.json`.

3. Wire the locale into `@wxt-dev/i18n` by adding the file under `locales/` —
   the module auto-discovers locale files there, the same way `en.json` (the
   manifest's `default_locale`) and `es.json` already are. No manual
   registration elsewhere is required.

4. Run `bun run check` and `bun run test` to confirm the new locale doesn't
   break type generation or parity.
