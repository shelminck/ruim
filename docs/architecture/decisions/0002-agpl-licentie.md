# 0002 — AGPL-3.0 als licentie

**Status:** Aangenomen

## Context

Het project wordt open source. De auteur vindt het prima als het project groot wordt en veel mensen het gebruiken, maar wil voorkomen dat een derde partij het project zonder iets terug te doen commercieel exploiteert (bijv. als gesloten SaaS-product).

## Overwogen alternatieven

- **MIT / Apache-2.0** — volledig permissief, biedt geen enkele bescherming tegen het scenario dat de auteur wil vermijden.
- **PolyForm Shield / Business Source License** — source-available licenties die concurrerend commercieel gebruik expliciet verbieden. Sterkere bescherming, maar geen OSI-erkende open source status, wat de drempel voor bijdragers verhoogt en soms principieel gemeden wordt.

## Beslissing

**AGPL-3.0.** Iedereen mag het project gebruiken, wijzigen en zelfs hosten — maar wie het als netwerkdienst aanbiedt, moet zijn aanpassingen weer open source teruggeven (dit dicht de "SaaS-maas" die gewone GPL openlaat).

## Gevolgen

- Volwaardige, OSI-erkende open source status: brede acceptatie, lagere drempel voor bijdragers, geen argwaan van ontwikkelaars die niet-OSI-licenties mijden.
- Biedt geen garantie dat niemand er geld mee verdient — het garandeert alleen dat aanpassingen open blijven. Wie hier bewust voor kiest, accepteert dat als voldoende bescherming tegenover de voordelen van "echte" open source.
- Een latere overstap naar een restrictievere licentie (zoals HashiCorp met Terraform deed) riskeert een community-fork; deze keuze is bedoeld om dat scenario te vermijden.
