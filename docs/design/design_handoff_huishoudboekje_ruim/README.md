# Handoff: Ruim — huishoudboekje (PWA)

## Overview

Ruim is a household budgeting app for a shared Dutch household ("Sanne & Mark"). It has **no bank connection**: transactions arrive through a manual MT940/`.sta` import, and every transfer between payment and savings accounts has to be executed by the user in their own bank. The design leans into that constraint rather than hiding it — a "Te doen" (to-do) list tells the user exactly what to transfer or arrange, and the app never pretends a balance changed until an import confirms it.

The core promise: one number on the home screen — **"je kunt nog uitgeven"** (what's left to spend) — that is honestly derived from base income minus fixed costs, savings, envelope budgets and other household spending, and that visibly moves when the user changes any assumption.

Two prototypes are in this bundle:

- **Desktop** (`Prototype Ruim Desktop.dc.html`) — the primary and most complete reference: fixed sidebar + two-column content, 19 screens.
- **Mobile** (`Prototype Ruim.dc.html`) — the same product and the same logic as a phone layout (bottom tab bar, single column, stacked cards). It does **not** yet contain the "Te doen" screen or the merkteken (status mark); those are desktop-only additions and should be carried over.

Language: **all UI copy is Dutch**. Keep it. Currency formatting is `nl-NL` (`€ 1.234`, comma as decimal separator, thousands dot).

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes that show intended look and behavior. They are not production code to copy directly. They use a small in-house runtime (`support.js`, `<x-dc>`, `<sc-for>`, `<sc-if>`, `{{ }}` holes) that exists only to make the prototypes previewable; **do not port that runtime**.

The task is to **recreate these designs in the target codebase's existing environment** — React, Vue, Svelte, SwiftUI, whatever is already there — using its established routing, state, component and styling patterns. If no environment exists yet: this is intended as an installable **PWA** (offline-capable, file import from the device, no backend required for the core loop), so a React + Vite + TypeScript PWA with local persistence (IndexedDB) is a sensible default.

All layout in the prototypes is written as **inline styles**. That is a constraint of the prototyping runtime, not a recommendation — convert to the codebase's styling approach (CSS modules, Tailwind mapped to the tokens below, styled-components, etc.).

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, copy and interaction states are final-intent and should be recreated closely. Two caveats:

- The data is **fixture data** — plausible but invented. Real numbers come from the user's own imports and settings.
- Chart visuals (income bars, investment bars, progress bars) are hand-built divs in the prototype. Recreate the *look*; use a real chart approach if the codebase has one.

## Build this first — decisions already made

You should not need to ask anything to start. Where the design did not dictate an answer, these are the calls:

**Stack** — React + TypeScript + Vite, installed as a PWA (`vite-plugin-pwa`, offline-capable). No backend. If the target codebase already exists, its stack wins over this paragraph.

**Persistence** — IndexedDB (via `idb`), one local database per household. Nothing leaves the device. No accounts, no sync in v1.

**Routing** — real routes so the PWA is linkable and the hardware back button works: `/nu`, `/alles`, `/nakijken`, `/te-doen`, `/potjes`, `/potjes/:id`, `/vaste-lasten`, `/abonnementen`, `/labels`, `/labels/:id`, `/labels/:id/scenario`, `/importeren`, `/inkomen`, `/inkomen/meevaller`, `/inkomen/minder`, `/inkomen/waterval`, `/vooruit`, `/vooruit/doel/:id`, `/vooruit/beleggen`.

**Language** — Dutch only, `nl-NL` formatting. Do not add an i18n layer in v1; do not translate the copy.

**Month model** — one active month (calendar month). Envelope budgets, carried-over rest and the to-do list are per month. "Nieuwe maand · lijst terugzetten" rolls over: apply each envelope's rollover policy, reset the task checkboxes, keep the rules.

**Layout breakpoints** — sidebar + two columns at ≥1100px; single column with a bottom tab bar below that (see the mobile prototype). The desktop prototype's `min-width: 1320px` is a prototyping guard, not a product requirement — make the real desktop layout fluid from 1100px up.

**Build order** (each step is usable on its own):

1. **Data + import.** The model below, IndexedDB, and a real MT940/`.sta` parser with de-duplication on sequence number. Screen: MT940 importeren.
2. **Envelopes + home.** Envelope CRUD, budgets, rollover policies, the merkteken, the hero number, the waterfall. Screens: Nu, Potjes, Potje, Waterval.
3. **Review + rules.** The queue, envelope/label assignment, rules with retroactive application **and undo**, and the bulk action. Screens: Nakijken, Alles.
4. **Income + fixed costs.** Sources in/out of the base, windfall allocation, the income-drop scenario, fixed costs and subscriptions. Screens: Inkomen, Meevaller, Minder, Vaste lasten, Abonnementen.
5. **Te doen.** Tasks derived from everything above, with per-month checked/dismissed state.
6. **Vooruit.** Buffer, goals, investing. Screens: Vooruit, Doel, Beleggen.
7. **Labels.** Cross-envelope labels and the "wegdenken" scenario. Screens: Labels, Label, Scenario.

**Out of scope for v1** — bank connections (PSD2), multi-currency, multi-household, shared/cloud sync, notifications, budget forecasting beyond the designed scenarios, and any income-source type not in the fixtures.

**Definition of done for the core loop** — a user can import a `.sta` file, resolve the review queue with rules, see a free-to-spend figure that changes when they cancel a subscription or move a slider, and get a Te doen list of the transfers that figure implies. Everything in the screenshots renders at the documented colors, type and radii.

**Two things not to "fix"**

- Checking off a task must **not** change any balance. Only an import moves money. This is the product's integrity promise.
- Investing shows deposits, never market value, in every budgeting calculation. Market gain appears once, as information, on the Beleggen screen.

## Design Tokens

The prototypes consume the **Organic** design system (bundled in `_ds/organic-…/styles.css`). Take values from those CSS variables rather than hard-coding. The app adds four of its own tokens for the navy "trust" layer, which Organic does not provide.

### App-level tokens (declared in the prototype's `<style>`)

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#2c3a54` | navy — hero panel background, primary buttons, active nav item, "safe/ruim" status |
| `--ink-deep` | `#1c2536` | navy pressed/hover, heading text on light blue |
| `--soft` | `#dde2ec` | light blue panel fill (coach card, summary panels, hover) |
| `--card` | `#fffdf9` | card surface (slightly warmer/lighter than the cream ground) |
| *(literal)* | `#cfd9ea` | nav hover blue — used only in the sidebar hover state |
| *(literal)* | `#c9d2e2` | pressed state of `--soft` panels |

### Organic tokens used

Ground and text: `--color-bg` `#f5ead8`, `--color-text` `#201e1d`.

Neutral ramp: 100 `#f9f4ed` · 200 `#eee7db` · 300 `#dcd3c4` · 400 `#c0b6a5` · 500 `#a19786` · 600 `#82796a` · 700 `#645c50` · 800 `#474238` · 900 `#2e2b25`.

Accent (terracotta) ramp: 100 `#fff2eb` · 200 `#ffe1d0` · 300 `#ffc6a5` · 400 `#f6a06b` · 500/base `#c67139` (`--color-accent`; ramp step 500 is `#d67f48`) · 600 `#b2622d` · 700 `#8c491a` · 800 `#643312` · 900 `#402310`.

Typography: `--font-heading` **Caprasimo** (display, all numbers-as-headline and section titles), `--font-body` **Figtree** (everything else). Icons: **Lucide**, stroke-width **2.75**.

Elevation: `--shadow-sm` `0 1px 2px rgba(46,43,37,.14)`, `--shadow-md` `0 3px 10px rgba(46,43,37,.16)`, `--shadow-lg` `0 12px 32px rgba(46,43,37,.22)`.

### Radii actually used (the system's `--radius-*` is over-ridden upward — this app is very round)

`999px` pills (nav items, buttons, chips, badges, progress bars, all circles) · `36px` hero panel · `30px` large panels · `26–28px` cards · `24px` inline callouts · `22px` list rows · `20px` checkbox-style callouts · `8px` small checkbox squares · `6px` checkbox inner.

### Typographic scale in use

| Role | Font | Size | Notes |
| --- | --- | --- | --- |
| Hero amount | heading | `clamp(56px, 6.4vw, 86px)` | line-height .92, `white-space: nowrap`, white |
| Screen title | heading | 32px | line-height 1.1 |
| Big panel figure | heading | 40–52px | line-height 1 |
| Card figure | heading | 20–28px | |
| Panel title | heading | 17–20px | |
| Body | body | 13.5–15.5px | |
| Meta / sub | body | 11.5–13px | `--color-neutral-700` |
| Overline | body | 10.5–11px | `letter-spacing .09–.1em`, uppercase, `--color-neutral-600` |

### Spacing

Sidebar width **274px**, padding `28px 20px 24px`, item gap 4px. Main padding `30px 42px 64px`, section gap 26px. Column gap 24px (22px on some screens). Card padding 20–26px, hero 38px 40px. Desktop shell has **`min-width: 1320px`** — below that the page scrolls horizontally rather than collapsing the two-column grids.

## The merkteken (status mark) — the signature element

A circle with an off-centre inner circle punched out of it, pinned toward the bottom-right. The **ring thickness encodes how the month is going**, and the same mark repeats at three sizes so it reads as a brand device, not a chart.

| Stand | Trigger (spent ÷ budget incl. carried-over rest) | Disc color | Inner size | Inset (right & bottom) |
| --- | --- | --- | --- | --- |
| `ruim` (comfortable) | ≤ 75% | `--ink` | 54% | 9% |
| `krap` (tight) | > 75% and < 100% | `--color-accent` | 36% | 15% |
| `op` (spent) | ≥ 100% | `--color-accent-900` | 18% | 20% |

Implementation: outer `span`, `border-radius: 999px`, `display: block`, `overflow: hidden`; inner `span` absolutely positioned with `right`/`bottom` set to the inset and the disc-cutout colored to match the surface behind it (`--color-bg` on the cream ground and inside the hero, `--card` on white cards). `display: block` on the outer element is required — `overflow: hidden` does not clip on an inline element.

Sizes: **88px** in the hero (with `box-shadow: 0 0 0 1.5px rgba(255,255,255,.45)` so it reads on navy), **30px** on envelope cards, **26px** in the envelope list, **34px** in the legend.

The month-level mark aggregates all envelopes (total spent ÷ total budget). Each envelope carries its own mark. The "Potjes" screen shows a legend of all three stands, where the current stand is at full opacity and the others drop to `0.42`.

> Known open item: in the hero the disc is `--ink` on an `--ink` panel, so only the ring reads. Consider a cream disc with a navy cutout there.

## Screens / Views

Navigation is a single `screen` value; every screen is one view in the same shell (sidebar + header + content). `vorige` records the previous screen for a back affordance.

### Shell

**Sidebar** (274px, `--card` background, `--shadow-sm`): brand row (34px navy circle with "R", then "Ruim" in Caprasimo 22px) → 5 primary nav items → "INSTELLEN" overline + 4 secondary items → spacer → household card (`--soft`, 24px radius, two overlapping 32px avatars with `1.5px solid --color-text` borders and `-10px` overlap, "Sanne & Mark / gedeeld huishouden").

Primary nav: **Nu** (home icon), **Alles** (list icon), **Nakijken** (check-circle, badge = review queue length), **Te doen** (list-check, badge = open task count), **Potjes** (piggy-bank), **Vooruit** (trending-up). Secondary nav shows a live value on the right: **Vaste lasten** (total), **Inkomen** (base), **Labels** (count), **MT940 importeren**.

Nav item: `display:flex; gap:12px; padding:11px 14px; border-radius:999px`.
- default: transparent, `--color-text`
- **active**: `--ink` background, white text
- **hover (including on the active item)**: `#cfd9ea` background, `--ink-deep` text
- badge: `--color-accent` pill, white, 11px, `padding:4px 7px`, `min-width:22px`, `flex:none`, caps at **"99+"**

Secondary nav item active state is `--soft` background with `--ink-deep` text; hover `--soft`.

**Header**: screen title (heading 32px) + subtitle (13.5px, neutral-700) on the left; on the right three pills — "september 2026" and "Vandaag € 50,75" (both `1.5px solid --color-neutral-300`) and a clickable accent pill showing "N na te kijken" (`1.5px solid --color-accent`, `--color-accent-100` fill, `--color-accent-700` text, hover `--color-accent-200`) that routes to Nakijken.

Each screen supplies its own title/subtitle pair — see the table at the end.

### 1. Nu (home)

> Screenshot: `screenshots/01-nu-home.png`

Two columns, `minmax(0,1.3fr) minmax(0,1fr)`.

Left column:
- **Hero panel** — `--ink`, 36px radius, `38px 40px`. Row: 88px merkteken, then a stack: "je kunt nog uitgeven · {stand}" (14.5px, `rgba(255,255,255,.82)`, the stand word in solid white), the amount (heading, clamp 56–86px, white), and "{€X per dag tot 30 september} · {explanation of the stand}". Right: an outlined ghost pill "Waar komt dit vandaan ›" (`inset 0 0 0 1.5px rgba(255,255,255,.55)`, hover `rgba(255,255,255,.12)`) → Waterval.
- **Coach card** (dismissible) — `--soft`, 30px radius. Text: "Je houdt dit ritme al drie weken vol en ligt € 40 voor. Zal ik dat naar je buffer schuiven?" Buttons: "Doen" (navy fill, Caprasimo 14px — adds €40 to the buffer) and "Liever niet" (navy outline). Both dismiss the card.
- **Meevaller card** (windfall, shown only when income above base is unallocated) — `--soft` with a `1.5px solid --ink` border, hover `#c9d2e2`: "€X meevaller / boven je basis · nog niet verdeeld" with a `›`.
- **Stat cards** — `repeat(auto-fit, minmax(180px,1fr))`, 26px radius, `--card`, `--shadow-sm`, hover `--shadow-md`. Four: Vaste lasten, Sparen & beleggen, Basisinkomen, Labels. Each: overline label, heading 24px figure, 12px sub. All route to their detail screen.

Right column:
- **Potjes card** — title row with "alles ›"; then one row per envelope: 26px merkteken, name + remaining amount (accent-700 when overspent, otherwise `--ink-deep`), and an 8px progress bar (`--color-neutral-200` track; fill `--ink` under 65%, `--color-accent` above, `--color-text` when overspent).
- **Te doen card** — title + badge showing "N open", one line of summary, top **3** tasks, then "+ N meer in Te doen ›".
- **Nakijken card** — `--soft`; queue preview (name, guessed envelope, confidence) and a navy full-width button "N nakijken · begin bij {merchant}".

### 2. Alles (transactions)

> Screenshot: `screenshots/02-alles-transacties.png`

Filter chips: **Alles / Geen potje / Groot** (>€50). Active chip: `--color-accent-100` fill, `--color-accent` ring, `--color-accent-800` text; inactive: white with `--color-neutral-400` ring. Below, a `--card` list: merchant (15px) over meta (12px, "date · envelope · person"), amount right-aligned; income is shown `+ € …` in `--ink`. Rows divided by `1px solid --color-neutral-200`.

### 3. Nakijken (review queue) — the heart of the app

> Screenshot: `screenshots/03-nakijken-review.png`

Two columns `1.4fr / 1fr`. Purpose: give every unassigned transaction an envelope, and **lay a rule underneath it** so the same merchant never has to be judged again.

- **Progress bar**: up to **12** segments, filled proportionally to `(total − remaining) / total` — do not use one segment per item (it breaks at 100 items).
- **Current item card**: merchant (18px) + meta, amount (heading 34px) right. A confidence line: 8px accent dot + "Ruim gokt op {envelope} · {N}% zeker".
- **Potje** chips (max 4, guess first) and optional **Label** chips (`◈` prefix; label chips use the navy/`--soft` treatment, envelope chips the accent treatment).
- **Rule checkbox** — 20px radius callout, accent ring + `--color-accent-100` fill when on: "Voortaan zo, ook terugwerkend" + the concrete consequence, e.g. `"SHELL" → Vervoer + Auto 2 · raakt 26 oude transacties`.
- Actions: "Overslaan" (navy outline) + "Bevestigen · volgende" (navy fill, flex:1).
- **Bulk action** (visible only when the rule is on and the rule text names a count): accent callout "⚡ Deze én 26 vergelijkbare in één keer" + "zelfde tegenrekening en omschrijving · je kunt het later terugdraaien". Confirms the item and credits the count to a running total.
- Right panel: "In de rij · N over" with the queue, a `--soft` confirmation strip "✓ N oude transacties meegenomen via je regels" once bulk has been used, and a footnote.
- Empty state: `--soft` panel, "Klaar ✓ / Alles heeft een potje. Niets meer te doen." plus a reset affordance.

**Known gap to solve in implementation:** at 100 items this is still one-at-a-time. The rule + bulk action is the intended answer; consider grouping the queue by merchant so the user resolves a merchant, not a transaction.

### 4. Te doen (tasks) — the manual-transfer list

> Screenshot: `screenshots/04-te-doen-taken.png`

Two columns `1.5fr / 1fr`. This is the screen that exists *because* there is no bank connection.

Tasks are **derived from the plan, never stored as a separate to-do database**. Sources:

*Group "Overboeken" (transfers)* — buffer top-up (€250, 26th), goal deposit (goal amount, 26th), investment deposit (27th), windfall-to-buffer and windfall-to-investing (one-off, only after the user allocated a windfall), "voorsprong wegzetten" (one-off, after accepting the coach suggestion), and a **reverse** transfer "Uit de buffer halen" when income is low (rendered with a `--soft` fill and `--ink` ring to mark direction).

*Group "Regelen" (arrange)* — one task per cancelled subscription ("Netflix opzeggen", with the monthly saving as a negative amount), "Automatische inleg beleggen verlagen" when investing is paused, and "N transacties nakijken" which routes into the review screen instead of being checked off.

Each group has a collapsible header: `▾`/`▸`, group name (heading 17px), "3 van 5 open" (12px neutral-600), and for Overboeken the open total on the right.

Task row: 22px radius, `1.5px` ring, 24px checkbox (8px radius, `--color-accent-700` + white `✓` when done) → name / `van → naar` route line with account names / timing line → amount (heading 20px) → a pill button ("Gedaan" / "Ongedaan" / "Openen") → `✕` to dismiss. Done rows: `--color-neutral-100` fill, `opacity .5`, `line-through` on name and amount.

Right column: navy panel with "nog over te boeken" + the open total (heading 46px) + "N open · vink af wat je hebt gedaan"; an accent tip card ("Zet de vaste overboekingen één keer als periodieke opdracht in je bank. Dan blijven hier alleen de eenmalige dingen staan."); a "Nieuwe maand · lijst terugzetten" outline button; and the key disclaimer: **"Afvinken verandert je saldo niet — Ruim gelooft je pas als de transactie in je import staat."**

**Known gap:** at 100 tasks, the groups help but you will want date grouping ("deze week") and pagination.

### 5. Potjes (envelopes) + 6. Potje (detail)

> Screenshot: `screenshots/05-potjes-overzicht.png` · `screenshots/06-potje-detail.png`

**Potjes**: navy summary panel ("samen nog in je potjes" + total + how many envelopes are in the red), then a card grid (`repeat(auto-fill, minmax(310px,1fr))`) — each card: 30px merkteken + name + remaining (heading 20px), a 10px progress bar, and a footer row (`incl. € X meegenomen` / `€ X van € Y`, plus "nog te besteden" / "te veel besteed"). Plus a `--soft` "Vooruit" tile showing total net worth. Then the merkteken legend card, then the footnote: *"Een potje is geen rekening — het is een afspraak met jezelf over deze maand."*

**Potje detail**: left `--soft` panel with the arithmetic (budget per month, carried over from last month, spent, divider, **nog te besteden** as heading 28px accent-700). Right: **rollover choice** (radio list, 17px rows, selected row gets `--color-accent-100` and a 5px accent ring on the dot):
1. "Schuift door naar volgende maand · max. 1 maand meenemen"
2. "Valt weg, elke maand schoon · strakker, maar straft een zuinige maand af"
3. "Rest gaat naar spaarpotje Vakantie · geld verdwijnt niet, maar is niet meer vrij"

Footnote: *"Een tekort schuift altijd door — anders verdampt overbesteding stilletjes."*

Fixture envelopes (`budget / carried over / spent`): Boodschappen 300/42/216 · Vervoer 150/0/53 · Uit eten 120/0/132 (**overspent** — shows the `op` mark) · Abonnementen 78/0/69 · Kleding 100/15/20.

### 7. Vaste lasten + 8. Abonnementen

> Screenshot: `screenshots/07-vaste-lasten.png` · `screenshots/08-abonnementen.png`

**Vaste lasten**: left `--soft` panel — "gaat er elke maand vanaf" + total (heading 46px, accent-700) + yearly total and % of base income, plus an accent callout "3 wijzigingen deze maand / energie +€ 18, Netflix +€ 2, sportschool gestopt". Right: grouped list — Wonen €980, Energie & water €242, Verzekeringen €196, Abonnementen (live total, routes to Abonnementen), Bankkosten €16.

**Abonnementen**: card grid, tap to toggle cancelled. Cancelled: neutral fill, `opacity .55`, meta becomes "opgezegd · bespaart €X". One item (Disney+) is flagged with an accent ring and "12 mnd betaald · geen gebruik gezien". Cancelling here **creates a "Regelen" task** on Te doen — that link is the point.

### 9. Labels + 10. Label detail + 11. Scenario

> Screenshot: `screenshots/09-labels-overzicht.png` · `screenshots/10-label-detail.png` · `screenshots/11-scenario-wegdenken.png`

Labels cut **across** envelopes: what does a thing really cost? Fixtures: Auto 2 · Berlingo €274, Auto 1 · Polo €252, Huisdieren €71, Kinderen · school €97, Vakantie Frankrijk '26 (one-off €1.940).

**Label detail**: left `--soft` panel with the monthly average (heading 46px), the yearly figure, and an accent CTA "Wegdenken: wat blijft er over?". Right: a horizontal bar breakdown by envelope (120px label column, 10px accent bar, right-aligned amount).

**Scenario ("Zonder auto 2")**: left — a card with the three deltas (falls away −€236/mnd, extra on car 1, public transport & car-sharing) and a `--soft` panel with the **net saving** (heading 44px) and the yearly figure, noting the sale proceeds are excluded. Right — two sliders: share of trips moved to the other car (0–100%, ×€0.63) and PT/car-share per month (€0–120). Net = 236 − extra − PT.

### 12. MT940 importeren

> Screenshot: `screenshots/12-mt940-import.png`

Left: a dashed accent drop zone (30px radius, `52px 24px`, hover `--color-accent-100`) with a `↧`, "Kies je .sta-bestand", "of sleep het hierheen". After reading: "ING_20260918.sta gelezen ✓ / 62 regels · 01–18 sep · NL21 INGB ···45 67".

Right (after reading): a result list — Regels gevonden 62 · Al bekend (dubbel) 18 (neutral) · Automatisch in een potje 32 (`--ink`) · Naar nakijken 12 (accent-700) — and a navy button "44 toevoegen · 12 nakijken" → Nakijken. Footnote: *"Bestand blijft op je apparaat. Dubbelen worden herkend op volgnummer."*

Implementation: real MT940 parsing, de-duplication on sequence number, and **local-only** processing (no upload).

### 13. Inkomen + 14. Meevaller + 15. Minder + 16. Waterval

> Screenshot: `screenshots/13-inkomen.png` · `screenshots/14-meevaller-verdelen.png` · `screenshots/15-minder-inkomen.png` · `screenshots/16-waterval.png`

**Inkomen**: `--soft` panel "je plan draait op" + base (heading 50px) + "per maand · alles daarboven is meevaller". A 12-month bar chart (140px tall, bars `border-radius: 999px 999px 5px 5px`, current month in accent, others neutral-300) with a **dashed navy base line** positioned at the base-income height. Then source cards — tap to include/exclude a source from the base; excluded sources get an accent ring and `--color-accent-100` fill and read "niet in basis". Fixtures: Salaris Jesse €2.650, Salaris Sam €1.180, Kinderbijslag €89, Toeslagen €181, Freelance Sam €620 (**excluded by default** — it is variable, so it becomes windfall).

Right column: explanation, a link to the Waterval, the windfall card, and a card "Wat als je inkomen daalt?" → Minder.

**Meevaller (windfall allocation)**: two sliders — "Buffer aanvullen" (% of the windfall, with live consequence "buffer 3,2 → 3,4 maanden lasten") and "Extra beleggen" (capped so the two never exceed 100%). The remainder lands on "Erbij op je vrij te besteden · eenmalig, alleen deze maand". A checkbox "Elke meevaller zo verdelen / dan hoef je dit nooit meer te beslissen" changes the button to "Zo doen · en voortaan automatisch". Applying routes to Vooruit and **creates the matching transfer tasks**.

**Minder (income drop)**: left panel "je plan is te duur geworden met − € 340 / basis € 4.100 → € 3.760". Right: three coverage options, each with its consequence — "Potjes krimpen €200 / boodschappen −80 · uitjes −80 · kleding −40", "Beleggen pauzeren €300 / buffer en vakantiedoel lopen door, beleggen staat stil", "Uit de buffer €340 / buffer houdt dit N maanden vol". A live "Nog te dekken €X" strip; the apply button stays **disabled** (neutral-200 fill, neutral-700 text) until the gap is fully covered, then reads "Plan bijstellen vanaf oktober". Applying switches the whole app into the low-income state and routes to the Waterval.

**Waterval**: the month's order of operations as a vertical cascade, max-width 760px. Row 1 is base income (`1.5px solid --color-text`, `--soft`). Subsequent steps are indented 40px: Vaste lasten, Sparen & beleggen, Potjes, Overig huishouden, plus "Uit de buffer" (a **plus**) when a buffer withdrawal is active. Steps that changed are highlighted with an `--ink` ring and `--soft` fill; each row is clickable to its detail screen. Ends in a `--soft` panel "Vrij te besteden" + the hero number (heading 40px, accent-700), then: *"Dit is het getal op je startscherm. Zeg een abonnement op of verhoog je inleg en het schuift meteen mee."*

### 17. Vooruit + 18. Doel + 19. Beleggen

> Screenshot: `screenshots/17-vooruit.png` · `screenshots/18-doel-detail.png` · `screenshots/19-beleggen.png`

**Vooruit** presents a deliberate priority order, numbered 1-2-3 with 24px navy numerals:
1. **Buffer** — progress toward 6 months of fixed+envelope costs, navy bar, "3,4 van de 6 maanden lasten · € 250 per maand".
2. **Doelen** (goals with a date) — accent bar. Fixtures: Vakantie Italië €1.180/€2.400; Keuken €2.900/€9.000 with "3 maanden geen inleg · doel schuift op" in accent-700.
3. **Beleggen** — direction without an end date, no progress bar (deliberately).

Footnote: *"De buffer gaat voor. Doelen schuiven op in een krappe maand; beleggen blijft staan."*

**Doel detail**: saldo (heading 38px), 13px progress bar, amount to go; a settings list (Staat op — Spaarrekening · NL··8842; Overboeking — automatisch · 26e; Pauzeren bij te weinig inkomen — toggleable "aan ✓"/"uit"); and a `--soft` panel with a monthly-deposit slider (€50–300, step 10) that live-computes "klaar in {month} {year} · nog N inlegmaanden" **and** the resulting free-to-spend figure.

**Beleggen**: deposits since 2022 (heading 40px), today's value and gain, and a 12-month deposit bar chart where one month is zero ("april overgeslagen"). A dashed accent note carries the philosophy: *"We volgen je inleg, niet de koers. Koerswinst is geen geld om mee te budgetteren — en telt niet mee in je buffer."* Then: fixed deposit €300 (27th) and the amount that came from windfalls.

## Interactions & Behavior

- **Navigation**: single-screen state, no routes in the prototype. In implementation use real routes (`/nu`, `/nakijken`, `/te-doen`, `/potjes/:id`, …) so the PWA is linkable and the back button works. Keep `vorige` semantics for the in-app back affordance.
- **Everything is live.** Changing an income source, cancelling a subscription, shrinking envelopes, moving a slider — all of it recomputes the hero number, the waterfall, the sidebar values, the merkteken and the task list in the same frame. No "save" step. This is the product's main demonstration; preserve it.
- **Hover states**: cards lift `--shadow-sm` → `--shadow-md`; list rows drop to `opacity .75`; navy buttons darken to `--ink-deep`; accent callouts go `--color-accent-100` → `--color-accent-200`; nav items go `#cfd9ea` (including when active).
- **Focus**: Organic specifies `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`. The prototype uses clickable `div`s — **in implementation use real `button`/`a` elements** so this works, and give every row a proper accessible name.
- **Sliders**: native `input[type=range]` with `accent-color: var(--color-accent)`, height 22px.
- **Transitions**: none in the prototype. If you add them, keep them short (120–180ms) and on background/shadow only; the layout should not animate.
- **Responsive**: the desktop shell pins `min-width: 1320px` and scrolls horizontally below that; the phone layout is a separate design (see the mobile prototype). Decide the real breakpoint strategy in implementation — the natural split is sidebar+two-column above ~1100px, single column with a bottom tab bar below.
- **Empty / loading / error states**: only the review empty state and the pre-import state are designed. Still needed: first-run (no import yet, no envelopes), a parse failure for a malformed `.sta` file, and an "import contains no new transactions" case.

## State Management

The prototype holds everything in one component state object. Grouped by concern:

**Income** — `bronnen: Record<sourceId, boolean>` (counts toward base), `inkomenLaag: boolean` (the low-income scenario).

**Windfall** — `deelBuffer: number` (%), `deelBeleg: number` (%), `vasteVerdeling: boolean` (make the split permanent), `meevallerVerwerkt: boolean`, and the applied results `extraBuffer`, `extraBeleg`, `extraVrij`.

**Coverage of an income drop** — `dekking: {potjes, pauze, buffer}: boolean`.

**Envelopes** — `rollover: Record<envelopeId, 0|1|2>`, `potjeId` (detail selection).

**Review** — `queue: Transaction[]`, `qi` (index), `gekozenPotje`, `gekozenLabel`, `regelAan: boolean` (create a rule), `bulkVerwerkt: number` (historic transactions swept by rules).

**Tasks** — `takenGedaan: Record<taskId, boolean>`, `takenVerborgen: Record<taskId, boolean>`, `groepDicht: Record<groupName, boolean>`.

**Other** — `screen`, `vorige`, `txFilter`, `opgezegd: Record<subscriptionId, boolean>`, `rit`/`ov` (scenario sliders), `inleg` (goal deposit), `pauzeBijKrap`, `coachGedaan`, `importGelezen`.

### Derived values (recompute on every change — do not store)

```
binnen        = Σ all income sources
basis         = Σ income sources where bronnen[id]
meevaller     = max(0, binnen − basis)
aboTotaal     = Σ subscriptions where !opgezegd[id]
vasteLasten   = 1434 + aboTotaal
gat           = inkomenLaag ? 340 : 0
                → covered in order: potjesKrimp (≤200) → pauzeBedrag (≤300) → bufferOpname (≤340)
belegInleg    = 300 − pauzeBedrag
sparen        = 250 + inleg + belegInleg
potjesBudget  = Σ envelope budgets − potjesKrimp
vrij          = basis − vasteLasten − sparen − potjesBudget − 728 (overig)
                + bufferOpname + extraVrij
lastenMnd     = vasteLasten + potjesBudget
bufferSaldo   = 7400 + extraBuffer
bufferDoel    = 6 × lastenMnd
tasks         = derived from the above (see Te doen)
```

**Data model for a real implementation** (the prototype has no persistence): `Account`, `Transaction` (with `importBatchId` and bank sequence number for de-duplication), `Envelope` (budget, rollover policy, carried-over amount), `Rule` (match pattern → envelope + label, with an `appliedRetroactively` flag so it can be undone), `Label`, `IncomeSource` (`countsTowardBase: boolean`), `Goal`, `FixedCost`/`Subscription`, and `Task` (better derived than stored — but persist the checked/dismissed state per month). Persist locally (IndexedDB); the app is designed to work with no server.

## Assets

No images, photos or custom illustrations. Everything is CSS shapes and type.

**Icons** are inline Lucide paths at stroke-width 2.75, 20×20, `currentColor`: home (Nu), list (Alles), check-circle (Nakijken), list-check (Te doen), piggy-bank (Potjes), trending-up (Vooruit). Use the real Lucide package in implementation.

**Glyphs used as content**, not icons: `›` (drill-in), `▾`/`▸` (group collapse), `✓` (checked), `✕` (dismiss), `◈` (label prefix), `↧` (import), `⚡` (bulk action), `−` (negative amounts, U+2212 minus — not a hyphen).

**Fonts**: Caprasimo and Figtree, loaded by the Organic stylesheet. Self-host them in production.


## Screenshots

`screenshots/` holds one capture per screen of the desktop prototype, in the order documented above. They are the visual acceptance reference — captured at browser zoom below 100%, so read measurements from this README rather than from the pixels.

| File | Screen |
| --- | --- |
| `01-nu-home.png` | Nu (home) |
| `02-alles-transacties.png` | Alles (all transactions) |
| `03-nakijken-review.png` | Nakijken (review queue) |
| `04-te-doen-taken.png` | Te doen (manual transfers & tasks) |
| `05-potjes-overzicht.png` | Potjes (envelopes) |
| `06-potje-detail.png` | Potje detail + rollover policy |
| `07-vaste-lasten.png` | Vaste lasten |
| `08-abonnementen.png` | Abonnementen |
| `09-labels-overzicht.png` | Labels |
| `10-label-detail.png` | Label detail |
| `11-scenario-wegdenken.png` | Scenario "Zonder auto 2" |
| `12-mt940-import.png` | MT940 import (after reading a file) |
| `13-inkomen.png` | Inkomen |
| `14-meevaller-verdelen.png` | Meevaller (windfall allocation) |
| `15-minder-inkomen.png` | Minder (income drop) |
| `16-waterval.png` | Waterval (where the base goes) |
| `17-vooruit.png` | Vooruit (buffer, goals, investing) |
| `18-doel-detail.png` | Doel detail |
| `19-beleggen.png` | Beleggen |

## Files

| File | What it is |
| --- | --- |
| `Prototype Ruim Desktop.dc.html` | **Primary reference.** Desktop, all 19 screens, the merkteken and the Te doen list. |
| `Prototype Ruim.dc.html` | Mobile layout of the same product (no Te doen screen, no merkteken yet). |
| `support.js` | Prototyping runtime only — **do not port.** Needed to open the HTML files locally. |
| `_ds/organic-…/styles.css` | The Organic design system token sheet + component layer. The source of truth for colors, type, spacing, radii and shadows. |
| `_ds/organic-…/readme.md` | The design system's own usage guide (direction, do's and don'ts). |
| `_ds/organic-…/_ds_bundle.js` | The design system's component bundle as used by the prototypes. |
| `screenshots/` | 19 captures, one per screen — see the table above. |

To view: open either `.dc.html` in a browser from the bundle root (the relative `_ds/` and `support.js` paths must resolve).

## Implementation notes worth reading before you start

1. **The honesty rule is a feature, not an oversight.** Checking off a transfer must not change any balance. Balances only move when an import confirms them. Several design decisions (the Te doen disclaimer, "we volgen je inleg, niet de koers") exist to protect this.
2. **Rules are the scaling mechanism.** Manual review does not survive real volume; the rule-plus-bulk-apply path is what makes it tractable. Build rules and retroactive application early, with undo.
3. **Copy is designed.** The Dutch microcopy carries the product's tone (calm, second-person, concrete consequences instead of warnings). Do not rewrite or machine-translate it.
4. **Consequences, always.** Every control in the design shows what it costs in the same view — a slider shows the resulting date, a coverage option shows what shrinks. Keep that pairing when you build new controls.
