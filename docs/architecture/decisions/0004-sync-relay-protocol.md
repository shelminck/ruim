# 0004 — Sync-relay protocol en crypto-ontwerp

**Status:** Aangenomen

## Context

ADR 0001 legde vast dát er een dunne, blinde sync-relay komt, maar niet hóe: welk protocol, welk data-model, en hoe de relay een gezin autoriseert zonder ooit het syncwachtwoord te zien. Dit raakt zowel het syncprotocol als de security-grens, dus volgens de werkafspraken in `CLAUDE.md` eerst een ADR, en het crypto-ontwerp expliciet afstemmen vóór implementatie.

## Beslissing

### 1. Crypto blijft client-side, in de PWA — nooit zelfgebouwd

Alle versleuteling gebeurt in `src/pwa/` met een gevestigde libsodium-achtige library (bv. `libsodium-wrappers`, WASM-binding). De relay (.NET) doet zelf geen crypto en ziet nooit het syncwachtwoord, de encryptiesleutel, of leesbare data — alleen opaque bytes.

### 2. Sleutelafleiding: drie gescheiden subkeys uit één wachtwoord

Uit het syncwachtwoord + een per-gezin salt leidt de client via Argon2id een mastersleutel af, en daaruit via HKDF drie gescheiden subkeys met domeinscheiding:

1. **sync-ID** — niet geheim, dient als lookup-sleutel bij de relay (vergelijkbaar met een gebruikersnaam).
2. **write-token** — bewijst schrijfautorisatie richting de relay. De relay bewaart alleen een hash hiervan (zie §4), nooit het token zelf.
3. **encryptiesleutel** — versleutelt/ontsleutelt de blobs. Verlaat het apparaat nooit.

Domeinscheiding voorkomt dat het lekken van één subkey (bv. het write-token, dat de relay tijdelijk in transit ziet) de andere twee compromitteert.

De salt en de verspreiding daarvan tussen gezinsapparaten (pairing-flow, bv. via een deelbare code/QR) is een aparte, nog uit te werken UX-vraag in de PWA — dit ADR gaat over het relay-protocol zelf en is daar niet van afhankelijk.

### 3. Data-model: gepartitioneerde snapshot-blobs, geen event-log

Per gezin (sync-ID) meerdere onafhankelijk versieerde snapshot-blobs, niet één:

- `config` — rekeningen, potjes-definities, regels. Verandert zelden, blijft klein.
- `transactions:{jaar}` — transacties per kalenderjaar. Alleen het lopende jaar wijzigt vaak; afgesloten jaren blijven ongemoeid tenzij met terugwerkende kracht iets verandert.

Elke partitie wordt bij een wijziging in zijn geheel overschreven (geen append-only log, geen CRDT — dat blijft een open backlog-item). Partitionering bestaat uitsluitend om te voorkomen dat één kleine wijziging (bv. één transactie categoriseren) de volledige meerjarige historie opnieuw laat serialiseren, versleutelen en uploaden.

### 4. Autorisatie: trust-on-first-use met token-hash, per partitie versieerd

- Eerste schrijfactie voor een sync-ID/partitie: relay registreert `hash(write-token)` en zet versie op 1.
- Volgende schrijfacties: relay verifieert dat `hash(write-token)` overeenkomt; body bevat de verwachte huidige versie (optimistic concurrency). Bij mismatch → `409 Conflict`, geen automatische merge — de client toont het conflict of probeert opnieuw na een lokale refresh.
- Leesacties vereisen hetzelfde write-token als bearer-credential. De blobs zijn weliswaar versleuteld, maar het bestaan/de omvang/timestamp van een partitie is metadata die volgens ADR 0001 al AVG-relevant is — geen reden om lezen ongeauthenticeerd te laten.
- Sync-ID is hoog-entropie (afgeleid via Argon2id uit wachtwoord + salt), dus TOFU-registratie is hier acceptabel: een aanvaller kan een sync-ID niet raden om "eerste schrijver" te worden.

### 5. Opslag: SQLite

Eén tabel `sync_blobs (sync_id, partition_key, version, token_hash, blob, updated_at)`. Past bij "dun & blind", bij de self-hosted docker-compose route (`docs/hosting/self-hosted.md`), en is triviaal te migreren naar een andere backend later zonder het protocol te raken.

## Overwogen alternatieven

- **Append-only event-log in plaats van snapshot-blobs** — toekomstbestendiger richting CRDT, maar voegt nu complexiteit toe (compactie, opschonen) voor een conflictresolutie-probleem dat bewust nog niet is opgelost.
- **Eén ongepartitioneerde blob per gezin** — eenvoudigst, maar elke kleine wijziging synct dan de volledige historie opnieuw.
- **Sync-ID dubbelt als auth-token** (geen apart write-token) — minder implementatiewerk, maar wie de sync-ID kent (bv. via serverlogs) kan ook schrijven. Verworpen omdat de subkey-scheiding met HKDF nauwelijks extra complexiteit kost.

## Gevolgen

- De relay is een klein aantal minimal-API endpoints (`PUT`/`GET` op `/sync/{syncId}/{partition}`) plus SQLite — geen ORM, geen zware dependency nodig.
- CRDT-conflictresolutie (backlog) kan later los van dit protocol worden toegevoegd; het versienummer per partitie is daar al een bruikbare basis voor.
- De salt-distributie/pairing-UX in de PWA is een apart te plannen stuk werk, niet gedekt door dit ADR.
- Metadata (sync-ID, timestamps, IP's in relay-logs) blijft AVG-relevant, zoals al genoemd in ADR 0001.
