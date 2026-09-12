# Beveiligingsbeleid

Ruim verwerkt financiële gegevens (banktransacties, bonnetjes). We nemen meldingen over kwetsbaarheden serieus.

## Een kwetsbaarheid melden

Meld een kwetsbaarheid **niet** via een publiek GitHub issue. Open in plaats daarvan een [private security advisory](../../security/advisories/new) op deze repository, of neem contact op met de maintainer.

Vermeld waar mogelijk:
- Een beschrijving van de kwetsbaarheid en de potentiële impact.
- Stappen om te reproduceren.
- Betrokken versie/commit.

We proberen binnen een redelijke termijn te reageren en houden je op de hoogte van de voortgang richting een fix.

## Scope

Relevante aandachtsgebieden gezien de architectuur:
- **Sync-relay** (`src/relay/`) — moet blind blijven voor de inhoud van versleutelde blobs; elke bug die dat doorbreekt is kritiek.
- **Encryptie van sync-data** — sleutelafleiding, versleuteling vóór verzending op het apparaat.
- **MCP-server** (`src/mcp-server/`) — lokale toegang tot ontsleutelde financiële data.
- **PWA lokale opslag** — SQLite/IndexedDB op het apparaat.

## Geen garanties

Dit project wordt aangeboden zoals het is (zie `LICENSE` en `README.md`). Gebruik, en zeker zelf hosten, is voor eigen risico.
