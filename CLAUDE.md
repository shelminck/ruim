# CLAUDE.md

Werkdocument voor Claude Code bij het bouwen van **ruim** — een lokaal-eerst huishoudboekje met potjes, automatische categorisatie en optionele versleutelde gezinssync.

**Hoofddoel:** ruim is geen boekhoudprogramma maar een **budgetcoach**. Het doel is niet "alles netjes registreren", maar structureel ruimte vrijmaken om vermogen op te bouwen (buffer, doelen, beleggen — zie Planning/Vooruit). Elke feature wordt hieraan getoetst: helpt dit de gebruiker actief richting meer financiële ruimte, of is het alleen administratie? Een AI-assistent die potjes categoriseert, indeelt en budgetsuggesties doet is expliciet **binnen scope** van dit hoofddoel — zie de MCP-server hieronder.

Dit bestand is de bron van waarheid over *waarom* dingen zo zijn opgezet. Houd het bij zodra een architectuurkeuze verandert — niet alleen code hoeft te kloppen, dit document ook.

## Kernprincipe

Alles draait primair lokaal, op het apparaat. Er is geen server nodig om de app te gebruiken. Twee losse, optionele uitbreidingen komen daar bovenop:
1. Versleutelde sync tussen apparaten binnen een gezin (end-to-end encrypted, relay ziet nooit leesbare data).
2. Een lokale MCP-server waarmee een AI-client (Claude) met de eigen data kan werken: bonnetjes-foto's verwerken, én — conform het hoofddoel — desgevraagd de nakijken-wachtrij categoriseren, potjes/labels indelen en budgetsuggesties doen. Dit blijft een expliciete, door de gebruiker gestarte stap (geen achtergrond-call vanuit de kernflow), zodat de PWA zelf zonder server en zonder netwerkafhankelijkheid blijft werken.

Zie `docs/architecture/architectuurplaat.html` voor het volledige systeemdiagram.

## Stack

| Onderdeel | Technologie | Rol |
|---|---|---|
| PWA | Nuxt | UI + **alle domeinlogica**, client-side TypeScript |
| Lokale opslag | SQLite / IndexedDB | Per apparaat, werkt volledig offline |
| Sync-relay | .NET 10 | Dun, blind — slaat alleen versleutelde blobs op |
| MCP-server | .NET 10 | Werkt op lokale/ontsleutelde data op hetzelfde toestel |

**Let op:** de domeinlogica (Accounts, Categorization, Budgeting, Review) leeft in `src/pwa/`, niet in de .NET-backend. Dat is een bewuste keuze — zie ADR 0001. De .NET-projecten zijn infrastructuur, geen domeinlaag.

## Domeinmodules

- **Accounts** — rekeningen, MT940-bestanden handmatig importeren en parsen.
- **Categorization** — regelgebaseerde matching (tegenrekening, omschrijving, bedrag) met confidence score, zichtbaar als percentage in de uitvallijst. Twee niveaus: Potje + optioneel fijnmaziger Label. Herkent terugkerende transacties en stelt een blijvende regel voor; retroactieve toepassing op oude transacties vereist altijd eerst een preview en expliciete bevestiging (nooit automatisch). Wordt verrijkt door bonnetje-regelitems via MCP. De regel-engine blijft de bron van waarheid in de PWA zelf (werkt altijd, ook offline); een AI-assistent via MCP is een optionele versneller bovenop dezelfde data, geen vervanging.
- **Budgeting** — potjes per rekening voor de korte termijn (maandelijkse uitgaven), budgetten per periode, berekend (niet opgeslagen) restbudget.
- **Review** — uitvallijst voor transacties onder de confidence-drempel, één-klik toewijzing.
- **Planning (Vooruit)** — middellange termijn: buffer, spaarpotten, beleggen, plus inkomensoverzicht. Losstaand van de korte-termijn potjes in Budgeting. Dit is waar het hoofddoel (vermogen opbouwen) concreet wordt. Toegevoegd na v1-ontwerpreview, zie ADR 0003.

## Sync & privacy

- Data wordt **op het apparaat versleuteld** vóór verzending. De relay slaat alleen versleutelde blobs op en kan de inhoud niet lezen (patroon geïnspireerd op Actual Budget).
- Eén gezinslid kiest een sync-wachtwoord bij het instellen; andere apparaten treden toe met datzelfde wachtwoord.
- De relay verwerkt nog wel metadata (accountbestaan, synctijdstippen, IP's in logs) — dat blijft AVG-relevant, ook al is de inhoud onleesbaar.
- Bonnetje-foto's lopen via een Claude-gesprek, **buiten** de sync-relay om. Alleen de geëxtraheerde structuurdata (winkel, bedrag, regelitems) wordt lokaal bewaard, niet de foto zelf.

## Hosting

Managed-first documentatiestructuur, zelf hosten is de geavanceerde route (zie `docs/hosting/`):
1. **STACKIT** — aanbevolen, data uitsluitend in Duitsland/Oostenrijk (EU-soeverein).
2. **Azure** — Container Apps + Blob Storage (voor relay/mcp-server, indien zelf gehost).
3. **AWS** — App Runner + S3.
4. **Zelf hosten** — Docker Compose, expliciet gelabeld als "gevorderd".

**Live PWA-deployment:** de PWA zelf (`src/pwa/`) draait als statische SPA op **Azure Static Web Apps**, automatisch gedeployed vanuit `main` via `.github/workflows/azure-static-web-apps-black-rock-05e7e8f03.yml`. Dit is los van de hosting-opties hierboven (die gaan over relay/mcp-server bij zelf hosten) — de PWA heeft immers geen server nodig en kan overal statisch staan.

## Licentie

**AGPL-3.0.** Iedereen mag het project gebruiken en zelfs hosten, maar wie het als dienst aanbiedt moet aanpassingen weer open source teruggeven. Bewuste keuze om te voorkomen dat een derde partij het project stilletjes herpakt als gesloten commercieel product — zie ADR 0002.

## Open backlog

- [ ] Aansprakelijkheidsdisclaimer ("gebruik op eigen risico") — README + eerste-gebruik-scherm in de app. Moet ook expliciet benoemen dat AI (Claude, via de MCP-server) als assistent kan optreden bij categorisatie/budgetsuggesties — de gebruiker moet zich daarvan bewust zijn, niet aannemen dat elke suggestie puur regelgebaseerd/deterministisch is.
- [ ] Matching-logica bonnetje ↔ bestaande transactie bij afwijkend bedrag (fooien, afronding, deelbetalingen).
- [ ] Lokale migratiestrategie voor het datamodel (versienummer + migratiescripts bij nieuwe PWA-versie).
- [ ] CRDT-conflictresolutie voor gelijktijdige offline wijzigingen op meerdere apparaten.
- [ ] Apparaat-intrekking vs. wachtwoordrotatie (ADR 0005): moet intrekken van een apparaat-schrijftoken automatisch het sync-wachtwoord forceren te roteren? Anders blijft een verloren toestel het wachtwoord "kennen" ook na intrekking van het token.
- [ ] MCP-tool(s) voor AI-ondersteunde categorisatie/budgetsuggesties: de nakijken-wachtrij (of onduidelijke potjes-indeling) voorleggen aan Claude en voorgestelde regels/budgetten laten terugschrijven — met dezelfde preview-en-bevestig-eis als retroactieve regels (nooit stilzwijgend toepassen).

## Mapstructuur

```
docs/           architectuur, ADR's, hosting-quickstarts, backlog
src/pwa/        Nuxt PWA + domeinlogica (TypeScript)
src/relay/      .NET 10 sync-relay
src/mcp-server/ .NET 10 MCP server
```

## Conventies

- Domeinlogica: TypeScript, in `src/pwa/`. Geen dubbele implementatie in .NET.
- Belangrijke architectuurkeuzes: vastleggen als ADR in `docs/architecture/decisions/`, niet alleen hier samenvatten.
- Geen telemetrie/analytics standaard aan.

## Werkafspraken met Claude Code

- Compact het contextvenster zodra eerdere conversatie-historie niet meer nodig is om verder te bouwen — bijv. na het afronden van een feature of module, voordat aan de volgende wordt begonnen. Dit bestand, ADR's en de code zelf zijn de bron van waarheid, niet de gespreksgeschiedenis.
- Taalconventie: documentatie en ADR's in het Nederlands, code/identifiers/commit messages in het Engels.
- Crypto nooit zelf bouwen: voor de e2e-sync altijd een gevetterde library (libsodium-achtig), geen eigen encryptie-primitieven. Bij twijfel over het crypto-ontwerp eerst afstemmen vóór implementatie — de impact van een fout hier is groot.
- ADR vóór implementatie, niet erna: bij keuzes die het datamodel, syncprotocol, security-grens of licentie raken, eerst een ADR-voorstel maken en pas daarna coderen.
- Testbaarheid van geldlogica: categorisatie- en budgetberekeningen (potjes, confidence scores) krijgen unit tests voordat een module als "klaar" geldt.
- Destructieve DB-acties (schema-migraties, resets van lokale SQLite/IndexedDB) nooit automatisch uitvoeren, ook niet lokaal — altijd expliciete bevestiging.
- Nieuwe dependencies afstemmen met de gebruiker, vooral bij telemetrie, een afwijkende licentie, of iets dat de "dun & blind" relay-filosofie doorbreekt.
- Geen secrets/sleutels in logs of repo: het sync-wachtwoord en afgeleide sleutels nooit persisteren buiten de daarvoor bedoelde versleutelde opslag.
- AI-transparantie: overal waar een suggestie/actie van de AI-assistent (via MCP) een resultaat beïnvloedt — categorisatie, budgetadvies, bonnetje-koppeling — moet voor de gebruiker duidelijk zijn dat dit van AI komt, niet van de deterministische regel-engine. Nooit AI-suggesties tonen alsof het een gewone regel-match is.

### Huidige projectfase

**Trunk-based development (sinds 2026-09-12).** `main` deployt automatisch naar Azure Static Web Apps (`.github/workflows/azure-static-web-apps-black-rock-05e7e8f03.yml`) — directe pushes op `main` zijn daarom niet meer gepast, dat was alleen zolang er geen echte pipeline aan hing. Nieuwe werkwijze:
- Elke wijziging via een kortlevende feature branch → PR naar `main`.
- Claude merget zelf bij twijfel-loze, veilige wijzigingen (bugfixes, kleine features, tests). Bij twijfel — of bij iets risicovols zoals schema-migraties, CI/CD-pipelineconfiguratie of nieuwe dependencies — eerst expliciet aan de gebruiker vragen vóór het mergen.
- Geen lang-levende branches: snel mergen, klein houden. Dat is het "trunk-based" deel — `main` blijft altijd deploybaar.

(Voorheen, tijdens de allereerste opzet zonder pipeline, werd er nog direct op `main` gepusht — dat gold alleen voor die periode.)
