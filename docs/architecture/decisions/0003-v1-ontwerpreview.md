# 0003 — Aanvullingen uit v1-ontwerpreview

**Status:** Aangenomen, open vraag beantwoord in ADR 0005

## Context

Het v1-ontwerp (Claude Design wireframes/prototype) bevat een aantal functionele concepten die nog niet in de architectuur waren vastgelegd: subcategorieën onder een potje, automatische herkenning van terugkerende transacties, retroactieve regeltoepassing, een zichtbare confidence-score, gezinslid-toewijzing op transacties, en een "Vooruit"-scherm.

## Beslissingen

1. **Labels als tweede categorisatieniveau.** Naast een Potje (bijv. "Vaste lasten") krijgt een transactie optioneel een fijnmaziger Label (bijv. "Auto 2 · Beitrag"). Onderdeel van de Categorization-module.

2. **Terugkerende transacties + retroactieve regeltoepassing.** De Categorization-module herkent patronen over meerdere transacties heen en stelt een blijvende regel voor. Een nieuwe regel **toont altijd eerst een preview van de getroffen oude transacties en vereist expliciete bevestiging** voordat hij retroactief wordt toegepast — bewust gekozen boven automatisch toepassen, omdat een ongeziene bulkwijziging op financiële data een risico is dat de gebruiker zelf moet kunnen overzien.

3. **Confidence-score zichtbaar voor de gebruiker.** Niet alleen intern gebruikt om de uitvallijst te vullen, maar ook als percentage getoond (bijv. "87% zeker").

4. **Planning (Vooruit) als vijfde, losse domeinmodule.** Middellange termijn — buffer, spaarpotten, beleggen, inkomen — expliciet gescheiden van de korte-termijn potjes in Budgeting. Geen prognose/voorspelling, maar doelgerichte planning.

## Open vraag (beantwoord, zie ADR 0005)

**Gezinslid-toewijzing op transacties** (zoals "Mark" in het ontwerp): nog niet bepaald of dit puur informatief is, of ook gevolgen heeft voor rechten (bijv. alleen het toegewezen lid mag de transactie bewerken). Dit raakt mogelijk de nog openstaande CRDT-conflictresolutie (ADR 0001) — zie backlog.

**Antwoord (ADR 0005):** puur informatief/personalisatie, geen rechten. `Gezinslid` wordt een echte entiteit (`id`, `naam`, `avatarKleur`), profielkeuze is per apparaat zonder wachtwoord. De enige echte toegangsgrens blijft het sync-wachtwoord (ADR 0004).
