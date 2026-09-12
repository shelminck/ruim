# src/pwa

Nuxt PWA — UI en **alle domeinlogica** (Accounts, Categorization, Budgeting, Review, Planning), client-side in TypeScript.

Zie `CLAUDE.md` voor de architectuur en `docs/architecture/decisions/0001-lokaal-eerst.md` voor de reden dat de domeinlogica hier zit en niet in de .NET-projecten. Ontwerpreferentie: `docs/design/design_handoff_huishoudboekje_ruim/`.

## Ontwikkelen

```
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run typecheck
```

## Status (bouwstap 1 t/m 6 van 7 — zie design-handoff README, "Build order")

Gebouwd: app-shell (sidebar/header), design tokens, domeinmodellen, IndexedDB-laag
(v3, met versie-gestuurde migraties), MT940/.sta-parser met de-duplicatie op
volgnummer, envelope-CRUD met het merkteken en de waterval-berekening, de
nakijken-wachtrij met regels/bulk-toepassing/undo, inkomen/vaste lasten/
abonnementen, Vooruit (buffer/doelen/beleggen), Meevaller-verdeling, het
Minder-scenario, en Te doen. Elk scherm is end-to-end geverifieerd in de
browser (Playwright), niet alleen unit-getest.

Te doen leest taken live af uit alles hierboven (`lib/domain/tasks.ts`) —
niets wordt als taak opgeslagen, alleen het aan/uit-vinkje per taak-id
(`tasks`-store, hergebruikt van bouwstap 1 als losse toggle-state in plaats
van een losse Task-vorm).

**Bouwstap 7 (Labels)** is het laatste dat nog ontbreekt.

Overige schermen zijn placeholders ("komt in een latere bouwstap") zodat
navigatie niet vastloopt.
