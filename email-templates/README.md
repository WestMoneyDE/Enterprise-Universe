# Enterprise Universe - Email Templates

Zentrale Dokumentation aller E-Mail- und WhatsApp-Templates.

## Übersicht

| Kategorie | Anzahl | Datei |
|-----------|--------|-------|
| West Money Bau | 10 | `west-money-bau.json` |
| Rechnungen & Zahlungen | 8 | `invoices-payments.json` |
| Verträge | 7 | `contracts.json` |
| Lead Nurturing | 9 | `lead-nurturing.json` |
| Subunternehmer | 8 | `subcontractors.json` |
| System & Alerts | 10 | `system-alerts.json` |
| LOXONE Smart Home | 7 | `loxone-smart-home.json` |
| Marketing & Newsletter | 10 | `marketing-newsletter.json` |
| WhatsApp Templates | 8 | `whatsapp-templates.json` |

**Gesamt: 77 Templates**

---

## Verwendung

### Template laden

```javascript
const templateLoader = require('./template-loader');

// Einzelnes Template
const template = await templateLoader.getTemplate('bau_application_confirmation');

// Template rendern
const rendered = await templateLoader.getRenderedTemplate('bau_application_confirmation', {
    first_name: 'Max'
});

console.log(rendered.subject);  // "Ihre Bewerbung bei West Money Bau"
console.log(rendered.body);     // Personalisierter Text
```

### Alle Templates auflisten

```javascript
const templates = await templateLoader.listTemplates();
console.log(templates);
// [{ id: 'bau_application_confirmation', name: 'Bewerbungsbestätigung', ... }]
```

### Nach Kategorie filtern

```javascript
const bauTemplates = await templateLoader.getTemplatesByCategory('West Money Bau');
```

---

## Template-Kategorien

### 1. West Money Bau (10 Templates)

| ID | Name | Trigger |
|----|------|---------|
| `bau_application_confirmation` | Bewerbungsbestätigung | Neue Bewerbung |
| `bau_application_admin_notification` | Admin-Benachrichtigung | Neue Bewerbung |
| `bau_application_approved` | Bewerbung genehmigt | Admin genehmigt |
| `bau_application_rejected` | Bewerbung abgelehnt | Admin lehnt ab |
| `bau_project_inquiry_admin` | Projektanfrage Admin | Neue Anfrage |
| `bau_project_inquiry_confirmation` | Projektanfrage Bestätigung | Neue Anfrage |
| `bau_quote_sent` | Angebot gesendet | Angebot erstellt |
| `bau_project_assigned` | Projekt zugewiesen | Subunternehmer zugewiesen |
| `bau_project_update` | Projekt-Update | Status ändert sich |
| `bau_project_completed` | Projekt abgeschlossen | Projekt fertig |

### 2. Rechnungen & Zahlungen (8 Templates)

| ID | Name | Trigger |
|----|------|---------|
| `invoice_created` | Neue Rechnung | Rechnung erstellt |
| `invoice_reminder_1` | Erinnerung 1 Tag | 1 Tag überfällig |
| `invoice_reminder_7` | Erinnerung 7 Tage | 7 Tage überfällig |
| `invoice_reminder_14` | Mahnung 14 Tage | 14 Tage überfällig |
| `invoice_reminder_30` | Letzte Mahnung | 30 Tage überfällig |
| `payment_received` | Zahlung bestätigt | Zahlung eingegangen |
| `deposit_request` | Anzahlung anfordern | Projekt startet |
| `subcontractor_payout` | Subunternehmer Auszahlung | Projekt abgerechnet |

### 3. Verträge (7 Templates)

| ID | Name | Trigger |
|----|------|---------|
| `contract_expiry_30` | Erinnerung 30 Tage | 30 Tage vor Ablauf |
| `contract_expiry_14` | Erinnerung 14 Tage | 14 Tage vor Ablauf |
| `contract_expiry_7` | Erinnerung 7 Tage | 7 Tage vor Ablauf |
| `contract_expiry_1` | Letzte Warnung | 1 Tag vor Ablauf |
| `contract_expiry_admin` | Admin-Benachrichtigung | Vertrag läuft ab |
| `contract_renewed` | Vertrag verlängert | Verlängerung |
| `maintenance_renewal_reminder` | Wartungsvertrag | Wartung steht an |

### 4. Lead Nurturing (9 Templates)

| ID | Sequenz | Step | Trigger |
|----|---------|------|---------|
| `inquiry_followup_1` | project_inquiry | 1 | 1 Tag ohne Antwort |
| `inquiry_followup_3` | project_inquiry | 2 | 3 Tage ohne Antwort |
| `inquiry_followup_7` | project_inquiry | 3 | 7 Tage ohne Antwort |
| `inquiry_followup_14` | project_inquiry | 4 | 14 Tage ohne Antwort |
| `application_followup_1` | subcontractor_application | 1 | Dokumente fehlen |
| `application_followup_3` | subcontractor_application | 2 | Erinnerung |
| `quote_followup_3` | quote_sent | 1 | 3 Tage nach Angebot |
| `quote_followup_7` | quote_sent | 2 | 7 Tage nach Angebot |
| `quote_expired` | quote_sent | 3 | Angebot abgelaufen |

### 5. Subunternehmer Management (8 Templates)

| ID | Name | Trigger |
|----|------|---------|
| `sub_project_match` | Projekt-Match | Matching-Algorithmus |
| `sub_assignment_confirmation` | Auftrag bestätigt | Auftrag angenommen |
| `sub_project_reminder` | Projekterinnerung | 1 Tag vor Start |
| `sub_project_completion_request` | Abschluss anfordern | Enddatum erreicht |
| `sub_performance_review` | Leistungsbewertung | Monatlich |
| `sub_availability_check` | Verfügbarkeit | Wöchentlich |
| `sub_certification_expiry` | Zertifikat läuft ab | 30 Tage vorher |
| `sub_welcome_onboarding` | Willkommen | Bewerbung genehmigt |

### 6. System & Alerts (10 Templates)

| ID | Name | Priorität |
|----|------|-----------|
| `system_health_alert` | Service Down | HIGH |
| `system_health_recovery` | Service wiederhergestellt | NORMAL |
| `daily_report` | Täglicher Bericht | NORMAL |
| `weekly_summary` | Wöchentliche Zusammenfassung | NORMAL |
| `backup_success` | Backup erfolgreich | LOW |
| `backup_failed` | Backup fehlgeschlagen | HIGH |
| `high_server_load` | Hohe Auslastung | HIGH |
| `security_alert` | Sicherheitswarnung | CRITICAL |
| `hubspot_sync_error` | HubSpot Fehler | NORMAL |
| `stripe_webhook_failed` | Stripe Fehler | HIGH |

### 7. LOXONE Smart Home (7 Templates)

| ID | Name | Trigger |
|----|------|---------|
| `loxone_consultation_booked` | Beratung gebucht | Termin gebucht |
| `loxone_system_configured` | System konfiguriert | Konfiguration fertig |
| `loxone_maintenance_scheduled` | Wartungstermin | Termin geplant |
| `loxone_maintenance_report` | Wartungsbericht | Nach Wartung |
| `loxone_firmware_update` | Firmware Update | Neue Version |
| `loxone_support_ticket` | Support-Ticket | Ticket erstellt |
| `loxone_remote_access_request` | Fernzugriff | Support benötigt Zugriff |

### 8. Marketing & Newsletter (10 Templates)

| ID | Name | Trigger |
|----|------|---------|
| `newsletter_welcome` | Newsletter Willkommen | Anmeldung |
| `newsletter_monthly` | Monatlicher Newsletter | Monatlich |
| `referral_program` | Empfehlungsprogramm | Empfehlung |
| `referral_reward` | Empfehlungsbonus | Erfolgreiche Empfehlung |
| `seasonal_promo_summer` | Sommer-Aktion | Saisonal |
| `seasonal_promo_winter` | Winter-Aktion | Saisonal |
| `event_invitation` | Event-Einladung | Event geplant |
| `customer_satisfaction` | Kundenzufriedenheit | 30 Tage nach Abschluss |
| `google_review_request` | Google Bewertung | Positive Umfrage |
| `reengagement_inactive` | Re-Engagement | 90 Tage inaktiv |

### 9. WhatsApp Templates (8 Templates)

| ID | Kategorie | Status |
|----|-----------|--------|
| `wa_appointment_reminder` | UTILITY | APPROVED |
| `wa_project_update` | UTILITY | APPROVED |
| `wa_invoice_reminder` | UTILITY | APPROVED |
| `wa_subcontractor_assignment` | UTILITY | APPROVED |
| `wa_welcome` | MARKETING | APPROVED |
| `wa_quote_sent` | UTILITY | APPROVED |
| `wa_project_completed` | UTILITY | APPROVED |
| `wa_maintenance_reminder` | UTILITY | APPROVED |

---

## Template-Struktur

```json
{
  "id": "template_id",
  "name": "Template Name",
  "trigger": "Wann wird es verwendet",
  "recipient": "Empfänger",
  "subject": "Betreff mit {{variablen}}",
  "body": "Text mit {{variablen}}",
  "variables": ["variable1", "variable2"],
  "hasHtmlVersion": true
}
```

## Variablen-Platzhalter

Variablen werden mit `{{variable_name}}` markiert und beim Rendern ersetzt.

Beispiel:
```
Hallo {{first_name}}, Ihr Projekt {{project_number}} wurde abgeschlossen.
```

Wird zu:
```
Hallo Max, Ihr Projekt WMB-2026-0042 wurde abgeschlossen.
```

---

## Daemon-Integration

Die Daemons verwenden die Templates automatisch:

- **Invoice Reminder**: `invoice_reminder_1`, `invoice_reminder_7`, etc.
- **Lead Nurturing**: `inquiry_followup_*`, `quote_followup_*`
- **Contract Watcher**: `contract_expiry_*`
- **Report Generator**: `daily_report`, `weekly_summary`
- **Health Monitor**: `system_health_alert`, `system_health_recovery`

---

## Hinweise

1. **Sprache**: Alle Templates sind auf Deutsch
2. **HTML-Versionen**: Einige Templates haben HTML-Versionen (markiert mit `hasHtmlVersion: true`)
3. **WhatsApp**: Templates müssen von Meta genehmigt werden
4. **Personalisierung**: Alle Variablen sollten vor dem Senden ersetzt werden
