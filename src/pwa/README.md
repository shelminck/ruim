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

## Status (bouwstap 1 van 7 — zie design-handoff README, "Build order")

Gebouwd: app-shell (sidebar/header), design tokens, domeinmodellen, IndexedDB-laag,
MT940/.sta-parser met de-duplicatie op volgnummer, regel-matching, en het
importeren-scherm end-to-end. Overige schermen zijn placeholders ("komt in een
latere bouwstap") zodat navigatie niet vastloopt.
