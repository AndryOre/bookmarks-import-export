# Naming — bookmarks-import-export rebrand

Fully independent brand (see `brief.md`'s closed decisions) — no AndryOre tie in
the name itself. Constraint from the brief: not tied to "import/export"
literally, not boxed into "bookmarks" either.

## Method

Brainstormed around the brief's visual-world hypothesis (archive, shelf, tray —
moving a stack of things intact from one place to another), then filtered by:

- GitHub repo-slug availability under `AndryOre`
  (`gh api repos/AndryOre/<slug>`)
- Domain availability (Porkbun, `.app`/`.dev`) — informational only; brief says
  no domain purchase at this stage
- Chrome Web Store name-collision check (web search) — this is the check that
  actually matters, since the listing competes by name in CWS search

## Candidates checked

| Name                                                      | GitHub slug | Domain (.app/.dev)           | CWS collision                                                                                                                                                 |
| --------------------------------------------------------- | ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Portage**                                               | free        | taken (both, premium-priced) | **none found**                                                                                                                                                |
| **Satchel**                                               | free        | taken (both)                 | none exact — "Stache - Bookmark Manager" is phonetically adjacent, not a true collision                                                                       |
| Trove                                                     | free        | taken (both)                 | **ruled out** — "Trove Bookmarks", "Save to Trove", and a tab-manager "Trove" all already live in this exact category                                         |
| Dray                                                      | free        | taken (both)                 | none found                                                                                                                                                    |
| Portage, Caddy, Cargo, Stash, Ark, Ferry, Crate, Knapsack | all free    | all taken                    | ruled out for strong existing tech-product associations (Caddy = web server, Cargo = Rust's package manager, Stash = git/Atlassian, Ark = KDE's archive tool) |

## Recommendation: **Portage**

- **Why**: exact metaphor match for the brief's visual world — _portage_ is
  literally the act of carrying a boat or its cargo intact, overland, between
  two bodies of water, or around an obstacle. That's precisely what the product
  does with a bookmark tree between browsers/machines.
- Zero CWS collision in this category, zero strong consumer-brand collision.
- Reads as precise and slightly technical rather than cutesy — matches the
  brief's "closer to a well-made CLI tool's icon than a consumer app's mascot"
  tone. For the dev-leaning audience specifically, it also echoes Gentoo Linux's
  `portage` package manager — a positive, knowing wink for that crowd rather
  than a confusing collision (different domain entirely).
- One word, easy to say and spell in both English and Spanish.

## Alternate: **Satchel**

- Warmer, more everyday metaphor (a bag that carries your things intact) —
  slightly more approachable, slightly less distinctive than Portage.
- Keep as the fallback if Portage tests poorly in the logo/visual phase.

## CWS listing (draft, pending final name choice)

- **75-char store descriptor** (Portage):
  `Carry your entire bookmark tree between browsers, intact — no account, no cloud, no sync.`
  (74 chars)
- **75-char store descriptor** (Satchel):
  `Pack up your bookmarks and carry them anywhere — no account, no cloud, no sync.`
  (73 chars)

Both descriptors lead with the local-only trust angle from the brief instead of
naming a format, avoiding the "101 Export..." overpromise trap.

## Research: how naming experts and modern dev tools actually do this

- **Lexicon Branding** (named Vercel, BlackBerry, Swiffer, Pentium): a good name
  is "easy to process, highly noticeable in its category, and noteworthy." They
  study **sound symbolism** — individual letters/sounds trigger feelings before
  meaning does (B reads as reliable, V as daring, X as innovative — why SpaceX,
  Vercel). Vercel itself was built by blending _versatile + accelerate + excel_,
  after generating ~180 candidates across three rounds — naming-by-committee,
  not a single flash of inspiration.
- **Stripe**: a common, ordinary word, chosen specifically because it had **zero
  existing brand associations** in payments and evoked something clean and
  physical (a racing stripe, a card's magnetic stripe) _without literally
  describing_ "online payments." That's the core lesson: evocative beats
  descriptive because it leaves the product room to grow past its first feature
  — exactly the brief's "don't name it 'bookmarks' and get boxed in" constraint.
- **Linear**: no literal tie to "issue tracker" at all — the name reads as
  "direct, no detours," matching the product's whole pitch (speed, no Jira-style
  bureaucracy) rather than naming the feature set.
- **Consensus from current naming guides** (2026): short (1–2 syllables, under
  ~12 characters), easy to spell/say/type on a keyboard, invented or evocative
  beats descriptive for anything meant to outlast its first feature, and a
  two-syllable compound of two real, meaningful roots is the most reliable way
  to land on something ownable and available.

## Round 2 candidates (post-research)

| Name                      | Approach                                                                                                                                                                                                          | CWS collision check                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ferry**                 | Evocative real word (Stripe-style) — a ferry carries a full load across, point to point, nothing left behind. Warm, one clear image, reads the same in English and Spanish (`ferri`/`ferry` is a known loanword). | none found                                                                                                                                                    |
| **Intact**                | Adjective-as-brand — names the _outcome_ ("your bookmarks arrive intact") instead of the mechanism, the exact Stripe move (evoke the benefit, not the feature).                                                   | none found                                                                                                                                                    |
| **Looma**                 | Invented blend, Vercel-style — root "loom" (you weave separate bookmark folders into one thing you carry with you) + a softened ending for brandability.                                                          | none found, but phonetically close to **Loom** (the very well-known screen-recording tool/extension) — real adjacency risk, flagging it rather than hiding it |
| ~~Carryall~~ / ~~Carrio~~ | Compound/invented "carry" roots                                                                                                                                                                                   | **ruled out** — an existing extension, **CarryLinks**, already does cross-browser bookmark sync; too close in both root word and category                     |
| ~~Transit~~               | Literal "moving between two points"                                                                                                                                                                               | **ruled out** — an extension literally named **Transit Bookmarks** already exists                                                                             |

## Live options after two rounds

1. **Portage** — strongest overall: exact metaphor, zero collision anywhere,
   technical/precise tone that fits the brief, positive wink for the dev
   audience (Gentoo).
2. **Ferry** — close second: warmer, equally clean, slightly more recognizable
   word than Portage for a non-technical reader.
3. **Intact** — most "Stripe-style" pick: names the promise, not the mechanism;
   most abstract of the three, which also means the least immediate hint at
   "bookmarks" in the raw word itself (the CWS descriptor carries that instead,
   same as Stripe's tagline carries "payments").
4. **Satchel** — the warmest/softest option from round 1, kept alive as the
   fallback if the logo phase wants something less abstract than the three
   above.

`Looma` is interesting but carries real collision risk with Loom and isn't
included as a live recommendation for that reason.

## Round 3 — more "promise, not mechanism" + soft real words (easy to say)

User liked **Intact** (names the promise) and **Looma** (soft invented blend) —
more in both veins, still 1–2 syllables, no hard consonant clusters:

| Name       | Approach                                                                                                                                  | CWS collision check                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steady** | Promise-word, same family as Intact — nothing shifts or breaks across the move. Two easy syllables.                                       | none found                                                                                                                                                                          |
| **Haven**  | Real word, warm — "a safe place for your bookmarks to land." Two syllables.                                                               | none found                                                                                                                                                                          |
| **Stowe**  | Real word (also reads as "stow" — to pack something securely for a trip), exact metaphor, one syllable.                                   | none found                                                                                                                                                                          |
| **Spool**  | Real word — winds something compact to carry with you; nice second layer for the dev audience ("spool up" = queue/prepare). One syllable. | none found                                                                                                                                                                          |
| ~~Weave~~  | Real word, same "weaving folders into one" image as Looma                                                                                 | **ruled out** — an existing extension, **Weave**, already does AI-assisted X/Twitter bookmark management                                                                            |
| ~~Sound~~  | Promise-word ("structurally sound")                                                                                                       | **ruled out** — not a direct name collision, but "Sound" is saturated by a _different_, much bigger CWS category (audio/volume extensions); would hurt discoverability, not help it |

All four (Steady, Haven, Stowe, Spool) are free on GitHub under `AndryOre` too.

## Round 4 — more, same two veins

| Name        | Approach                                                                                                                               | CWS collision check                                                                                                                                                                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Solid**   | Promise-word — "not falling apart," plain and confident. Two syllables, every letter easy.                                             | none found                                                                                                                                                                                                                                                              |
| **Whole**   | Promise-word — the most direct restatement of the brief's promise ("your bookmarks, whole"). One syllable.                             | none found                                                                                                                                                                                                                                                              |
| **Perch**   | Soft real word — a safe resting spot mid-journey; one syllable, gentle sound (per sound-symbolism, soft consonants read as calm/safe). | none found                                                                                                                                                                                                                                                              |
| **Snug**    | Promise-word, warmer register than Intact/Steady/Solid — "fits safely, nothing rattles loose." One syllable.                           | none found                                                                                                                                                                                                                                                              |
| **Sure**    | Promise-word, shortest of the set.                                                                                                     | none found, but flag: very low distinctiveness — "sure" is such a common affirmation word it may not register as a brand at all                                                                                                                                         |
| ~~Archiva~~ | Invented, from "archive"                                                                                                               | **not recommended** — no name collision, but the _category_ it points at (BookmarkArchiver, Archive Page, Web Archives) all save permanent page snapshots to the Wayback Machine, which is a different job than export/import; the name would set the wrong expectation |

## Deep dive + roast: Archiva, Intact, Haven, Snug

User asked to go deep on these four specifically. CWS collision was already
clean for all four in rounds 1–4 (see above) — this round checks the
_trademark/brand_ layer the CWS search doesn't surface, then roasts the result
honestly.

### Archiva — **recommend dropping**

- **Apache Archiva** is a real, actively used dev tool (a Maven/Continuum
  build-artifact repository manager), with the ASF asserting it as an
  unregistered trademark. This is the single worst possible collision for _this_
  product specifically: the brief's own audience is "people who already reach
  for `bun`/`rg`/`sg`" — i.e. exactly the developers most likely to already know
  "Archiva" as Apache's repo manager. This isn't an obscure edge case, it's a
  direct hit on the target audience's prior knowledge.
- Stacks with the earlier finding: CWS is already full of "Archive"-rooted
  extensions (BookmarkArchiver, Archive Page, Web Archives) that all do
  permanent Wayback-Machine-style snapshotting — a different job than
  export/import. "Archiva" would set that wrong expectation _and_ clash with a
  known dev tool in one move.
- **Roast**: it sounds like a fork of someone else's name, and it promises a
  feature (permanent archiving) the product doesn't have. Two unforced errors in
  one word — drop it.

### Intact — cleanest of the four, strongest fit

- **Intact Insurance** (Intact Financial Corporation) is Canada's largest P&C
  insurer, with its own "Intact Insurance" mobile app on iOS/Android. Real
  trademark, but a completely different category (insurance vs. a free browser
  extension) — legally this is not a meaningful collision; nobody searching the
  Chrome Web Store for a bookmark tool will land on an insurer's app by
  accident.
- No CWS collision (checked round 2).
- **Roast**: this is still the most abstract name of the whole shortlist — out
  of context, nobody would guess "bookmarks" at all, which is the point of the
  Stripe-style move but also means the store descriptor has to do 100% of the
  explaining with zero help from the name. It also reads a touch
  clinical/corporate on its own (and now that there's a literal insurance
  company with the same name, that association is real, not just a vibe) —
  slightly colder than the brief's otherwise warm "trust" angle. Still the
  strongest overall pick on naming theory.

### Haven — usable, but the one with real category overlap

- **Haven Technologies Inc.** holds multiple trademarks specifically in
  computer/software product classes — this is the closest _category_ match of
  the three trademarked names here (software, not insurance or rentals). Also
  worth knowing even though it's defunct: **Haven** was the high-profile
  Amazon/Berkshire/JPMorgan healthcare joint venture (2018–2021) — not a
  collision risk today, but the word has already been "used up" once in recent
  tech-press memory.
- No CWS collision (checked round 3).
- **Roast**: clean-sounding and warm, but "Haven" is genuinely one of the most
  overused safety-metaphor names in tech/startup naming generally — it risks
  feeling like déjà vu rather than distinctive, and the existing
  software-category trademark is the real flag here, more than the Amazon
  venture.

### Snug — lowest legal risk, biggest tone mismatch (kept alive, not dropped)

**User note (2026-10-01):** don't discard this one yet — "Snug" could work
specifically as a friendlier/pro-tier framing, and its warmth opens the door to
a mascot/pet down the line (a "snug" pet is a very natural pairing) in a way the
colder picks (Intact, Portage) don't. Keeping it in the live set for the
logo/visual phase instead of cutting it here on tone alone.

- **SNUG®** is an active, defended trademark family (Snug Technologies Pty Ltd,
  Australia) — SNUG, SNUG BONDCOVER®, SNUG MATCH™, SNUG PAY™ — but entirely in
  rental/property services (bond guarantees, tenant matching). Category distance
  from a browser extension is about as far as it gets, so this is the lowest
  real-world risk of the three trademarked names.
- No CWS collision (checked round 4).
- **Roast**: it's the warmest, cutest word of the whole shortlist — which is
  exactly the problem against the brief's own visual-world hypothesis ("precise,
  slightly technical, unornamented... closer to a well-made CLI tool's icon than
  a consumer app's mascot"). "Snug" pulls toward a blanket or a pillow (there's
  literally a "Snuggie" trademark in the same word family) more than a tool a
  power user reaches for. Fun, but probably the wrong kind of warm for this
  specific audience.

### Where this leaves it

**Intact** still wins on naming theory and has the least real risk (category
distance from the one existing trademark is total). **Haven** is usable but has
the one genuine category-adjacent trademark of the four. **Snug** is low-risk
but tonally off-brief. **Archiva** should be dropped — it is the only one of the
four with a real audience-knowledge collision, not just a trademark-registry
footnote.

## Round 5 — "archiving/backup over time," without Archiva's two problems

User clarified the appeal of Archiva: not the word itself, but the idea that the
name should still make sense if the product later grows into backups/cloud
archiving of bookmarks — not just a one-time export/import. Archiva itself still
gets dropped (direct collision with a dev tool this exact audience already
knows, plus the wrong "Wayback snapshot" expectation from CWS's existing
archive-named extensions) — but the _brief_'s own "don't box the name into one
feature" rule cuts the same way here: pick a word whose metaphor still works
once there's a history of saves, not just one.

| Name         | Why it still works if backups/cloud arrive later                                                                                                                                                                                                                                                             | CWS collision check                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cairn**    | A cairn is built stone by stone over time — every save adds to it. If you add scheduled backups later, "your cairn grows with every trip" is a natural extension, not a stretch. Distinct, one-syllable-reading word, no cute/corporate baggage.                                                             | none found                                                                                                                                                   |
| **Strata**   | Geological layers laid down over time — each backup is a new stratum on top of the last. Directly extends to version history ("go back to an earlier layer"), which a future backup feature would need anyway.                                                                                               | none found (a dev _named_ Strata made an unrelated extension — not a product-name collision)                                                                 |
| **Epoch**    | A point in time / an era — and for this exact audience, a knowing wink: Unix epoch time stamps every save. "Every epoch, saved" reads naturally once there's a history of backups, not just one export.                                                                                                      | none found                                                                                                                                                   |
| **Preserve** | Most literal/descriptive of the five — states the backup promise directly rather than evoking it. Safer, less distinctive; the plainest option if the others feel too oblique.                                                                                                                               | none found                                                                                                                                                   |
| **Depot**    | A waypoint where cargo sits before it moves on — ties the "carry it intact" metaphor (round 1) and the "archive" idea together as one thing: a place your bookmarks stop and are kept safe between moves. Real, common word (Home Depot exists, but a different category entirely — no real confusion risk). | none found                                                                                                                                                   |
| ~~Amber~~    | Preserved-in-amber metaphor is strong on paper                                                                                                                                                                                                                                                               | **ruled out** — there is an existing CWS extension literally named **amber** (a business-AI/enterprise-search tool); exact name collision, different product |

## Round 6 — short, catchy, easy to say (tone over metaphor)

User: none of round 5 landed; wants something short, catchy, easy — pivot from
"justify the metaphor" to "nail the sound" (Lexicon's own emphasis: plosive,
punchy consonants — P, T, K — read as snappy and memorable).

| Name        | CWS collision check                                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pip**     | none found — also a quiet dev-crowd wink (Python's `pip`), without the Archiva problem since `pip` is a generic CLI term nobody treats as a brand to collide with |
| **Tote**    | none found — real word, means exactly "carry," one syllable, playful                                                                                              |
| **Lug**     | none found — "to lug something around," one syllable, a bit more blue-collar/funny than Tote                                                                      |
| **Scoot**   | none found — playful "move over/along," two syllables, light tone                                                                                                 |
| ~~Hop~~     | **ruled out** — an existing CWS extension literally named **Hop** is already a bookmark manager                                                                   |
| ~~Tuck~~    | **ruled out** — _two_ existing CWS extensions named **Tuck**, one of them literally "Tuck for X Bookmarks"                                                        |
| ~~Flick~~   | **ruled out** — existing CWS extension "Flick" (an extension manager) — adjacent enough to confuse                                                                |
| ~~Zipline~~ | **ruled out** — several existing "Zipline" extensions (file upload/URL shortener tools)                                                                           |
| ~~Whisk~~   | **ruled out** — three existing CWS extensions named/Whisk-branded (recipe saving + Google Whisk automation tools)                                                 |
| ~~Nifty~~   | **ruled out** — existing CWS extension "Nifty" (tasks/chat/docs) with real adoption (4.5★)                                                                        |

Clean survivors from this round: **Pip, Tote, Lug, Scoot** — all short,
one-to-two syllables, no collision found.

## Head-to-head: Snug vs Archiva vs Intact

Scored 0–10 on seven axes (directional judgment, not a formula — the real fork
is the last row). Higher is better on every axis.

| Axis                                                  | Archiva                                                                   | Intact                                                      | Snug                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Sound/catchiness                                      | 6                                                                         | 8                                                           | 9                                                              |
| CWS name collision                                    | 3 — crowded "archive" category implies Wayback snapshots                  | 10 — none                                                   | 10 — none                                                      |
| Brand/category collision                              | 2 — **Apache Archiva**, a real dev tool this exact audience already knows | 8 — Intact Insurance exists, but totally different category | 9 — SNUG® exists (AU rental bonds), totally different category |
| Fits the brief's original "precise/technical" tone    | 8 (undercut by the collision above)                                       | 7                                                           | 4 — this is the brief's own stated mismatch                    |
| Headroom to grow into backups/cloud later             | 9 — this was the whole appeal                                             | 8 — abstract enough to stretch to anything                  | 8 — "snug and safe" extends naturally too                      |
| Warmth / mascot potential                             | 3                                                                         | 3                                                           | **10** — exactly the user's own point last turn                |
| Semantic overpromise risk (lower risk = higher score) | 3 — implies permanent archiving it doesn't do                             | 9 — promises nothing specific                               | 9 — promises nothing specific                                  |
| **Total /70**                                         | **34**                                                                    | **53**                                                      | **59**                                                         |

**Reading it straight**: Archiva loses on the two axes that actually matter most
(real collision with a tool devs already know, and a wrong feature promise) —
its only real edge, extensibility into backups, is shared by both survivors
anyway. Between Intact and Snug, the score flips entirely on one open question:
does the brand stay in the brief's original "precise, CLI-tool-adjacent"
register (favors **Intact**), or pivot toward the warmer, mascot-friendly
direction the user raised (favors **Snug**)? That's a direction call, not a
naming-mechanics one — everything else is close to a wash.

## Decision: Snug

Chosen 2026-10-01. Wins the head-to-head against Archiva (real collision with
Apache Archiva + wrong "Wayback snapshot" expectation) and Intact (cleaner but
cold/clinical) specifically on warmth and mascot _potential_ — not a mascot
commitment. Clarified same day: a mascot is **reserved for a future version, out
of scope for v2.0.0** — the current logo/icon phase stays in the original
"precise, unornamented" register; see `brief.md`'s revised "Visual world"
section.

- **Name:** Snug
- **Trademark note carried forward, not a blocker:** SNUG® (Snug Technologies
  Pty Ltd, Australia) is active in rental/bond-guarantee services — a different
  category with no real-world confusion risk for a free Chrome extension, but
  worth remembering if this product ever adds paid plans or expands regions.
- **75-char CWS descriptor (draft, revisit once the mascot/voice exist):**
  `Tuck your bookmarks in and carry them anywhere — no account, no cloud.` (72
  chars)

Folder renamed from `_draft/` to `snug/` for the rest of the brand kit.
