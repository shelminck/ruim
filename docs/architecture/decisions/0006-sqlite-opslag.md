# 0006 — sql.js/SQLite als lokale opslag, in plaats van rechtstreeks IndexedDB

**Status:** Aangenomen

## Context

ADR 0005 §2 (encryptie-at-rest) ging ervan uit dat de lokale data al een geserialiseerde SQLite-blob was ("via sql.js/absurd-sql in IndexedDB"), conform het oorspronkelijke hand-off-document. In werkelijkheid gebruikte de PWA rechtstreeks IndexedDB via de `idb`-library: vijftien losse object stores, elk met individuele records in leesbare vorm. Er was dus geen enkele blob om te versleutelen — die aanname in ADR 0005 klopte niet met de code.

Om het oorspronkelijke ontwerp (één versleutelbare blob) alsnog waar te maken, zijn er twee routes: (a) veldniveau-encryptie toevoegen bovenop de bestaande vijftien IndexedDB-stores, of (b) de opslag zelf vervangen door een in-memory SQLite-database (sql.js) die als één blob wordt geëxporteerd en weggeschreven. Er waren nog geen gebruikers, dus dataverlies tijdens de overstap was geen bezwaar — dat maakte optie (b) nu goedkoper dan later.

## Beslissing

### 1. sql.js vervangt IndexedDB als datamodel

Alle domeinrecords (accounts, transacties, potjes, regels, …) leven voortaan in een in-memory SQLite-database via `sql.js` (WASM), niet meer als losse IndexedDB-records. Gekozen boven `wa-sqlite`/OPFS-gebaseerde alternatieven omdat sql.js overal werkt zonder OPFS-vereiste (relevant voor oudere Safari/Android, zie ADR 0005's overwegingen bij WebAuthn PRF) en omdat de dataset op huishoud-schaal (honderden tot laag-duizenden transacties) een volledige her-export bij elke schrijfactie goedkoop maakt.

### 2. IndexedDB blijft bestaan, maar alleen als byte-opslag voor één blob

`sql.js` zelf persisteert niets — het is alleen een reken-engine in het geheugen. Na elke schrijfactie wordt de database geëxporteerd (`db.export()` → `Uint8Array`) en weggeschreven naar één vaste sleutel in een nieuwe, kleine IndexedDB-database (`ruim-sqlite`, store `blob`, sleutel `db`) — zie `app/lib/db/blob-store.ts`. Dit is bewust niet "IndexedDB weg", maar wel een fundamenteel andere rol: IndexedDB is nu een opaque byte-sink, geen datamodel meer. Dat is precies de vorm die ADR 0005 §2 nodig heeft: één blob om straks in AES-GCM te wrappen.

### 3. Compatibiliteitslaag houdt de dertig aanroepplekken ongemoeid

In plaats van alle vijftien `lib/db/*.ts`-modules en de negen pagina's die rechtstreeks `getDb()` aanriepen te herschrijven naar SQL, is er een generieke laag (`app/lib/db/sql-db.ts`) die dezelfde `idb`-achtige API nabootst: `get`/`getAll`/`put`/`delete`/`getAllFromIndex`/`getAllKeysFromIndex`/`transaction(...).objectStore(...).index(...)`. Elke store wordt een SQL-tabel met een `data`-kolom (JSON van het hele record) plus een paar losse kolommen voor wat er al aan indexen bestond (bijv. `byAccountSequence` als unieke samengestelde index op `transactions`). Dit hield de daadwerkelijke code-diff klein en het risico laag, terwijl de opslag-engine volledig verandert. Zie `app/lib/db/sql-store-config.ts` voor de kolom/index-definities per store.

### 4. Geen migratiepad vanaf de oude IndexedDB-stores

Conform de context: er waren nog geen gebruikers, dus geen backfill vanaf de oude fifteen-stores-opzet. Wie nog een browserprofiel met de oude `ruim`-IndexedDB-database heeft, verliest die data stilzwijgend (nooit gelezen door de nieuwe code) — geaccepteerd risico, expliciet met de gebruiker afgestemd vóór implementatie.

## Overwogen alternatieven

- **Veldniveau-encryptie op de bestaande IndexedDB-stores** — kleinere wijziging, maar laat de "vijftien plekken met leesbare financiële data" structuur intact en past minder natuurlijk bij het oorspronkelijke ADR 0005-ontwerp. Verworpen omdat de gebruiker expliciet koos voor de grotere, schonere herschrijving nu het nog goedkoop is (geen gebruikers).
- **wa-sqlite/officiële sqlite-wasm met OPFS** — betere doorvoer/duurzaamheid voor grote datasets via echte file-backed opslag, maar vereist OPFS (ontbreekt op oudere Safari) en een Worker voor de synchrone toegang. Niet nodig op deze schaal; verworpen ten gunste van de eenvoudigere sql.js in-memory-aanpak.
- **Alle dertig aanroepplekken direct naar SQL herschrijven** — "juister" op de lange termijn, maar een veel grotere, risicovollere wijziging in één keer. Verworpen ten gunste van de compatibiliteitslaag; een latere, geleidelijke migratie naar directe SQL-queries blijft mogelijk zonder dat aanroepplekken opnieuw moeten veranderen.

## Gevolgen

- ADR 0005 §2's aanname klopt nu: er is één blob (`ruim-sqlite`/`blob`/`db`) om in een volgende stap met AES-GCM te wrappen, met de DEK ontgrendeld via PIN/biometrie zoals daar beschreven.
- Nieuwe dependency: `sql.js` (~650 KB WASM, gecommit als statisch asset in `public/sql-wasm.wasm` en meegenomen in de PWA-precache voor offline gebruik) — afgestemd met de gebruiker in dezelfde sessie als deze beslissing.
- Lokale migratiestrategie voor het datamodel (bestaand backlog-item in `CLAUDE.md`) blijft open: het huidige schema wordt bij elke start onvoorwaardelijk aangemaakt (`CREATE TABLE IF NOT EXISTS`), zonder versienummer-gestuurde migraties. Dat is bewust simpel gehouden zolang er nog geen gebruikers zijn; een echte migratieroute is nodig zodra dat verandert.
- De write-queue in `sql-db.ts` serialiseert schrijfacties handmatig (sql.js heeft geen eigen concurrency-controle, in tegenstelling tot echte IndexedDB-transacties) — een nieuw stukje eigen code dat bij toekomstige wijzigingen aan de opslaglaag in gedachten moet worden gehouden.
