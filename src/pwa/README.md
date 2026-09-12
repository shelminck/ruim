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

## Status: alle 7 bouwstappen uit de design-handoff zijn gebouwd

App-shell (sidebar/header met live waarden), design tokens, domeinmodellen,
IndexedDB-laag (v3, met versie-gestuurde migraties), MT940/.sta-parser met
de-duplicatie op volgnummer, envelope-CRUD met het merkteken en de
waterval-berekening, de nakijken-wachtrij met regels/bulk-toepassing/undo,
inkomen/vaste lasten/abonnementen, Vooruit (buffer/doelen/beleggen),
Meevaller-verdeling, het Minder-scenario, Te doen, en Labels (inclusief een
generieke "wegdenken"-scenario — de auto-specifieke schuifknoppen uit de
fixture zijn bewust niet gebouwd, zie hieronder). Elk scherm is end-to-end
geverifieerd in de browser (Playwright), niet alleen unit-getest.

Te doen leest taken live af uit alles hierboven (`lib/domain/tasks.ts`) —
niets wordt als taak opgeslagen, alleen het aan/uit-vinkje per taak-id
(`tasks`-store, hergebruikt van bouwstap 1 als losse toggle-state in plaats
van een losse Task-vorm).

### Bewuste scope-keuzes tijdens het bouwen

- **Labels-scenario is generiek**, niet auto-specifiek. De fixture in de
  handoff toont een "Zonder auto 2"-scenario met twee schuifknoppen (rit-
  verdeling naar de andere auto, OV/deelauto-kosten) en een hardgecodeerde
  formule (`236 − extra − OV`). Dat is prototype-specifiek en generaliseert
  niet naar willekeurige labels (Huisdieren, Kinderen · school, ...). De
  gebouwde versie toont in plaats daarvan het label's echte gemiddelde
  maandbedrag als besparing, afgeleid uit eigen uitgavengeschiedenis.
- **"Gemiddeld per maand"** voor labels/potjes middelt over de daadwerkelijke
  maanden waarin transacties met dat label voorkomen (niet een vaste
  12-maands-fictie) — eerlijk bij weinig importgeschiedenis.
- Overig: zie eerdere bouwstap-notities in de git-historie van dit bestand
  voor waarom Meevaller/Minder pas na Vooruit kwamen, en waarom sommige
  fixture-constanten (buffer-inleg, "overig huishouden") als instelbare
  parameters zijn gemodelleerd in plaats van hardgecodeerd.

### Nog open (buiten de 19-schermen scope van dit handoff)

- Automatische maand-rollover (envelope carry-over toepassen bij "nieuwe
  maand") — nu alleen handmatig via het "Meegenomen"-veld op Potje-detail.
  Zie CLAUDE.md open backlog.
- PWA-installeerbaarheid (icons, offline-caching-strategie verfijnen).
