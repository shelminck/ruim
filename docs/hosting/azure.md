# Quickstart: Azure

> TODO — uit te schrijven zodra `src/relay` bestaat.

Voorziene opzet:
- **Rekencomponent:** Azure Container Apps, Consumption plan (schaalt naar nul, vaak binnen gratis maandelijkse quota)
- **Objectopslag:** Azure Blob Storage, voor de versleutelde blobs
- **PWA-hosting (los van de relay):** Azure Static Web Apps
- **Infra-as-code:** Bicep-template met "Deploy to Azure"-knop

Let op: zet `minReplicas` expliciet op 0, anders loop je een vaste maandelijkse rekening op voor idle compute.

## Structuur (in te vullen)

1. Vereisten
2. Deploy-stappen (Bicep / portaal)
3. Omgevingsvariabelen instellen
4. HTTPS/domein koppelen
5. Eerste apparaat verbinden
