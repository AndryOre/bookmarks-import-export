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

None observed for Button itself.

**Update (resolved during the Dialog/Tooltip migration):** the ref-forwarding
question flagged above is a non-issue on React 19 (confirmed via Base UI's own
`useRender` docs, context7 `/mui/base-ui`). Since React 19, function components
receive `ref` as a normal prop — no `React.forwardRef()` needed — so `Button`'s
`...properties` rest already contains any `ref` passed by a caller, and
spreading it onto `<ButtonPrimitive {...properties}>` forwards it through
`ButtonPrimitive`'s own internal `useRender` DOM attachment.
`TooltipTrigger render={<Button variant="outline" />}` composition works as-is;
no code change was needed.

## Verify by hand

- `typecheck` and `build` both ran clean (`tsc --noEmit`, `bun run build`).
- Visual check: open the popup/advanced pages, confirm buttons still render with
  correct hover/variant styling (the `secondary` variant's hover now uses
  `color-mix()` instead of `/80` opacity — slightly different tone).
