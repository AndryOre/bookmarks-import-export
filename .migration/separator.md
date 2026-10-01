# separator

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap, no consumer changes (no consumer passed `decorative`, the
one dropped prop).

## Changed

- `components/ui/separator.tsx`: `SeparatorPrimitive` now imported from
  `@base-ui/react/separator` instead of `radix-ui`; the `decorative` prop is
  gone (per `universal-patterns.md`'s part-rename table: "separator `decorative`
  prop | dropped"). Data-attribute selectors
  (`data-horizontal:*`/`data-vertical:*`) already matched Base UI's
  presence-attribute convention, so no class changes were needed. Leftover scan
  clean.

## Left alone

- N/A.

## Behavior changes

None for this codebase — `grep -rn "decorative" --include=*.tsx .` (outside
`components/ui/**`) found no consumer passing it.

## Verify by hand

- `typecheck` and `build` clean.
- Visual check: separators in the settings dialog still render as a 1px line in
  both orientations.
