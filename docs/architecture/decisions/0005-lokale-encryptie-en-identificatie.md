# 0005 — Gezinslid-identificatie en lokale encryptie-at-rest

**Status:** Aangenomen

## Context

ADR 0003 liet één vraag open: is gezinslid-toewijzing puur informatief of ook autorisatie? Daarnaast staat de lokale data nu onversleuteld op schijf — een los, nog niet vastgelegd risico. Beide raken het datamodel en de security-grens, dus eerst dit ADR, conform de werkafspraken in `CLAUDE.md`. De beslissingen hieronder komen uit een losse ontwerpsessie (hand-off-document, niet in de repo) en worden hier vastgelegd als bron van waarheid.

**Correctie na implementatie:** deze paragraaf ging er oorspronkelijk van uit dat de lokale opslag al een geserialiseerde SQLite-blob was ("via sql.js/absurd-sql in IndexedDB"). Dat klopte niet — de PWA gebruikte rechtstreeks IndexedDB (vijftien losse object stores via de `idb`-library), zonder enige blob. ADR 0006 lost dit op door de opslag daadwerkelijk naar sql.js te migreren, zodat §2 hieronder nu wel op een bestaande blob kan bouwen.

## Beslissingen

### 1. Gezinslid wordt een entiteit, maar blijft zonder rechten

`Gezinslid { id, naam, avatarKleur }` vervangt de losse string uit het v1-ontwerp. Toewijzing is **puur informatief/personalisatie** — geen RBAC, geen per-persoon rechten. Dit beantwoordt de open vraag uit ADR 0003.

Profielkeuze is per apparaat, zonder wachtwoord: bij eerste gebruik kies je wie je bent uit de lijst, of maak je een nieuw gezinslid aan (ook voor wie geen eigen device heeft). `DeviceProfile.actiefGezinslidId` is lokaal en wordt niet gesynced.

**Belangrijk:** het gezinslid-profiel beschermt niets — de enige echte toegangsgrens blijft het sync-wachtwoord (ADR 0004). Dit onderscheid moet expliciet terugkomen in code-commentaar/documentatie om schijnveiligheid te voorkomen.

### 2. Encryptie-at-rest: DEK gewrapt door PIN (verplicht) en optioneel biometrie

Eén random data-encryptiesleutel (DEK) versleutelt de geserialiseerde SQLite-blob (zie ADR 0006) met XChaCha20-Poly1305, vlak vóór wegschrijven / na inlezen. De DEK leeft alleen in-memory tijdens een ontgrendelde sessie. Encryptie zit als losse laag om de blob heen, niet in de SQL-engine zelf (geen SQLCipher-aanpassing van sql.js nodig) — kleinere, beter te reviewen wijziging.

Twee manieren om dezelfde DEK te unwrappen:
- **PIN** (verplicht, primair mechanisme, geen fallback): PIN → Argon2id (hoge iteratiecount) → unwrapt de DEK.
- **Biometrie** (optioneel, aanvullend): WebAuthn PRF-extensie (of `largeBlob`) van een platform-authenticator → stabiel, hardware-gebonden geheim dat de DEK unwrapt.

PIN is niet optioneel als fallback omdat WebAuthn PRF niet overal ondersteund wordt (met name oudere Safari/Android-combinaties).

Bij app-start en na een time-out is de DB versleuteld; ontgrendelen is vereist. Foutieve PIN-pogingen krijgen exponentiële backoff.

Conform de crypto-regel in `CLAUDE.md` (nooit zelf bouwen, altijd een gevestigde libsodium-achtige library): `libsodium-wrappers-sumo` voor zowel de Argon2id-sleutelafleiding (`crypto_pwhash`) als de XChaCha20-Poly1305-versleuteling (`crypto_aead_xchacha20poly1305_ietf_encrypt`/`_decrypt`) — dezelfde onderliggende library als ADR 0004 al koos voor de sync-crypto, dus in de geest één afhankelijkheid in plaats van twee. De **sumo**-variant is bewust, niet de gewone `libsodium-wrappers`: die laatste is een grootte-geoptimaliseerde WASM-build die `crypto_pwhash` (Argon2id) volledig mist — pas tijdens implementatie ontdekt, zie ADR 0006-achtige les. Afgestemd met de gebruiker bij implementatiestap 2 (2026-09-13); dit verving de oorspronkelijke, voorlopige aanname van AES-GCM via Web Crypto + een apart Argon2id-package.

**Implementatiestap 4 (biometrie):** één WebAuthn platform-credential per toestel, aangemaakt met de `prf`-extensie. Of PRF daadwerkelijk werkt blijkt pas na een echte `create()`-aanroep (niet uit platform-authenticator-detectie vooraf), dus `setupBiometric()` faalt overal stil (retourneert `false`, gooit nooit) — de aanroepende UI valt terug op "je pincode werkt gewoon", conform §2's PIN-is-geen-fallback-optioneel-principe. De PRF-uitvoer zelf is geen valide XChaCha20-Poly1305-sleutel qua lengte/vorm, dus wordt hij eerst door `crypto_generichash` naar de juiste sleutellengte gehasht voor hetzelfde wrap/unwrap-mechanisme als de PIN. Attestation staat bewust op `'none'` — de tamper-heuristiek van §3 die attestation nodig heeft is stap 5, nog niet gebouwd.

### 3. Root-/tamper-signaal: heuristiek, geen garantie

Native root-detectie (SafetyNet/Play Integrity) is niet beschikbaar vanuit een PWA. In plaats daarvan een heuristiek:
- Hoofdsignaal: WebAuthn **attestation** bij het aanmaken van de credential.
- Aanvullend: afwijkingen in secure-context-APIs, Web Crypto hardware-backing, User-Agent Client Hints-inconsistenties.

Bij trigger: nooit blokkeren, wel een consent-modal tonen (niet-alarmistisch, één primaire actie, niet wegklikbaar zonder bevestiging, opnieuw getoond bij re-trigger na update). Akkoord wordt lokaal gelogd in `SecurityConsentLog { timestamp, heuristieken[], appVersie, toestelHash }`, optioneel mee-synced voor support. UI-taal: "kon niet worden geverifieerd", nooit stellig "geroot".

### 4. Zichtbaarheid: gelaagd, geen permanente badge

Geen badge in de globale navigatie (gewenningsrisico). Wel: volledige modal op het moment zelf, een rustige statusregel op de accountpagina (sectie Beveiliging), en korte contextuele notices op risico-relevante schermen (sync instellen, PIN wijzigen, toekomstige export).

### 5. Sessiegedrag: focus-lock + her-authenticatie vóór gevoelige acties

Page Visibility API vergrendelt direct bij focusverlies/scherm uit (niet pas na idle-timeout) — dit is de belangrijkste mitigatie voor het venster in §"Bekende beperkingen" hieronder. Idle-timeout als aanvulling.

Los van de algemene sessie-ontgrendeling: her-authenticatie (PIN/biometrie) vlak vóór gevoelige acties, ook als de sessie al ontgrendeld is. Minimaal: sync-wachtwoord tonen/wijzigen, toetredings-QR tonen, apparaat intrekken, PIN wijzigen, biometrie aan/uit, toekomstige export.

### 6. Accountpagina: drie gescheiden secties

Nieuw scherm met **Beveiliging** (status, PIN wijzigen, biometrie aan/uit), **Gezinsleden** (lijst, toevoegen/bewerken, geen rechten) en **Synchronisatie** (aan/uit, wachtwoord wijzigen, apparaat toevoegen, verbonden apparaten met intrekken-actie, geavanceerd/relay-endpoint uitklapper). Bewust gescheiden omdat ze verschillende dingen beschermen.

## Overwogen alternatieven

- **SQLCipher-achtige aanpassing van sql.js** — versleuteling dieper in de SQL-engine, maar grotere, moeilijker te reviewen wijziging voor hetzelfde resultaat. Verworpen ten gunste van een encryptielaag om de geserialiseerde blob.
- **Gezinslid-toewijzing met rechten (RBAC)** — sluit aan bij "wie mag bewerken" uit het v1-ontwerp, maar voegt complexiteit toe zonder duidelijke dreiging die het afdekt (dit is een gezinsapp, geen multi-tenant systeem). Verworpen; blijft puur informatief.
- **Permanente beveiligingsbadge in de navbar** — directer zichtbaar, maar risico dat gebruikers een altijd-aanwezige badge negeren. Verworpen ten gunste van gelaagde, contextuele zichtbaarheid.
- **Harde blokkade bij tamper-signaal** — sluit dichter aan bij "zero trust", maar het signaal is best-effort en niet waterdicht; een harde blokkade op een fout-positief sluit een legitieme gebruiker buiten zijn eigen data. Verworpen ten gunste van consent + doorgaan.

## Bekende beperkingen van het dreigingsmodel

Encryptie-at-rest en de tamper-heuristiek lossen niet op: malware die meeleest tijdens een ontgrendelde sessie, of overname van het toestel terwijl de app al open staat. Dit is **niet aan root gebonden** — de dominante techniek is misbruik van Android's Accessibility Service (legitieme API, misbruikt na een door de gebruiker toegestane permissie), naast fysieke overname van een ontgrendeld toestel, kwaadaardige toetsenbord-apps en schermopname via `MediaProjection`. Root vergroot de reikwijdte van wat malware kan, maar is geen voorwaarde. Er bestaat geen webstandaard-equivalent van Android's `FLAG_SECURE`; dit blijft een geaccepteerd restrisico van elke PWA-encryptieoplossing, native of niet. Focus-lock (§5) minimaliseert het tijdvenster, lost het niet op.

De root-/tamper-heuristiek (§3) is best effort: WebAuthn-attestation en de aanvullende signalen zijn indicatief, niet sluitend. Een aanvaller die de heuristiek kent kan proberen eromheen te werken.

## Open punt (nog te beslissen)

**Apparaat-intrekking vs. wachtwoordrotatie**: moet het intrekken van een apparaat-schrijftoken (bijv. verloren telefoon) automatisch ook het sync-wachtwoord forceren te roteren? Bij het gedeelde-wachtwoordmodel (ADR 0004) blijft het wachtwoord zelf bekend bij het verloren toestel totdat apart gewijzigd — alleen het token intrekken sluit het apparaat dus niet volledig buiten als iemand het wachtwoord nog kent. Bepaalt of "intrekken" een eenvoudige actie is of gekoppeld moet worden aan een geforceerde wachtwoordwijziging-flow. Blokkeert niet de start van implementatie (zie Gevolgen), wel de Synchronisatie-sectie van de accountpagina.

## Gevolgen

- ADR 0003 wordt met dit ADR afgerond gemarkeerd; de open vraag daar is beantwoord (§1 hierboven).
- Nieuwe dependency nodig voor Argon2id (Web Crypto dekt dit niet) — concrete package-keuze is een losse afstemming bij implementatiestap 2, niet dit ADR.
- Voorgestelde implementatievolgorde: (1) Gezinslid-entiteit + profielkeuze per device, (2) encryptie-at-rest + PIN-unlock, (3) ontgrendelscherm + onboarding, (4) WebAuthn PRF-biometrie, (5) tamper-heuristiek + consent-modal + `SecurityConsentLog`, (6) focus-lock + her-authenticatie-guard (parallel aan 5), (7) accountpagina (Beveiliging → Gezinsleden → Synchronisatie, laatste hangt af van het open punt hierboven).
- Backlog-item "Gezinslid-toewijzing: rechten?" kan vervallen; is beantwoord in §1.
