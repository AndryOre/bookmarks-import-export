state: done

done:

- Added strict flags to tsconfig.json: strict, noUncheckedIndexedAccess,
  noImplicitOverride, noUnusedLocals, noUnusedParameters,
  noFallthroughCasesInSwitch, verbatimModuleSyntax, erasableSyntaxOnly.
- Renamed package.json script compile -> typecheck (tsc --noEmit).
- Updated forge.config.json commands.selfCheck to ["bun run typecheck"].
- Updated docs/agents/forge.md Self-check section to bun run typecheck.
- Fixed all 27 resulting type errors across 8 files with guards/narrowing, no !
  or any introduced.
- bun run typecheck: 0 errors. bun run format:check: passes.

next:

- Nothing left for this ticket. Ready for review/merge.

dead-ends: (none)

invariants:

- No `!` non-null assertions or `any` introduced to silence errors.
- One pre-existing `as any` cast in lib/importers/import-csv.ts
  (i18n.t('importFromCSVImportError' as any)) was left untouched — not a type
  error under the new flags, out of scope for this ticket.
- tsconfig.json keeps extends: "./.wxt/tsconfig.json", jsx: "react-jsx", and
  allowImportingTsExtensions: true unchanged.

files:

- tsconfig.json
- package.json
- forge.config.json
- docs/agents/forge.md
- components/advanced-export/bookmark-tree.tsx
- components/advanced-export/settings-dialog.tsx
- components/theme-provider.tsx
- lib/auto-export.ts
- lib/exporters/export-csv.ts
- lib/exporters/export-html.ts
- lib/importers/import-csv.ts
- lib/importers/import-html.ts
- lib/importers/import-json.ts

commands:

- bun run typecheck
- bun run format:check
