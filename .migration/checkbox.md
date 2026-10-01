# checkbox

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode)

- a hand-written tri-state adapter (not part of the upstream registry source,
  which has no tri-state concept). Verdict: clean swap, zero changes needed in
  the one consumer (`bookmark-tree.tsx`).

## Changed

- `components/ui/checkbox.tsx`: `CheckboxPrimitive` now from
  `@base-ui/react/checkbox`. Base UI splits Radix's single
  `checked: boolean | 'indeterminate'` prop into two separate props —
  `checked: boolean` and `indeterminate: boolean`. Added a small adapter so this
  wrapper's own public API stays `checked?: CheckedState` (this repo's existing
  `boolean | 'indeterminate'` union from `lib/types.ts`):
  `checked={checked === true}` / `indeterminate={checked === 'indeterminate'}`
  forwarded to `CheckboxPrimitive.Root`. This keeps the tri-state concept
  entirely inside `components/ui/checkbox.tsx` so the one consumer
  (`components/advanced-export/bookmark-tree.tsx`) needed zero changes. Leftover
  scan clean.

## Left alone

- `components/advanced-export/bookmark-tree.tsx`: still passes
  `checked={checked}` (a `CheckedState`) and
  `onCheckedChange={(value) => onCheckedChange(node, value as CheckedState)}`
  unchanged — Base UI's `onCheckedChange(checked: boolean, eventDetails)` is
  source-compatible with the existing 1-arg handler, and `value` here is always
  `boolean` (Base UI never reports `'indeterminate'` through `onCheckedChange`,
  same as Radix), so the `as CheckedState` cast still compiles and behaves
  identically.
- No dedicated unit test added for the adapter: it's two one-line equality
  checks (`checked === true`, `checked === 'indeterminate'`), and this repo has
  no component-level test infrastructure (`vitest.config.ts` scopes coverage to
  `lib/**`, no React Testing Library setup exists anywhere). Scaffolding that
  infra for two trivial expressions isn't proportionate; the existing e2e
  checkbox-role tests already exercise this path end-to-end.

## Behavior changes

None — same visible indicator icon for both `checked` and `indeterminate` states
as before (the prior Radix-based wrapper never had a distinct indeterminate icon
either; confirmed via
`grep -rn "indeterminate\|MinusIcon\|data-state" --include=*.tsx components/`).

## Verify by hand

- `typecheck` and `build` clean.
- Functional check: in the Advanced Export bookmark tree, toggle a folder with a
  mix of checked/unchecked bookmarks and confirm its checkbox shows the
  indeterminate visual state, and that toggling it checks/unchecks all
  descendants correctly.
