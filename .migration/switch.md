# switch

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap, no consumer changes — `checked`/`onCheckedChange` are 1:1
between Radix and Base UI for Switch (per `form-controls.md`: "direct (1:1)"),
only the import source and `eventDetails` second callback argument changed
(existing 1-arg consumer handlers stay type-safe: see `consumer-props.md`'s
"Callback signature rule").

## Changed

- `components/ui/switch.tsx`: `SwitchPrimitive` now imported from
  `@base-ui/react/switch` instead of `radix-ui`. Added a class variant that
  suppresses the switch's own focus ring when it's wrapped in a `<label>` with
  `group/field-label` and the label itself has focus-visible
  (`group-has-[:focus-visible]/field-label:*`) — a real (small) visual behavior
  change from the old radix-nova styling, not something this migration
  introduced on purpose. Leftover scan clean.

## Left alone

- N/A.

## Behavior changes

- The new focus-ring-suppression-inside-a-label-group class is new styling
  behavior (not present in the prior radix-nova version), inherited from
  upstream base-nova's own registry source rather than something this migration
  chose to add. Flagging per the skill's "behavior deltas are flagged, never
  silently patched" rule, though it only matters if a `Switch` is ever wrapped
  directly in a `group/field-label` labeled container — not currently the case
  anywhere in this codebase (checked:
  `grep -rn "group/field-label" --include=*.tsx .` found no matches).

## Verify by hand

- `typecheck` and `build` clean.
- Visual/functional check: toggle every switch in the export settings dialog
  (bookmark icons, auto-expand folders, per-field toggles, the auto-export
  enable switch) and confirm checked/unchecked styling and `onCheckedChange`
  callbacks still fire correctly.
