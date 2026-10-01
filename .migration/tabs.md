# tabs

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap, one consumer file (`entrypoints/popup/App.tsx`, 2
`TabsContent` call sites) needed its mount/visibility pattern updated.

## Changed

- `components/ui/tabs.tsx`: `TabsPrimitive` now from `@base-ui/react/tabs`. Part
  rename: `Trigger` → `Tab` (`TabsPrimitive.Tab` instead of
  `TabsPrimitive.Trigger`), `Content` → `Panel`. Added
  `aria-disabled:pointer-events-none aria-disabled:opacity-50` to
  `TabsTrigger`'s classes (present in the upstream base-nova source, not in the
  old radix-nova one — a style addition, not a behavior removal). Leftover scan
  clean.
- `entrypoints/popup/App.tsx` (both `TabsContent` call sites): `forceMount` →
  `keepMounted` (Base UI's prop for keeping inactive panels mounted), and the
  class selector `data-[state=inactive]:hidden` → `data-hidden:hidden` (Base
  UI's `Tabs.Panel` exposes a boolean `data-hidden` presence attribute instead
  of Radix's `data-state="inactive"` string attribute).

## Left alone

- `activationMode="manual"` was never set anywhere in this codebase (confirmed
  via `grep -rn "activationMode"` — no matches), so there was nothing to remove;
  Base UI's `Tabs.Root` defaults to manual activation already, matching the
  behavior this repo always relied on implicitly.
- `onValueChange={(v) => setActiveTab(v as 'export' | 'import')}` — unchanged;
  Base UI's `Tabs.Root` keeps the same prop name and a string-compatible value
  type for this repo's two static tab values.

## Behavior changes

None expected — `keepMounted` + `data-hidden:hidden` is a direct equivalent of
the old `forceMount` + `data-[state=inactive]:hidden` pattern (both tab panels
stay mounted so `ExportFormatSelector`'s and `ImportBookmarksButton`'s internal
state isn't lost when switching tabs).

## Verify by hand

- `typecheck` and `build` clean.
- Functional check: switch between the Export and Import tabs in the popup
  multiple times, confirm each panel's internal state (e.g. a selected export
  format) survives the tab switch, proving both panels are still kept mounted
  rather than unmounted/remounted.
