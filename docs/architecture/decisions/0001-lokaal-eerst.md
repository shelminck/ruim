# 0001 — Lokaal-eerst architectuur

**Status:** Aangenomen

## Context

De oorspronkelijke opzet plaatste de domeinlogica (DDD/Clean Architecture) in een .NET 10 backend, met de Nuxt PWA als dunne UI-laag. Dat vereist dat elke gebruiker die met een gezinslid wil delen, zelf een server host — een drempel die voor de gemiddelde gebruiker te hoog ligt, en een vorm van risico introduceert (verkeerd geconfigureerde hosting van financiële data).

## Beslissing

De domeinlogica (Accounts, Categorization, Budgeting, Review) draait **client-side in TypeScript**, binnen de Nuxt PWA. Lokale opslag (SQLite/IndexedDB) is de bron van waarheid per apparaat; de app werkt volledig zonder server.

Voor gezinnen die willen delen tussen apparaten is er een **optionele, end-to-end versleutelde sync-relay** (.NET 10): data wordt op het apparaat versleuteld vóór verzending, de relay ziet en bewaart alleen versleutelde blobs. Patroon geïnspireerd op Actual Budget.

## Gevolgen

- De .NET 10-projecten (`src/relay`, `src/mcp-server`) zijn infrastructuur, geen domeinlaag. Geen dubbele implementatie van domeinlogica in twee talen.
- Een sync-relay die omvalt of data verliest, kost geen data — elk apparaat heeft zijn eigen complete kopie.
- Vereist een **CRDT-conflictresolutiestrategie** voor gelijktijdige offline wijzigingen op meerdere apparaten (open backlog-item).
- Vereist een **eigen lokale migratiestrategie** voor het datamodel, los van hoe de relay geüpdatet wordt (open backlog-item).
- De relay verwerkt nog wel metadata (accountbestaan, synctijdstippen, IP's) — dat blijft AVG-relevant, ook al is de transactie-inhoud onleesbaar.
