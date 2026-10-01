# input

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap, no consumer changes.

## Changed

- `components/ui/input.tsx`: now renders Base UI's `Input` primitive
  (`@base-ui/react/input`) instead of a plain native `<input>`. This is a
  genuinely new Base UI primitive with no Radix equivalent (Radix never shipped
  an Input component) — this repo's old `input.tsx` was always a bare `<input>`,
  so there was nothing to migrate away from, only something new to adopt.
  Classes unchanged. Leftover scan clean.

## Left alone

- N/A — no radix import existed in this file.

## Behavior changes

None expected — `InputPrimitive` renders a standard `<input>` under the hood
with the same DOM attributes forwarded.

## Verify by hand

- `typecheck` and `build` clean.
- Visual/functional check: type into the format-template input
  (`components/advanced-export/search-bar.tsx` and the settings dialog's
  filename-template field) and confirm focus ring + typing behave the same.
