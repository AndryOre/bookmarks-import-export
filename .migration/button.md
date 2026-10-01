# button

2026-10-01, strategy: golden pair via CLI (fetched `base-nova/button.json` by
URL — progressive mode, no `shadcn add --overwrite`, since this WXT project's
`shadcn` CLI resolves `ui`/`components` paths one directory above the repo
root). Verdict: clean swap, no consumer changes needed.

## Changed

- `components/ui/button.tsx`: `Slot`/`radix-ui` import replaced with the real
  `@base-ui/react/button` primitive (`ButtonPrimitive`); `cn` import stays
  `@/lib/utils` (this project kept its `cn` re-export wrapper rather than
  importing the `cn` package directly everywhere). `buttonVariants` classes
  unchanged except `default` variant drops the old `[a]:` selector prefix and
  `secondary` now uses `hover:bg-[color-mix(in_oklch,...)]` instead of a flat
  opacity hover. Leftover scan
  (`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/button.tsx`) is
  clean.
- `package.json`/`bun.lock`: added `@base-ui/react@1.8.0`. `radix-ui` kept for
  now (other wrappers still use it).

## Left alone

- No other files reference `Button` with `asChild` (checked via
  `grep -rn "<Button asChild" --include=*.tsx .`), so no consumer call-site
  changes were needed for this component.

## Behavior changes

None observed for Button itself. Flagging forward:
`TooltipTrigger render={<Button .../>}` (used in `settings-dialog.tsx`, migrated
later) needs manual verification that focus/ref composition still works, since
Base UI's `render` prop composition requires the rendered element to accept and
forward a `ref` — `Button` here is a function component that spreads
`...properties` onto `<ButtonPrimitive>` without destructuring `ref` explicitly.
The upstream base-nova registry source does the same (no explicit `ref` prop),
so this matches the official pattern as shipped; verify empirically when Tooltip
is migrated rather than preemptively "fixing" something the registry itself
doesn't flag as broken.

## Verify by hand

- `typecheck` and `build` both ran clean (`tsc --noEmit`, `bun run build`).
- Visual check: open the popup/advanced pages, confirm buttons still render with
  correct hover/variant styling (the `secondary` variant's hover now uses
  `color-mix()` instead of `/80` opacity — slightly different tone).
