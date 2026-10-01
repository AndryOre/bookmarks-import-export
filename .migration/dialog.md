# dialog

2026-10-01, strategy: golden pair via CLI (fetched by URL, progressive mode).
Verdict: clean swap, one consumer call-site pattern updated (none of the 3
consumers used a pattern that changed, though).

## Changed

- `components/ui/dialog.tsx`: `DialogPrimitive` now from
  `@base-ui/react/dialog`. Part renames: `Overlay` → `Backdrop`, `Content` →
  `Popup`. The internal close button (`DialogContent`'s built-in
  `showCloseButton`) switched from
  `DialogPrimitive.Close asChild><Button>...</Button></DialogPrimitive.Close>`
  to `DialogPrimitive.Close render={<Button ... />}>...</DialogPrimitive.Close>`
  — same for `DialogFooter`'s optional close button. Both rely on `Button`
  forwarding `ref` (see the Button ref-forwarding note below). Kept `XIcon` from
  `lucide-react` (this repo's existing icon convention) instead of the
  registry's `IconPlaceholder` abstraction, which doesn't exist here. Leftover
  scan clean.

## Left alone

- The 3 Dialog consumers (`entrypoints/advanced-import/App.tsx`,
  `components/advanced-export/settings-dialog.tsx`,
  `components/import-bookmarks-button.tsx`) only use
  `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`/
  `DialogDescription`/`DialogFooter` with `open`/`onOpenChange` — prop names
  unchanged between Radix and Base UI, so none needed edits (confirmed via
  `grep -rn "asChild\|DialogContent\|DialogTrigger\|DialogClose"` across the
  repo, excluding `components/ui/`).

## Behavior changes

- `onOpenChange`'s callback signature gains a second `eventDetails` argument in
  Base UI (none of the 3 consumers destructure beyond the first `open: boolean`
  argument, so this is source-compatible and was confirmed by a clean
  `tsc --noEmit`).
- Per-interaction Radix dismiss props (`onEscapeKeyDown`,
  `onPointerDownOutside`, etc.) don't exist in this file or any consumer —
  nothing to migrate there.

## Verify by hand

- `typecheck` and `build` clean — this is also the empirical confirmation that
  `Button`'s lack of an explicit `ref` prop does NOT break
  `render={<Button ... />}` composition under React 19 (see the updated note in
  `.migration/button.md`).
- Visual/functional check: open the Advanced Import dialog, the Advanced Export
  settings dialog, and the Import Bookmarks dialog — confirm the built-in X
  close button (top-right) and any footer "Close" button both render correctly
  and close the dialog.
