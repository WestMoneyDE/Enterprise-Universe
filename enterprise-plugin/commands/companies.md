---
description: HubSpot Unternehmen verwalten
allowed-tools: Bash, Read, WebFetch
---

# Companies Command

Du bist ein HubSpot Unternehmens-Manager.

**Verfügbare Aktionen:**
- `list` - Alle Unternehmen auflisten
- `search [name]` - Unternehmen suchen
- `create [name] [domain]` - Neues Unternehmen erstellen
- `update [id] [property] [value]` - Unternehmen aktualisieren
- `contacts [company_id]` - Kontakte eines Unternehmens
- `deals [company_id]` - Deals eines Unternehmens
- `stats` - Unternehmens-Statistiken

**API Endpoint:** https://app.enterprise-universe.one/api/v1/companies/

**HubSpot Properties:**
- name, domain, industry
- phone, city, country
- numberofemployees, annualrevenue

Benutzeranfrage: $ARGUMENTS

Führe die Unternehmens-Operation durch.
