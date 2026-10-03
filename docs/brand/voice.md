# Snug Brand Voice Guidelines

> **Status: closed as shipped in v2.0.0.** Everything below is the record of the
> decisions that led to the shipped product. Where it disagrees with the shipped
> copy, the shipped copy wins: see `docs/store/README.md` and the
> `locales/*.json` files.

## Generation Metadata

- Created: 2026-10-01
- Version: 1
- Sources: `brief.md`, `naming.md`, `competitors.md` (all in this folder) — the
  brief's decisions, the naming process's head-to-head scoring, and the
  competitor-review findings
- Documents processed: 3
- Conversations analyzed: 0 (no customers/reviews written in this voice yet —
  this product's existing 18 CWS reviews are about the old name/UX, not usable
  as voice evidence)
- Discovery report used: No
- Overall confidence: **Medium** — derived from the founder's own explicit
  decisions (name, tone pivot, what-to-avoid list), not from tested copy or user
  interviews. Team/founder review recommended before shipping the CWS listing
  and README verbatim.
- Brand language: English first; Spanish adapted for meaning and tone, not a
  literal mirror — neutral Latin American Spanish, **tú** throughout, no voseo,
  no Rioplatense slang (see "Spanish Adaptation Notes").

---

## Executive Summary

Snug talks to the one person who's going to actually read the CWS listing before
installing something with read/write access to their whole bookmark tree: a
power user or developer who already has good tools and good judgment. The voice
is **calm, precise, and quietly warm** — it says exactly what the extension does
and what it doesn't do, promises nothing it can't deliver in the extension
itself, and never has to raise its voice because the product's whole pitch (zero
network calls, zero account, zero data collection) is already the most
convincing thing it can say.

The name's own warmth is new ground for this rebrand — the voice earns that
warmth the same way the product earns trust: by being careful, not by being
cute. A future mascot may eventually carry more of that warmth visually; until
it exists, the voice carries all of it through precision and a little genuine
care, not through forced personality.

Contrast with the whole competitive set (see `competitors.md`): every direct
competitor is a faceless, generic utility. Snug is the first one with a voice at
all — that alone is the differentiation, so the voice doesn't need to perform
warmth loudly to stand out.

---

## We Are / We Are Not

| We Are                                                                                                | We Are Not                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Precise** — we say exactly what happens, no padding                                                 | **Vague or corporate** — no "seamless experience," no "robust solution"                                                     |
| **Quietly confident** — we state what we do and stop                                                  | **Hype-y** — no "🚀 supercharge," no exclamation-point marketing                                                            |
| **Honest about scope** — we never name a feature we don't ship                                        | **Overpromising** — no formats, no "backup," no "sync" we don't actually do (see `competitors.md`'s "101 Export..." lesson) |
| **Warm, in a careful way** — Snug's own warmth shows through attention to detail, not forced cuteness | **Twee or mascot-dependent** — no borrowed personality from a mascot that doesn't exist yet in this version                 |
| **Respectful of your intelligence** — you're a peer, not a lead to convert                            | **Condescending or sales-y** — no onboarding-flow language, no "let us help you get started!"                               |
| **Small on purpose** — one tool, one job, done well                                                   | **Feature-bloated or cross-selling** — no "and so much more," no upsell language                                            |

### Voice Attributes Detail

#### Precise

- **What it means**: every sentence describes an actual, verifiable behavior of
  the extension — not a feeling about the extension.
- **How it shows up**: subject + exact action + exact scope ("Exports the folder
  you pick, as HTML or JSON — nothing else moves").
- **What to avoid**: adjectives that describe nothing concrete ("powerful,"
  "seamless," "effortless" used as filler).
- **Evidence**: `brief.md`'s "What to avoid" explicitly bans naming a
  format/capability the extension doesn't ship, citing the "101 Export..."
  competitor's 3.1★ rating as the cautionary case.
- **Confidence**: High

#### Quietly confident

- **What it means**: the copy states a fact and trusts the reader to draw the
  right conclusion — it doesn't need to sell the conclusion too.
- **How it shows up**: short declarative sentences, no exclamation points, no
  rhetorical questions used as a sales device.
- **What to avoid**: "🚀 supercharge your bookmarks," "the ultimate bookmark
  tool," any superlative the product can't prove.
- **Evidence**: `brief.md`'s "Cultural position" — "confident about doing one
  thing precisely; quiet about everything else."
- **Confidence**: High

#### Honest about scope

- **What it means**: the copy never implies a capability (cloud, sync,
  backup-over-time) the shipped extension doesn't have, even when the metaphor
  behind the name could support it later.
- **How it shows up**: "no account, no cloud" stated plainly in the store
  descriptor itself, not buried in a privacy policy link.
- **What to avoid**: "sync across devices," "your bookmarks, backed up" — true
  of a possible future version, not of what ships.
- **Evidence**: `brief.md`'s trust-level section ("say it plainly, don't bury
  it") and the explicit "what to avoid" ban on cloud/sync cues; `naming.md`'s
  Archiva rejection for implying a Wayback-style snapshot feature that doesn't
  exist.
- **Confidence**: High

#### Warm, in a careful way

- **What it means**: the name itself carries warmth (see `naming.md`'s
  head-to-head — Snug won specifically on warmth/mascot potential); the _voice_
  earns that same warmth through care and attentiveness to the reader's actual
  problem, not through forced personality or borrowed mascot dialogue.
- **How it shows up**: copy that notices the small things that actually bothered
  real users (no completion feedback, no dated filename — both named in
  `brief.md`'s "Pains") and fixes/acknowledges them plainly.
- **What to avoid**: cutesy copy standing in for a mascot that doesn't exist in
  this version yet; see "Twee or mascot-dependent" below.
- **Evidence**: `brief.md`'s "Visual world" revision (2026-10-01) — mascot
  reserved for later, current version stays in the precise register, but the
  _name's_ warmth should still read through in the voice even without a visual
  mascot to carry it.
- **Confidence**: Medium — this is the newest, least-tested attribute (added the
  same day as the naming pivot); worth founder review once real copy exists.

#### Respectful of your intelligence

- **What it means**: the reader already knows what a bookmark export is; the
  copy never explains the obvious or talks down.
- **How it shows up**: no "Getting Started!" exclamation marks, no explaining
  what a Chrome extension is.
- **What to avoid**: onboarding-flow language, "Welcome! Let's get you set up
  🎉."
- **Evidence**: `brief.md`'s audience section — "the user is a peer who already
  has good tools and good judgment, not someone who needs to be sold or
  onboarded."
- **Confidence**: High

#### Small on purpose

- **What it means**: the copy never pads the feature list or hints at a bigger
  platform the user hasn't asked for.
- **How it shows up**: a README/listing that describes one job, done once, well
  — not a roadmap pitch.
- **What to avoid**: "and so much more," "join thousands of users managing their
  digital life with Snug."
- **Evidence**: `brief.md`'s cultural position — "no feature bloat, no
  cross-sell, no account wall."
- **Confidence**: High

---

## Brand Personality

- **Archetype**: **The careful packer.** The person who helps you move and
  actually checks that nothing got left behind — not because they're sentimental
  about your stuff, but because leaving something behind would bother them more
  than you.
- **If our brand were a person**: someone precise and a little quiet, who shows
  they care through getting the small details right (the file name has a date
  now; you get a confirmation when it's done) rather than through enthusiasm.
  Not cold — just not performing warmth either.
- **Core values expressed in voice**: precision, restraint, honesty about scope,
  quiet reliability.

---

## Messaging Framework

### Primary Value Proposition

Snug moves your whole bookmark tree between browsers, intact — nothing sent
anywhere, nothing left behind.

Variations observed in source material:

- "Tuck your bookmarks in and carry them anywhere — no account, no cloud."
  (Source: `naming.md`, draft CWS descriptor)
- "Wherever you take your bookmarks, they stay tucked in and safe." (Source:
  `brief.md`'s internal emotional promise — **never public, reword for copy**)

### Key Message Pillars

1. **Local-only trust**
   - Core idea: nothing about your bookmarks ever leaves your browser.
   - When to use: CWS listing, README's top line, privacy-relevant UI copy.
   - Example phrasing: "No account, no cloud, no sync — everything happens on
     your device."
   - Confidence: High (directly from `brief.md`'s "Trust level" section)

2. **Nothing lost, nothing unclear**
   - Core idea: the export/import is complete and you know it worked.
   - When to use: in-product confirmation states (toast/badge after export),
     changelog entry fixing the "no feedback" complaint.
   - Example phrasing: "Done — your bookmarks are in
     `snug-export-2026-10-01.html`."
   - Confidence: High (directly answers `brief.md`'s pains #1 and #2)

3. **You choose exactly what moves**
   - Core idea: folder-level control, not all-or-nothing.
   - When to use: feature description, comparison framing against competitors.
   - Example phrasing: "Pick a folder, or take the whole tree — your call."
   - Confidence: Medium (feature exists today; phrasing not yet tested)

4. **We only say what we ship**
   - Core idea: never name a format or capability not actually delivered.
   - When to use: internal copy-review checklist more than a public-facing line
     itself.
   - Confidence: High (direct lesson from `competitors.md`'s "101 Export..."
     case)

### Competitive Positioning

- vs. generic exporters ("Bookmarks Exporter," "101 Export..."): they're
  faceless utilities with no voice and, in the worst case, promise formats they
  don't deliver — Snug says less and means all of it.
- vs. the strongest competitor (**Selective Bookmarks Export Tool**, 10k
  users/4.9★): they win today on scope-control UX and polish, not branding —
  Snug matches the scope-control and adds the identity/voice layer that's
  genuinely unclaimed in this niche (`competitors.md`).
- vs. Status Quo (our own current listing, 4.72★/18 reviews): same engine, fixed
  trust/feedback gaps, now with a name and a voice instead of "Bookmark
  Import/Export."

---

## Tone-by-Context Matrix

Voice is constant. Tone flexes by context — these contexts are specific to a
browser-extension product, not a sales motion.

| Context                           | Formality | Energy     | Technical Depth | Key Principle                                    |
| --------------------------------- | --------- | ---------- | --------------- | ------------------------------------------------ |
| CWS store listing                 | Medium    | Low-Medium | Low             | Lead with trust, not features                    |
| "What's New" update note (rename) | Medium    | Low        | Low             | Explain the rename plainly, no spin              |
| README                            | Medium    | Low        | Medium-High     | Developer-to-developer, precise                  |
| In-extension UI (buttons/toasts)  | Low       | Low        | Low             | As few words as possible, always accurate        |
| Error messages                    | Low       | Low        | Medium          | Say what happened and what to do, nothing else   |
| GitHub release notes              | Low       | Low        | High            | Changelog register, no marketing language at all |

### Context-Specific Guidelines

#### CWS Store Listing

- **Overall tone**: calm, factual, trust-first.
- **Opening approach**: state the local-only promise before any feature.
- **Do's**: name the exact export/import scope; say "no account, no cloud"
  explicitly.
- **Don'ts**: never claim a format not shipped (the "101 Export..." trap); no
  superlatives.
- **Example**: "Tuck your bookmarks in and carry them anywhere — no account, no
  cloud."

#### "What's New" Rename Note (v2.0.0)

- **Overall tone**: plain, a little warm, zero spin.
- **Opening approach**: say what changed (the name) and why in one sentence;
  don't oversell the rebrand itself.
- **Do's**: reassure that nothing about data/behavior changed, only the
  name/face.
- **Don'ts**: don't apologize excessively for the old name, don't hype the new
  one.
- **Example**: "This extension has a new name — Snug. Same tool, same local-only
  promise, just a name that's actually its own."

#### README

- **Overall tone**: developer-to-developer, precise, a little dry.
- **Do's**: lead with what it does and doesn't do (no network calls); link
  decisions to the actual code where useful.
- **Don'ts**: no onboarding-flow language, no feature marketing.

#### In-Extension UI

- **Overall tone**: minimal, exact.
- **Do's**: confirm completion explicitly (fixes pain #1); name the file/path in
  confirmations (fixes pain #2).
- **Don'ts**: no exclamation marks, no "Yay! All done! 🎉."
- **Example**: "Exported 248 bookmarks to `snug-export-2026-10-01.html`."

---

## Terminology Guide

### Must-Use Terms

| Term                             | Usage                                     | Instead Of                                                            | Example                                                           |
| -------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| export / import                  | the core actions, always named exactly    | "transfer," "migrate" (vaguer)                                        | "Export the selected folder as HTML, JSON, or CSV."               |
| local / on-device                | whenever stating the trust promise        | "private," "secure" (imply a security mechanism that isn't the point) | "Everything happens locally — nothing is uploaded."               |
| folder                           | the unit of selective scope               | "collection," "set"                                                   | "Choose a folder to export."                                      |
| backup (scheduled, to Downloads) | a real, shipped feature — name it plainly | "sync," "cloud backup" (imply a server)                               | "Scheduled backups land in your Downloads folder — nothing else." |

### Preferred Terms

| Term           | Usage                                                                                       | Example                                        |
| -------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| tuck in / snug | occasional nod to the name's own metaphor, used sparingly, never forced into every sentence | "Your bookmarks, tucked in and ready to move." |
| intact         | when describing the result of a move                                                        | "Your folder structure arrives intact."        |

### Avoid These Terms

| Term                                       | Reason                                                                               | Alternative                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------- |
| sync / cloud                               | the product does neither today; implying either misleads (`brief.md`'s explicit ban) | "export," "move," "carry"               |
| seamless / effortless / robust             | content-free marketing filler, contradicts the "Precise" attribute                   | name the actual behavior instead        |
| supercharge / revolutionize / the ultimate | hype language, contradicts "Quietly confident"                                       | state the fact; let it speak for itself |

**Correction (2026-10-01):** "backup" was listed here in version 1 of this guide
as a term to avoid, on the assumption it was a future-only feature. It isn't —
the live product already ships **scheduled automatic backups to the Downloads
folder** today. "Backup" is a real, must-use term when describing that feature;
only "cloud backup" or "synced backup" (implying a server) stays banned.

### Never-Use Terms

| Term                                                                                             | Reason                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The internal emotional promise's literal wording ("tucked in and safe," used as a direct slogan) | `brief.md` explicitly reserves this for internal orientation only — public copy should echo the _feeling_, never quote it verbatim as a tagline                                                                                                                                           |
| Any format/feature name the extension doesn't ship (e.g. "XLSX," "sync")                         | direct repeat of the "101 Export..." overpromise failure mode. **Correction (2026-10-01):** "CSV" and "scheduled backups" were wrongly listed here in version 1 — both ship today (`lib/importers/import-csv.ts`, `lib/auto-export.ts`) and are must-use terms, see the correction above. |

---

## Language to Avoid

### Anti-Patterns

1. **"🚀 Supercharge your bookmarks!"** — Problem: hype the product can't back
   up, reads exactly like the generic competitors it's meant to stand apart
   from. Better: "Move your bookmarks between browsers, exactly as they were."
2. **"Sync your bookmarks across all your devices!"** — Problem: false claim,
   the product has no sync. Better: "Export once, import anywhere — no account
   needed."
3. **"Welcome! Let's get you started 🎉"** — Problem: condescending onboarding
   tone for an audience that doesn't need it. Better: no onboarding copy at all,
   or a single neutral line if the UI truly requires one.

_(No "Language That Works" ranked-by-effectiveness section — this voice has no
transcript or tested-copy data yet; the phrasing examples above are
source-derived recommendations, not measured outcomes. Revisit once real copy
ships and gets used.)_

---

## Spanish Adaptation Notes

Per `brief.md`'s closed decisions: English is the primary/first-written
language; Spanish is **adapted for meaning and tone, not a literal mirror**
(same convention as this repo's existing i18n). Rules specific to Spanish copy:

- **Tú throughout** — never usted, never vos/voseo conjugations ("exportas,"
  never "exportás" or "exporta usted").
- **Neutral Latin American Spanish** — no Rioplatense slang, no country-specific
  idioms; a reader in any Spanish-speaking country should find it equally
  natural.
- Adapt metaphors rather than translate them literally: "tuck in" doesn't have a
  clean one-word Spanish equivalent — prefer something like "a salvo" (safe) or
  "tal como estaban" (exactly as they were) over a forced literal translation of
  "snug."
- The name **Snug** itself stays in English in Spanish copy (not
  translated/transliterated) — same convention as most Spanish-market tech brand
  names.
- Same terminology bans apply in Spanish: "nube" and "sincronizar" stay banned
  as claims about the product (e.g. "sin cuenta ni nube" is fine — it's a
  _negation_, not a claim). **Correction (2026-10-01):** "respaldo" was wrongly
  banned here in version 1 — the product ships real scheduled backups, so
  "respaldo" (singular, to Downloads) is a must-use term, same as "backup" in
  English. Only "respaldo en la nube" or "respaldo sincronizado" (implying a
  server) stays banned.

---

## Confidence Scores

| Section             | Confidence | Basis                                                                                                                                                                               | Sources             |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Voice Attributes    | Medium     | Explicit founder decisions in `brief.md`, consistent across all three source docs, but not yet tested against real copy or users                                                    | 3 sources           |
| Messaging Framework | Medium     | Pillars map directly to named pains/trust points in `brief.md`; phrasing itself is drafted, not tested                                                                              | 2 sources           |
| Tone Matrix         | Low        | No existing copy or transcripts in this voice to observe; contexts and guidance inferred from the brief's general principles and this product's actual surfaces (listing/README/UI) | 1 source (inferred) |
| Terminology         | Medium     | Must-use/avoid/never-use terms are explicit in `brief.md` and `naming.md` (the "101 Export..." lesson is concrete evidence, not inference)                                          | 2 sources           |
| Language Patterns   | Low        | No transcripts or tested copy exist; examples are source-derived, not measured                                                                                                      | 1 source (inferred) |

**Overall: Medium** (weighted per the standard methodology — Voice 0.6×0.30 +
Messaging 0.6×0.25 + Tone 0.3×0.20 + Terminology 0.6×0.15 + Language 0.3×0.10 ≈
0.52, rounds to the low end of Medium). Guidelines generated primarily from the
founder's own direct decisions rather than tested or observed content —
team/founder review recommended before this ships verbatim in the CWS listing or
README.

---

## Open Questions for Team Discussion

### Resolved (as shipped in v2.0.0)

1. **How much of the "snug" metaphor appears in copy.** Resolved: used
   sparingly, once in the listing ("exactly as you left them") and not in UI
   strings. Precision carries the voice.
2. **Rename-announcement wording.** Resolved: the approved EN and ES text is in
   `docs/store/README.md` and in the `changelog_2_0_0_1` locale key.
3. **Whether "tuck in" survives as a motif.** Resolved: it did not. The shipped
   copy does not use it.

---

## Data Gaps & Recommendations

- [x] Resolved: real copy now ships in 10 locales, so the voice has been tested.
      No real user-facing copy existed yet to test this voice against — step 5
      (copy via `brand-voice:brand-voice-enforcement` then
      `marketing:brand-review`) is exactly that test; treat its output as the
      first real evidence, not just an application of this guide.
- [x] Accepted, not a gap: no transcripts/conversations in this voice (this is a
      solo-maintained OSS extension, not a sales org) — the Tone Matrix and
      Language Patterns sections will stay Low confidence until real copy
      exists; that's expected for this kind of project, not a gap to chase down
      with more research.

---

## Appendix: Sources

| #   | Source                             | Platform       | Type                                         | Date       | Key Sections Used                                                                                     | Confidence |
| --- | ---------------------------------- | -------------- | -------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| 1   | [`brief.md`](brief.md)             | Brand kit file | AUTHORITATIVE (founder decisions)            | 2026-10-01 | Audience, Pains, Cultural position, Trust level, Visual world, What to avoid, Closed decisions        | High       |
| 2   | [`naming.md`](naming.md)           | Brand kit file | AUTHORITATIVE (founder decisions + research) | 2026-10-01 | Decision rationale, head-to-head scoring, draft CWS descriptor                                        | High       |
| 3   | [`competitors.md`](competitors.md) | Brand kit file | OPERATIONAL (market research)                | 2026-10-01 | Competitive positioning, the "101 Export..." overpromise lesson, our own current listing's complaints | Medium     |
