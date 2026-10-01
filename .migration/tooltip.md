# tooltip

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap; one consumer file (`settings-dialog.tsx`, 2 call sites)
needed its `TooltipTrigger asChild` pattern updated to `render`.

## Changed

- `components/ui/tooltip.tsx`: `TooltipPrimitive` now from
  `@base-ui/react/tooltip`. `TooltipProvider`'s `delayDuration` prop renamed to
  `delay`. `TooltipContent` gains an explicit `Positioner` wrapper (Base UI
  separates positioning from the popup element) and now accepts
  `side`/`sideOffset`/`align`/`alignOffset` directly instead of inheriting them
  implicitly through `Content`. Leftover scan clean.
- `components/advanced-export/settings-dialog.tsx` (2 call sites, lines ~364 and
  ~752): `<TooltipTrigger asChild><Info .../></TooltipTrigger>` →
  `<TooltipTrigger render={<Info .../>} />` (Base UI has no `asChild`; `Info`
  from `lucide-react` is a plain SVG component that doesn't forward `ref`/spread
  props on its own, but `render` only needs the rendered element to exist — it's
  not relying on imperative ref access here, so no further changes were needed).

## Left alone

- No other file imports `Tooltip*` (confirmed via
  `grep -rln "from '@/components/ui/tooltip'" --include=*.tsx .`).

## Behavior changes

- `TooltipProvider`'s default `delay` is `0` in this wrapper (unchanged from the
  prior `delayDuration = 0` default) — matches existing behavior.

## Verify by hand

- `typecheck` and `build` clean.
- Visual/functional check: hover the info icons next to "Export filename
  template" and other settings-dialog fields — confirm the tooltip still appears
  instantly (0ms delay) with the arrow correctly positioned.
