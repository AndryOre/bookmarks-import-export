# select

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap; one consumer (`settings-dialog.tsx`) needed its
`onValueChange` handler adjusted for the widened, now-nullable value type. This
is the last of the 11 `components/ui/**` files — `radix-ui` can now be dropped
from `package.json`.

## Changed

- `components/ui/select.tsx`: `SelectPrimitive` now from
  `@base-ui/react/select`. Part renames: `Content` → `Popup` (wrapped in a new
  explicit `Positioner`, same pattern as Dialog/Tooltip), `Label` →
  `GroupLabel`, `Viewport` dropped (`List` now wraps children directly),
  `ScrollUpButton`/`ScrollDownButton` → `ScrollUpArrow`/ `ScrollDownArrow`.
  `position="popper"|"item-aligned"` replaced by a single boolean
  `alignItemWithTrigger` (default `true`, matching this repo's old default of
  `position="item-aligned"` — nothing here ever used `"popper"`, confirmed via
  `grep -rn 'position="popper"'`). `Select` is now generic over its value type;
  this wrapper pins it to `SelectPrimitive.Root.Props<string>` since every value
  in this codebase is a string literal union (`BookmarkFormat`, `ImportMode`,
  `'AM' | 'PM'`). Fixed a copy-paste typo introduced while adapting the registry
  source (`</SelectPrimitive.ScrollDownButton>` closing tag left over from the
  old Radix part name — caught immediately by `tsc`). Leftover scan clean.
- `components/advanced-export/settings-dialog.tsx` (line ~590): the AM/PM period
  `<Select onValueChange={updatePeriod}>` passed its local
  `updatePeriod: (value: string) => void` handler directly. Base UI's
  `onValueChange` signature widens to
  `(value: string | null, eventDetails) => void`, which a 1-arg
  `(value: string) => void` handler isn't assignable to (unlike the other two
  consumers, which already wrap in an inline arrow + `as` cast). Fixed with a
  small inline guard:
  `onValueChange={(value) => { if (value) updatePeriod(value) }}` — this select
  is never clearable (always AM or PM), so `null` can't actually occur in
  practice, but the guard keeps the type honest without widening
  `updatePeriod`'s own signature.

## Left alone

- `components/export-format-selector.tsx` and
  `components/import-bookmarks-button.tsx`: both already used an inline
  `onValueChange={(v) => setX(v as T)}` pattern, which stays source-compatible
  with the new nullable signature (the cast silently absorbs `null` same as
  before — matches this repo's already-accepted plan decision that these two
  needed no defensive guard since neither is a clearable select).

## Behavior changes

None expected — `alignItemWithTrigger` is a direct behavioral equivalent of the
old `position="item-aligned"` default used everywhere in this repo.

## Verify by hand

- `typecheck` and `build` clean.
- Functional check: open each of the three selects (export format, import mode,
  backup period AM/PM) — confirm opening, selecting an option, and the trigger's
  displayed value all still work, and that the popup aligns with the trigger the
  same way as before.
