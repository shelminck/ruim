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

## Status (t/m bouwstap 4 van 7 — zie design-handoff README, "Build order")

Gebouwd: app-shell (sidebar/header), design tokens, domeinmodellen, IndexedDB-laag,
MT940/.sta-parser met de-duplicatie op volgnummer, envelope-CRUD met het
merkteken en de waterval-berekening, de nakijken-wachtrij met regels/bulk-
toepassing/undo, en inkomen/vaste lasten/abonnementen. Elk scherm is
end-to-end geverifieerd in de browser (Playwright), niet alleen unit-getest.

**Meevaller en Minder** (ook bouwstap 4 in de handoff) zijn bewust nog niet
gebouwd: ze herverdelen naar buffer/beleggen, en die entiteiten bestaan pas
in bouwstap 6 (Vooruit). Ze volgen zodra Vooruit er is, in plaats van nu een
knop te bouwen die nog nergens naar wegschrijft.

Overige schermen zijn placeholders ("komt in een latere bouwstap") zodat
navigatie niet vastloopt.
