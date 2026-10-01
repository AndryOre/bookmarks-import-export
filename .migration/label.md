# label

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap; Label has no Base UI primitive (per
`universal-patterns.md`'s coverage matrix: "Label -> none: missing, native
`<label>`"), so this now renders a plain `<label>` instead of Radix's
`Label.Root`.

## Changed

- `components/ui/label.tsx`: `LabelPrimitive` (`radix-ui`'s `Label.Root`)
  replaced with a native `<label>` element — Base UI deliberately has no Label
  primitive of its own (plain `<label>` already does everything Radix's wrapped
  it for). Added a targeted
  `eslint-disable-next-line jsx-a11y/label-has-associated-control`: the previous
  Radix-wrapped version wasn't visible to this lint rule as a `<label>` element;
  the raw native element now is, but the actual `htmlFor`/children association
  is supplied by every call site through `...properties`, which static analysis
  can't see through — same limitation the upstream base-nova registry source
  would hit with this repo's lint config. Leftover scan clean.

## Left alone

- N/A.

## Behavior changes

None — a plain `<label>` behaves identically to Radix's `Label.Root` for every
consumer in this codebase (none use `asChild` on Label).

## Verify by hand

- `typecheck`, `build`, and `bun run lint` all clean.
- Visual/functional check: clicking a form label (e.g. the checkbox labels in
  the export settings dialog) should still focus/toggle its associated control.
