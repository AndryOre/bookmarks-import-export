# card

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap, no consumer changes, no radix-ui dependency to begin with
(Card was always plain `<div>`s).

## Changed

- `components/ui/card.tsx`: spacing classes switched from fixed `px-4`/`py-4` (+
  a `sm`-size override) to a single `--card-spacing` CSS custom property set
  once on the root and consumed by every sub-part — same visual result, less
  duplication. Corrected a typo present in the upstream base-nova registry
  source (`cn-font-heading` → `font-heading`; the stray `cn-` prefix doesn't
  exist as a Tailwind class and would have been rejected by this repo's
  `shadcn/no-unknown-classes` lint rule). Leftover scan
  (`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/card.tsx`) is
  clean.

## Left alone

- N/A — no radix import existed in this file.

## Behavior changes

None.

## Verify by hand

- `typecheck` and `build` clean.
- Visual check: `CardHeader`/`CardContent`/`CardFooter` padding should look
  identical at both `size="default"` and `size="sm"`.
