# Brief — Snug (bookmarks-import-export rebrand)

Draft v1 (2026-10-01). Name chosen 2026-10-01: **Snug** (see `naming.md`).
Direction pivoted the same day from "precise/CLI-tool-adjacent" to warm,
mascot-friendly — see "Visual world" and "What to avoid" below, both revised
accordingly.

## Category

A Chrome (MV3) browser extension for exporting and importing bookmarks — whole
tree or chosen folders, HTML/JSON/CSV output, preview-then-restore import (merge
or replace, or into a new folder), scheduled automatic backups to the Downloads
folder, cross-browser (any Chromium browser, not just Chrome). No backend, no
account, no network call: every operation reads and writes the browser's own
bookmarks tree, on-device. First of a planned family of small, focused
developer/power-user tools released under the AndryOre endorsed brand.

**Correction (2026-10-01):** earlier drafts of this brief undersold the actual
feature set as "HTML/JSON output" only — the live product already ships CSV
export and scheduled automatic backups today, not as a future possibility. This
matters for `naming.md`'s Archiva discussion (its appeal was partly "works if
backups arrive later" — they're already here) and for `voice.md`'s terminology
rules (backup is a real, shippable claim, not one to avoid).

## Audience

Power users and developers who've accumulated years of bookmarks across browsers
and machines — the kind of person who already reaches for `bun`/`rg`/`sg` over a
GUI, cares that a tool does exactly one thing well, and reads a changelog before
updating. They switch browsers or get a new machine more often than average and
don't want to lose a curated tree built up over years. Secondary audience:
people handing off or archiving a specific project's bookmark folder (research,
a course, a job search) without exposing their whole library.

Note: "first of a planned family of tools" above describes the author's own
roadmap, not the brand strategy — this product gets its **own, fully independent
identity** (see "Closed decisions"), not a sub-brand of anything else.

Confirmed unchanged by the warm/mascot pivot (user, 2026-10-01): a future pet
doesn't narrow or soften this audience — plenty of serious products this
audience already uses carry one without reading as less precise.

**Revised (2026-10-01): long-term audience is broader than devs/power users.**
The user's own roadmap expects this to grow into a consumer product, not stay
dev-only — v2.0.0's visual system needs to work as a starting point for that,
not just for today's power-user base. This doesn't replace the audience
description above (today's real user is still the power user), it adds a
constraint on the visual direction: don't go so technical/niche that a broader,
more casual future audience would require a jarring restyle to welcome them in.

## Pains (to solve and to say out loud)

1. **No confirmation anything happened.** Click export, nothing visibly changes
   — no toast, no indicator the file actually wrote. (Our own top review
   complaint today.)
2. **~~No way to tell exports apart later~~ — already fixed, just not known.**
   Correction (2026-10-01): this was true of old reviews, not the current
   product — customizable filename templates with date/time placeholders already
   shipped (see `CHANGELOG.md`). This isn't a gap to fix, it's a shipped fix
   nobody's current CWS listing/copy ever mentions — the rebrand copy should
   surface it, not promise to build it.
3. **Every competitor in this space is a faceless utility.** Generic names
   ("Bookmarks Exporter", "101 Export..."), no icon system, no voice — nobody
   has made this feel like a _tool you trust with your whole browsing life_
   rather than a random extension that happened to rank in search.
4. **All-or-nothing or format-overpromising.** Most tools either dump the entire
   tree with no folder control, or — worse — advertise a format (CSV/XLSX) in
   their name that the extension itself doesn't actually produce, pushing the
   user to a third-party converter (see `competitors.md` — "101 Export...",
   3.1★).
5. **Handing your bookmarks to an extension feels riskier than it should.**
   Bookmarks can contain private research, work logins' landing pages, a job
   search — people hesitate to trust an unbranded, unaudited-looking tool with
   read/write access to all of it.

## Product function

Already does the mechanical job well: selective folder export, cross-browser
HTML/JSON output, 100% local processing. The rebrand's job is not to add scope —
it's to make the _existing_ local-only, zero-collection design legible as a
trust feature, fix the two concrete UX gaps above (pain 1–2), and give the tool
a face a user remembers and recommends.

## Emotional promise (internal only — never public copy)

**Wherever you take your bookmarks, they stay tucked in and safe.** Not "yet
another browser utility" — the tool a careful person reaches for precisely
because it asks for nothing and sends nothing anywhere; your whole bookmark tree
arrives snug, exactly as you left it.

Reworded 2026-10-01 to match the chosen name's own metaphor (was: "Your
bookmarks are yours, in full, wherever you take them") — same promise, now in
Snug's own image instead of the pre-naming "archive/carry" language.

Internal only: orients decisions, never appears verbatim in listing copy,
README, or UI strings. The voice guide (step 4) will name the words this rules
out, same role as StreamBoss's ban on "jefe"/"rey".

## Cultural position

- A small, serious, single-purpose tool made by someone who ships — not a
  "productivity app" with onboarding flows and a pricing page it doesn't need.
  This stays true for v2.0.0 even with a warmer name — plenty of serious tools
  carry real warmth without becoming unserious (confirmed by the user,
  2026-10-01: a future pet/mascot doesn't undercut this for them — "muchas
  empresas y productos serios tienen pet").
- Confident about doing one thing precisely; quiet about everything else — no
  feature bloat, no cross-sell, no account wall.
- The user is a peer who already has good tools and good judgment, not someone
  who needs to be sold or onboarded.

## Trust level

High, even though there's no backend to secure — the trust question here is
"does this extension actually do only what it claims with my data," not "is my
data encrypted in transit." Zero network calls and zero data collection
(declared and, since this is a MV3 extension others can inspect, verifiable) is
the whole trust story; say it plainly, don't bury it in a privacy-policy link.

## Visual world (revised 2026-10-01 — v2.0.0 scope vs. future; re-revised

same day for the "dev tool today, consumer product later" audience note)

The name **Snug** was chosen partly for its warmth and mascot potential (see
`naming.md`'s head-to-head scoring), but **the mascot itself is out of scope for
this rebrand** (clarified by the user, 2026-10-01) — it's a reserved future
direction for if/when the product grows, not something the logo/icon phase needs
to design now.

- **A deliberate middle ground, not the original "precise/CLI-tool" register on
  its own.** User reference (2026-10-01): appicons.store — a consumer app- icon
  marketplace heavy on vibrant gradients, soft rounded geometry, and mascots.
  That register on its own doesn't fit (it reads as a random consumer utility to
  the power-user audience that actually uses this today, and contradicts the "no
  generic SaaS polish" trust story below) — but two of its traits are adopted
  deliberately, because they also serve the long-term broader-audience goal
  above:
  - **Confident, rounded geometry** — already the reason Nova (moderate radius)
    beat Lyra (zero-radius, too rigid/niche) as the shadcn Style.
  - **A vivid, saturated single accent color** — not the muted
    "corporate-earth-tone" first palette pass; something closer to Raycast's
    coral or Arc's coral/Cron's orange, warm and alive rather than desaturated.
- **What's still not adopted:** multi-color gradients as a UI/marketing device,
  and mascot/character design — both stay out of scope for v2.0.0 for the
  reasons already established (gradients read as overclaiming "generic SaaS
  polish"; the mascot is deliberately reserved for later). A restrained gradient
  is permissible only as a contained treatment on the icon/mark itself if the
  logo phase finds it earns its place — never in UI chrome, copy, or the
  listing.
- Archive/shelf/tray imagery (something tucked away safely, moving intact
  between places) is still the conceptual anchor for the mark — the geometry and
  color just render it warmer than the original "CLI-tool" hypothesis.
- **Reserved for later, not designed now:** a mascot built around "snug" itself
  (something that tucks in safely, curls up, comes along for the ride) — don't
  paint the current mark/palette into a corner that would make adding one later
  awkward, but don't spend the current logo phase on it either.
- Still no "cloud"/"sync" imagery — unrelated to any of the above, still holds
  (see "What to avoid").
- Fully independent palette, type, and mark — unchanged, still not derived from
  AndryOre's own visual system.

**Palette decision (2026-10-01): "P+R" — dark-first Aurora, amber accent,
organic mark.** Final, after ~11 rounds of exploration (canvas:
https://claude.ai/artifact/JnhPmHssytDkPR7ABZp8RG). Dark-first ground `#17120A`
(not a flat near-black — a radial warm glow bloom behind the content, same
device as StreamBoss's Aurora treatment, read from its actual brandbook/logo
files rather than just its token table). Flat UI accent `#FFA230` (amber,
benchmarked against Raycast's `#ff6363` and Arc's `#ff5f5f` register — vivid and
saturated, not the muted "corporate earth tone" of the first two exploration
rounds). Gradient `#FFA230` → `#FFD37A` reserved for the mark and the wordmark's
partial-gradient treatment only, never UI/copy, per the gradient carve-out
below. Mark shape: an organic blob
(`border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%`), not a squircle — the one
piece of the appicons.store reference (see "Visual world" above) that survived
into the final direction, alongside the glow. Text `#F3EBDE`/`#DCC8A6` on dark.

**shadcn Style decision (2026-10-01): Nova.** Chosen over Lyra (zero-radius, too
rigid to leave headroom for the reserved mascot direction above — "don't paint
into a corner" applies to Style, not just palette/mark), over Vega (too generous
for a popup's limited real estate), and over Mira (denser extreme — too cramped
once an illustrated element eventually shares the space). Nova's tighter padding
fits the popup's small footprint, its moderate (non-zero) radius keeps room for
the future pivot. Custom palette and type sit on top of this Style per the
streamboss precedent — not a literal `ui.shadcn.com/create` preset.

**Logo decision (2026-10-01): "C — Ribbon tag."** Final mark, after ~20 rounds
of SVG path iteration (canvas:
https://claude.ai/artifact/FfbFpQBSwyoXZPbiVoStRm, board `C-tag.dc.html`). The
original literal ribbon-tag silhouette — modest corner radius, straight-edged
V-notch at the bottom — won out over every rounder/softer variant explored (a
fully-rounded no-notch square ("E"), and numerous attempts to soften or reshape
the notch itself: wider almond-shaped tips, a double-hump wave, a tall U-shaped
cavity, a true semicircle arch, a flattened ellipse, and two more-rounded
corner-radius variants of C itself ("J", "K")). None of the softened/rounder
directions read better than the original; the user converged back to it
unchanged. SVG path (84×84 viewBox):

```
M20 8 L64 8 Q70 8 70 14 L70 68 Q70 78 61 72 L42 59 L23 72 Q14 78 14 68 L14 14 Q14 8 20 8 Z
```

Rendered with the `#FFA230`→`#FFD37A` gradient fill, a blurred amber halo behind
the mark, on the dark Aurora ground `#17120A` — same treatment as the "P+R"
palette decision above. No further logo exploration pending; next step is
exporting this mark at the required icon sizes (step 10) and writing it into the
brandbook (step 9).

**Typography decision (2026-10-01): Space Grotesk (display) + Geist (UI) + Geist
Mono.** Chosen from shadcn's actual font-picker list only (verified against
`font-definitions.ts` in the shadcn/ui repo and against screenshots of the live
picker — both match: 17 sans, 2 mono, 7 serif; no font outside that list was
considered). Canvas (5 artboards — one per display candidate plus a UI
comparison): https://claude.ai/artifact/S4W3WonLVsgvdsXmCvEEMW.

- **Display/wordmark — Space Grotesk.** Chosen over Outfit, Manrope, and
  Figtree. Its squared bowls and flat-top terminals echo the logo mark's
  straight-edged V-notch and modest corner radius, matching the "deliberate
  middle ground" the Visual world section calls for — confident geometry without
  tipping into the soft/rounded consumer-mascot register (Figtree reads closest
  to that register and was rejected for it; Outfit is close but is already
  StreamBoss's display face per its `visual.md`, and reusing it would cut
  against the "fully independent brand" decision above). Manrope was the
  next-closest alternative — more neutral, less distinctive character in the
  wordmark at display size.
- **UI — Geist.** Already shipped in this repo (`entrypoints/popup/style.css`),
  so adopting it for Snug's UI is zero migration cost. Compared head-to-head
  against Inter at UI sizes (13–14px, tabular numerals) on the canvas's "UI:
  Geist vs Inter" board; no legibility or numeral-alignment issue favored
  switching.
- **Mono — Geist Mono.** Default pairing with Geist UI; no concrete need
  surfaced for JetBrains Mono (the list's only other mono option).

**Icon library decision (2026-10-01): keep Lucide, no change.** Evaluated
against Tabler Icons, HugeIcons, Phosphor Icons, Remix Icon (the shadcn
icon-library picker's full list). Lucide's 2px rounded-stroke geometry already
echoes the mark's modest corner radius (6 of 84, ~7%) and Geist's
precise-but-friendly register; none of the alternatives offered a meaningfully
different character for this product. Lucide is also the shadcn Nova Style
default and is already wired through every `components/ui/**` primitive and the
rest of the extension (`lucide-react` in `package.json`) — switching would mean
re-auditing icon size/padding/optical alignment across the whole popup for no
brand-signal gain, since icon-library choice carries far less weight than type,
color, and the logo (already decided). Zero migration cost, zero visual change.

**Assets (2026-10-01): raster exports done via `tools/export.mjs`.** Run with
`BRAND_TOOLS_MODULES=<bookmarks-import-export checkout> node tools/export.mjs`
(uses that repo's own `playwright` devDependency — no separate install needed).
Produces: `logo/png/mark-{16,32,48,128,512}.png` (flat gradient, transparent —
the same files serve Chrome, Edge, and Firefox/AMO; none of the three needs a
different design at these sizes), `store/small-tile-440x280.png` and
`store/marquee-1400x560.png` (CWS listing), `og/og-{en,es}.png` (1200×630, real
short-summary copy from `copy.md`, both under the 300 KB budget),
`readme/cover-1280x640.png` (README banner, using `copy.md`'s README tagline).
**Not generated**: CWS screenshots (1280×800) — those need the real running
popup UI after the rebrand ships, not a brand-kit render; left for the `/forge`
application pass.

- A name tied to "import/export" literally, or to "bookmarks" in a way that
  blocks the tool from ever covering more than bookmarks later.
- Cloud/sync/account visual or verbal cues (lock-with-cloud icons, "sync across
  devices" language) — this product has none of that and never implying it stays
  a trust anchor and a scope anchor.
- Naming a format or capability in the store descriptor that the extension
  doesn't ship directly (the "101 Export..." lesson — see `competitors.md`).
- Generic SaaS/startup polish — gradients as a UI/marketing device, "🚀
  supercharge your bookmarks" copy — that would read as overclaiming for a tool
  this small and make it look like every other unbranded competitor it's meant
  to stand apart from. (Mascots are no longer on this list — see the revised
  "Visual world" above — but the _generic_ version of one, a stock-feeling cute
  blob, still is. Same carve-out for gradients: a contained gradient treatment
  on the icon/mark itself, if the logo phase finds it earns its place, isn't
  banned the way a gradient in UI chrome, copy, or the listing is.)
- Public use of the internal emotional promise's literal wording.

## Closed decisions (carried from AO-1011/AO-1016 scoping)

- Two-stage process: this interactive brand definition first, a second `/forge`
  run applies the resulting `apply-spec.md` and ships v2.0.0.
- English-first copy; Spanish adapted for meaning and tone, not a literal mirror
  (this repo's existing i18n convention).
- **Fully independent brand** — overrides AO-1016's original "endorsed-brand"
  framing (user decision, 2026-10-01). No AndryOre palette/grid inheritance, no
  "by Andry Orellana" signature on the mark, listing, or logo. Authorship stays
  visible only where a repo normally shows it (LICENSE, GitHub profile, commit
  history) — never as brand furniture.
- No domain purchase for this product at this stage.

## Out of scope for branding (pending, not blocking)

- Whether this becomes the first of a named suite (e.g. a shared landing page
  across AndryOre tools) — a later product decision, not a naming constraint
  today beyond "don't paint into a corner."
