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

## Status (bouwstap 1, 2, 3, 4 en 6 van 7 — zie design-handoff README, "Build order")

Gebouwd: app-shell (sidebar/header), design tokens, domeinmodellen, IndexedDB-laag
(v3, met versie-gestuurde migraties), MT940/.sta-parser met de-duplicatie op
volgnummer, envelope-CRUD met het merkteken en de waterval-berekening, de
nakijken-wachtrij met regels/bulk-toepassing/undo, inkomen/vaste lasten/
abonnementen, en Vooruit (buffer/doelen/beleggen). Meevaller-verdeling en de
Minder-scenario (inkomensdaling met dekkingsopties) zijn ook klaar — ze
leunen op de maand-overlay in `monthlyAdjustments` (eenmalige effecten zoals
"erbij op je vrij te besteden" of "krimp je potjes deze maand"). Elk scherm
is end-to-end geverifieerd in de browser (Playwright), niet alleen
unit-getest.

**Bouwstap 5 (Te doen)** is nog niet gebouwd: taken worden afgeleid uit alles
hierboven (potjes, inkomen, buffer, doelen, beleggen), dus die bouw ik nu de
losse stukken bestaan. **Bouwstap 7 (Labels)** ontbreekt ook nog.

Overige schermen zijn placeholders ("komt in een latere bouwstap") zodat
navigatie niet vastloopt.
