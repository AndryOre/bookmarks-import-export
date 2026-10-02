# Copy — Snug v2.0.0 rebrand

Generated via `brand-voice:brand-voice-enforcement`, applying
`.claude/brand-voice-guidelines.md`. All claims grounded in the live product
(`docs/usage.md`, `CHANGELOG.md` in the main repo) — see the "Facts corrected
before writing this" note at the bottom; two pains named in `brief.md` turned
out to be stale (already shipped) and are reflected here as differentiators to
surface, not gaps to promise fixing.

## 1. Chrome Web Store listing

### Short summary (≤132 chars, CWS limit)

**EN** (129 chars): "Export, import, and schedule automatic backups for your
bookmarks — HTML, JSON, or CSV, all on your device, no account, no cloud."

**ES** (134 chars): "Programa respaldos automáticos de tus marcadores, exporta e
importa en HTML, JSON o CSV — todo en tu dispositivo, sin cuenta ni nube."

_(2026-10-01: "bookmarks" → "marcadores" para igualar el término que ya usa
`locales/es.json` del repo — ahora 134 caracteres, por encima del límite de 132
de la CWS; recortar antes de subir el listing, p. ej. quitando "todo".)_

_(Revised 2026-10-01 after brand review — "automatically back up" alone implied
an always-on default; the fix restores "scheduled," the term the product's own
README/docs already pair with "automatic" for this exact feature.)_

### Detailed description

**EN:**

> Snug moves your bookmarks between browsers, exactly as you left them — nothing
> sent anywhere, no account required.
>
> Export your whole bookmark tree or just the folder you choose, as HTML, JSON,
> or CSV. Import back with a preview first, then merge into your existing
> bookmarks, replace them outright, or drop everything into a new folder — your
> call every time.
>
> Set up a schedule once and Snug backs up your bookmarks straight to your
> Downloads folder on its own, in the formats and at the interval you pick.
> Filenames can include the date and time automatically, so nothing gets
> overwritten or confused with the last one.
>
> Snug runs entirely on your device — no account, no cloud, no server. Every
> operation reads and writes your browser's own bookmarks tree, and that's the
> whole trust story. Works on Chrome and any other Chromium-based browser (Edge,
> Opera, Brave) from the same listing.

**ES** (adapted for tone, not a literal mirror):

> Snug mueve tus marcadores entre navegadores, tal como los dejaste — no se
> envían a ningún lado, y no necesitas cuenta.
>
> Exporta todo tu árbol de marcadores o solo la carpeta que elijas, en HTML,
> JSON o CSV. Al importar, primero ves una vista previa y luego decides:
> combinarlos con tus marcadores actuales, reemplazarlos por completo, o
> guardarlo todo en una carpeta nueva — tú decides cada vez.
>
> Configura un horario una sola vez y Snug respalda tus marcadores directo a tu
> carpeta de Descargas, en los formatos y con la frecuencia que elijas. Los
> nombres de archivo pueden incluir la fecha y hora automáticamente, así nunca
> se confunden ni se sobrescriben entre sí.
>
> Snug funciona completamente en tu dispositivo — sin cuenta, sin nube, sin
> servidor. Cada operación lee y escribe directamente en los marcadores de tu
> navegador, y esa es toda la historia de confianza. Funciona en Chrome y en
> cualquier navegador basado en Chromium (Edge, Opera, Brave) desde el mismo
> listado.

## 2. v2.0.0 "What's New" rename announcement

**EN:**

> This extension has a new name: **Snug**. Same extension, same local-only
> promise — export, import, and scheduled backups for your bookmarks, with
> nothing ever sent anywhere. Nothing about your data or settings changes; only
> the name and the icon do.

**ES:**

> Esta extensión tiene un nuevo nombre: **Snug**. La misma extensión, la misma
> promesa de siempre: exportar, importar y respaldar tus marcadores según el
> horario que configures, sin enviar nada a ningún lado. Tus datos y tu
> configuración no cambian — solo el nombre y el ícono.

## 3. README intro/tagline (EN only — developer-facing, per repo convention)

> # Snug
>
> Export, import, and back up your bookmarks — entirely on your device.
>
> Snug is a browser extension that moves your bookmarks between browsers,
> exactly as you left them. Export your whole tree or just a folder, as HTML,
> JSON, or CSV. Import back with a preview, then merge, replace, or drop
> everything into a new folder. Set a schedule once and Snug backs your
> bookmarks up to your Downloads folder on its own.
>
> Snug makes no network calls. Every operation reads and writes your browser's
> own bookmarks tree, locally — no account, no cloud, no server to trust. See
> the [Privacy Policy](../../PRIVACY_POLICY.md) for details, or just read the
> source: there's nothing to hide behind a link.

---

## Brand choices applied (per the voice guide)

- **Trust-first lead, every time**: all three pieces open or close on "no
  account/no cloud/local-only" rather than leading with a feature list — Message
  Pillar 1.
- **No hype words**: no "seamless," "effortless," "supercharge," no exclamation
  points anywhere, per "Quietly confident" / "Avoid These Terms."
- **Named exactly what ships, nothing more**: HTML/JSON/CSV, the three import
  modes, the backup schedule — all real, all in `docs/usage.md`. Nothing implies
  sync or a server.
- **"Snug" metaphor used sparingly**: appears once, structurally, in "exactly as
  you left them" / "tal como los dejaste" rather than forcing "tuck in" into
  every sentence — per the voice guide's open question #1 (use the metaphor at
  the edges, let precision carry most of it).
- **README's closing line** ("read the source: there's nothing to hide behind a
  link") is the one place this copy adds personality beyond pure fact-statement
  — judged in-bounds for "Respectful of your intelligence" (a wink at a
  dev-literate reader, not a sales line) but flagged below as worth a second
  look.

## Facts corrected before writing this (vs. the original brief/voice guide)

Checked against the live repo (`docs/usage.md`, `CHANGELOG.md`) before writing
any copy, per the "ground every claim, never invent a feature" instruction — two
corrections came out of that check, now also fixed upstream in `brief.md` and
`.claude/brand-voice-guidelines.md`:

1. **CSV was missing.** The brief said "HTML/JSON output"; the product ships
   HTML, JSON, _and_ CSV, for both export and import.
2. **Scheduled automatic backups already exist.** The brief's naming discussion
   (`naming.md`'s Archiva round) treated "grows into backups later" as a
   future-only consideration — backups to the Downloads folder, on a schedule,
   already ship today. This copy names it directly as a current feature, not a
   roadmap item.
3. **The "no date-stamped filename" pain was stale.** It was true of old CWS
   reviews, not the current product — customizable filename templates with
   date/time placeholders already shipped (`CHANGELOG.md`: "Added customizable
   filename templates for exports"). This copy mentions it as something Snug
   already does, not something it's fixing.
4. **The "no completion feedback" pain is still real** — no toast/ confirmation
   exists in the manual export flow (verified: no toast component in the
   codebase). This copy doesn't claim it's fixed because it isn't; that stays a
   real UX item for `apply-spec.md`/implementation, not something to word around
   in marketing copy.

## Open items for review

- The README closing line's tone (point above) — confirm it reads as
  dev-literate rather than cute before it ships.
- Exact placement of the CSV/backup corrections in `naming.md`'s Archiva
  write-up wasn't rewritten (only flagged in `brief.md`) — low priority, doesn't
  change the Snug decision, but worth a tidy-up pass later.

## Brand review (`marketing:brand-review`, 2026-10-01)

**Overall**: strong alignment — no hype words, no superlatives, no compliance
flags, consistent tú/no-voseo Spanish throughout. One Medium finding, now fixed
above: the CWS short summary and both rename-announcement versions said
"automatically back up" alone, which implies an always-on default; the product's
own README/docs always pair it as "**scheduled** automatic backups" for exactly
this reason (the schedule is opt-in). Fixed by restoring "scheduled" in all
three places. No High-severity or legal/compliance issues found.
