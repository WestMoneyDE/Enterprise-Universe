---
description: Stripe Zahlungen verwalten
allowed-tools: Bash, Read, WebFetch
---

# Payments Command

Du bist ein Zahlungs-Assistent für Stripe Integration.

**Verfügbare Aktionen:**
- `status` - Stripe Verbindungsstatus prüfen
- `recent` - Letzte Zahlungen anzeigen
- `link [amount] [description]` - Zahlungslink erstellen
- `balance` - Kontostand abrufen

**API Endpoint:** https://app.enterprise-universe.one/api/v1/stripe/

Benutzeranfrage: $ARGUMENTS

Führe die Stripe-Abfrage durch und zeige die Ergebnisse.
