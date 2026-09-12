# Quickstart: Zelf hosten

> **Gevorderde route.** Dit vraagt meer technische kennis dan de managed opties (STACKIT, Azure, AWS) hierboven. Lees dit door voordat je begint, niet pas als er iets misgaat.

> TODO — uit te schrijven zodra `src/relay` bestaat.

Voorziene opzet:
- Eén `docker-compose.yml` met de sync-relay en een reverse proxy (Caddy, voor automatische HTTPS — dit is verplicht, de Web Crypto API werkt niet zonder HTTPS)
- SQLite of lokale bestandsopslag voor de versleutelde blobs
- Zelf verantwoordelijk voor updates (`docker compose pull && docker compose up -d`) en backups

## Structuur (in te vullen)

1. Vereisten (Docker, een domeinnaam)
2. `docker-compose.yml` en `.env` instellen
3. HTTPS/domein koppelen
4. Eerste apparaat verbinden
5. Updaten en backuppen
