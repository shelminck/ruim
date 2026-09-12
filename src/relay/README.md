# src/relay

.NET 10 sync-relay — dun en blind. Slaat alleen versleutelde blobs op voor optionele sync tussen apparaten binnen een gezin; kan de inhoud niet lezen.

Protocol- en crypto-ontwerp: zie `docs/architecture/decisions/0004-sync-relay-protocol.md`. Kernpunten:

- Alle versleuteling gebeurt client-side in de PWA. De relay ziet alleen opaque bytes.
- Data wordt gepartitioneerd per gezin opgeslagen (`config`, `transactions:{jaar}`, ...) als losse, versieerde snapshot-blobs — geen event-log, geen CRDT (dat blijft open backlog).
- Autorisatie via een write-token (uit het syncwachtwoord afgeleid subkey, buiten dit project om); de relay bewaart alleen een hash daarvan, nooit het token of het wachtwoord zelf.

## Endpoints

| Methode | Pad | Headers | Body |
|---|---|---|---|
| `PUT` | `/sync/{syncId}/{partition}` | `Authorization: Bearer {write-token}`, `X-Sync-Expected-Version: {n}` (optimistic concurrency; weglaten = verwacht dat de partitie nog niet bestaat) | ruwe versleutelde bytes |
| `GET` | `/sync/{syncId}/{partition}` | `Authorization: Bearer {write-token}` | — |

Response-header `X-Sync-Version` geeft bij elke respons de (nieuwe) versie terug. `PUT` geeft `409 Conflict` bij een verouderde `X-Sync-Expected-Version`, `401 Unauthorized` bij een verkeerd token.

## Opslag

SQLite (`Microsoft.Data.Sqlite`), één tabel `sync_blobs`. Pad instelbaar via configuratie-sleutel `Relay:DbPath` (env var: `Relay__DbPath`), standaard `sync.db` naast de executable.

## Draaien

```
dotnet run
```

## Tests

```
dotnet test Ruim.Relay.Tests
```

Dekt de kernlogica uit ADR 0004: versie-conflicten, token-autorisatie (schrijven én lezen), en partitie-isolatie — zowel op storage-niveau als via echte HTTP-requests.

## Nog te doen

- Docker Compose + Caddy-opzet voor de zelf-hosten-route (`docs/hosting/self-hosted.md`).
- Rate limiting / abuse-bescherming op de publieke endpoints.
- Aansluiten bij de managed hosting-opties (STACKIT/Azure/AWS, zie `docs/hosting/`).
