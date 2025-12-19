# 📋 WEST MONEY OS - API SETUP CHECKLIST

## Vollständige Anleitung zur Konfiguration aller API-Integrationen

---

## ✅ CHECKLISTE ÜBERSICHT

| # | Service | Status | Priorität |
|---|---------|--------|-----------|
| 1 | HubSpot CRM | ⬜ | 🔴 Hoch |
| 2 | WhatsApp Business | ⬜ | 🔴 Hoch |
| 3 | Zadarma VoIP | ⬜ | 🟡 Mittel |
| 4 | LOXONE Smart Home | ⬜ | 🔴 Hoch |
| 5 | Slack | ⬜ | 🟡 Mittel |

---

## 1️⃣ HUBSPOT CRM SETUP

### Schritt 1: Private App erstellen
1. Gehe zu: https://app.hubspot.com
2. Settings (⚙️) → Integrations → Private Apps
3. "Create a private app" klicken
4. Name: `West Money OS Integration`

### Schritt 2: Berechtigungen (Scopes) setzen
```
✅ crm.objects.contacts.read
✅ crm.objects.contacts.write
✅ crm.objects.deals.read
✅ crm.objects.deals.write
✅ crm.objects.companies.read
✅ crm.objects.companies.write
✅ crm.schemas.contacts.read
✅ crm.schemas.deals.read
```

### Schritt 3: Token kopieren
Nach dem Erstellen der App wird ein Access Token angezeigt:
```
pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Schritt 4: Portal ID finden
- URL in HubSpot enthält die Portal ID: `app.hubspot.com/contacts/PORTAL_ID/...`

### Schritt 5: .env konfigurieren
```env
HUBSPOT_API_KEY=pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_PORTAL_ID=12345678
```

### Schritt 6: Webhook einrichten (optional)
1. Settings → Integrations → Webhooks
2. URL: `https://api.west-money-bau.de/webhooks/hubspot`
3. Events auswählen:
   - contact.creation
   - contact.propertyChange
   - deal.creation
   - deal.propertyChange

### ✅ HubSpot Test
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.hubapi.com/account-info/v3/details
```

---

## 2️⃣ WHATSAPP BUSINESS API SETUP

### Schritt 1: Meta Business Account
1. Gehe zu: https://business.facebook.com
2. Business erstellen oder auswählen
3. Meta Business Suite aktivieren

### Schritt 2: Meta Developer App
1. Gehe zu: https://developers.facebook.com
2. "My Apps" → "Create App"
3. Type: "Business"
4. App Name: `West Money WhatsApp`

### Schritt 3: WhatsApp Product hinzufügen
1. In der App: "Add Products"
2. "WhatsApp" auswählen und "Set Up"
3. Business Account verknüpfen

### Schritt 4: Telefonnummer einrichten
1. WhatsApp → Getting Started
2. "Add phone number" oder Test-Nummer verwenden
3. Phone Number ID notieren

### Schritt 5: Permanent Token erstellen
1. Business Settings → System Users
2. System User erstellen mit Admin-Rechten
3. "Generate Token" mit WhatsApp-Berechtigung
4. Token kopieren (beginnt mit `EAAG...`)

### Schritt 6: .env konfigurieren
```env
WHATSAPP_ACCESS_TOKEN=EAAGxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=mein_geheimer_verify_token
WHATSAPP_WEBHOOK_SECRET=app_secret_von_meta
WHATSAPP_API_VERSION=v18.0
```

### Schritt 7: Webhook einrichten
1. WhatsApp → Configuration → Webhook
2. Callback URL: `https://api.west-money-bau.de/webhooks/whatsapp`
3. Verify Token: Gleicher Wert wie `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Webhook Fields abonnieren:
   - messages
   - messaging_postbacks

### Schritt 8: Message Templates erstellen
1. WhatsApp → Message Templates
2. Templates für DSGVO-Consent erstellen:
   - `dsgvo_consent_request`
   - `welcome_message`
   - `appointment_reminder`

### ✅ WhatsApp Test
```bash
curl "https://graph.facebook.com/v18.0/PHONE_NUMBER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3️⃣ ZADARMA VOIP SETUP

### Schritt 1: Zadarma Account
1. Gehe zu: https://zadarma.com/de/
2. Account erstellen und verifizieren
3. Guthaben aufladen

### Schritt 2: API-Schlüssel generieren
1. My Zadarma → Einstellungen → API
2. "API-Schlüssel generieren" klicken
3. API Key und Secret notieren

### Schritt 3: SIP-Nummer einrichten
1. My Zadarma → SIP
2. SIP-Account erstellen
3. SIP ID notieren

### Schritt 4: Telefonnummer kaufen
1. Virtuelle Nummern → Neue Nummer kaufen
2. Deutsche Nummer (+49) auswählen
3. Nummer als Caller ID verwenden

### Schritt 5: .env konfigurieren
```env
ZADARMA_API_KEY=your_api_key_here
ZADARMA_API_SECRET=your_api_secret_here
ZADARMA_SIP_ID=123456
ZADARMA_CALLER_ID=+49123456789
ZADARMA_WEBHOOK_URL=https://api.west-money-bau.de/webhooks/zadarma
```

### Schritt 6: Webhooks aktivieren
1. My Zadarma → Einstellungen → API
2. Webhook URL eintragen
3. Events aktivieren:
   - NOTIFY_START
   - NOTIFY_END
   - NOTIFY_RECORD

### ✅ Zadarma Test
```bash
# Guthaben abfragen
curl -H "Authorization: API_KEY:SIGNATURE" \
  https://api.zadarma.com/v1/info/balance/
```

---

## 4️⃣ LOXONE SMART HOME SETUP

### Schritt 1: Miniserver-Zugang
1. Miniserver IP-Adresse ermitteln (z.B. über Loxone Config)
2. Admin-Zugangsdaten bereithalten

### Schritt 2: Benutzer für API erstellen
1. Loxone Config öffnen
2. Benutzer → Neuer Benutzer
3. Name: `api_user`
4. Berechtigungen: Vollzugriff oder spezifische Räume

### Schritt 3: .env konfigurieren
```env
LOXONE_HOST=192.168.1.100
LOXONE_PORT=80
LOXONE_USER=api_user
LOXONE_PASSWORD=sicheres_passwort
LOXONE_USE_SSL=false
LOXONE_WEBSOCKET_PORT=80
```

### Schritt 4: Netzwerk-Zugang prüfen
- Server muss im gleichen Netzwerk sein ODER
- Port-Forwarding / VPN einrichten

### Schritt 5: Cloud-Zugang (optional)
1. Loxone Config → Cloud DNS aktivieren
2. Cloud Token generieren
```env
LOXONE_CLOUD_URL=dns.loxonecloud.com
LOXONE_CLOUD_TOKEN=your_cloud_token
```

### ✅ LOXONE Test
```bash
curl -u "admin:password" \
  http://192.168.1.100/jdev/cfg/api
```

---

## 5️⃣ SLACK SETUP

### Schritt 1: Slack App erstellen
1. Gehe zu: https://api.slack.com/apps
2. "Create New App" → "From scratch"
3. App Name: `West Money OS`
4. Workspace auswählen

### Schritt 2: Bot Token Scopes
OAuth & Permissions → Bot Token Scopes:
```
✅ chat:write
✅ chat:write.public
✅ channels:read
✅ channels:history
✅ users:read
✅ reactions:read
✅ files:write
```

### Schritt 3: Bot installieren
1. "Install to Workspace" klicken
2. Berechtigungen bestätigen
3. Bot OAuth Token kopieren (`xoxb-...`)

### Schritt 4: Signing Secret kopieren
- Basic Information → App Credentials → Signing Secret

### Schritt 5: .env konfigurieren
```env
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SLACK_APP_TOKEN=xapp-x-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxx
SLACK_CHANNEL_ALERTS=#wmos-alerts
SLACK_CHANNEL_LEADS=#wmos-leads
SLACK_CHANNEL_SUPPORT=#wmos-support
```

### Schritt 6: Event Subscriptions
1. Event Subscriptions aktivieren
2. Request URL: `https://api.west-money-bau.de/webhooks/slack/events`
3. Subscribe to bot events:
   - message.channels
   - app_mention
   - reaction_added

### Schritt 7: Interactivity
1. Interactivity & Shortcuts aktivieren
2. Request URL: `https://api.west-money-bau.de/webhooks/slack/interactive`

### Schritt 8: Kanäle erstellen
In Slack:
- #wmos-alerts (für System-Alerts)
- #wmos-leads (für neue Leads)
- #wmos-support (für Support-Anfragen)

Bot zu allen Kanälen hinzufügen!

### ✅ Slack Test
```bash
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer xoxb-YOUR-TOKEN"
```

---

## 🔧 FINALE .ENV DATEI

```env
# ═══════════════════════════════════════════════════════════════
# WEST MONEY OS - PRODUCTION CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# Application
NODE_ENV=production
PORT=3000
APP_URL=https://app.west-money-bau.de
API_URL=https://api.west-money-bau.de

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/westmoney
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=min-32-zeichen-geheimer-schluessel-hier
SESSION_SECRET=noch-ein-geheimer-schluessel
ENCRYPTION_KEY=32-zeichen-verschluesselung-key

# ─────────────────────────────────────────────────────────────
# HUBSPOT
# ─────────────────────────────────────────────────────────────
HUBSPOT_API_KEY=pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_PORTAL_ID=12345678
HUBSPOT_SYNC_INTERVAL=300000

# ─────────────────────────────────────────────────────────────
# WHATSAPP
# ─────────────────────────────────────────────────────────────
WHATSAPP_ACCESS_TOKEN=EAAGxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_WEBHOOK_SECRET=your_app_secret
WHATSAPP_API_VERSION=v18.0

# ─────────────────────────────────────────────────────────────
# ZADARMA
# ─────────────────────────────────────────────────────────────
ZADARMA_API_KEY=your_api_key
ZADARMA_API_SECRET=your_api_secret
ZADARMA_SIP_ID=123456
ZADARMA_CALLER_ID=+49123456789

# ─────────────────────────────────────────────────────────────
# LOXONE
# ─────────────────────────────────────────────────────────────
LOXONE_HOST=192.168.1.100
LOXONE_PORT=80
LOXONE_USER=admin
LOXONE_PASSWORD=your_password
LOXONE_USE_SSL=false

# ─────────────────────────────────────────────────────────────
# SLACK
# ─────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SLACK_CHANNEL_ALERTS=#wmos-alerts
SLACK_CHANNEL_LEADS=#wmos-leads

# ─────────────────────────────────────────────────────────────
# FEATURE FLAGS
# ─────────────────────────────────────────────────────────────
FEATURE_HUBSPOT=true
FEATURE_WHATSAPP=true
FEATURE_ZADARMA=true
FEATURE_LOXONE=true
FEATURE_SLACK=true

# ─────────────────────────────────────────────────────────────
# MONITORING
# ─────────────────────────────────────────────────────────────
SYNC_INTERVAL=300000
HEALTH_CHECK_INTERVAL=60000
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Vor dem Start:
- [ ] Alle .env Variablen ausgefüllt
- [ ] `npm run validate` erfolgreich
- [ ] Webhook URLs erreichbar (HTTPS)
- [ ] SSL-Zertifikat konfiguriert
- [ ] Firewall-Ports offen (3000, 80, 443)

### Nach dem Start:
- [ ] `/health` Endpoint prüfen
- [ ] Slack Test-Nachricht senden
- [ ] WhatsApp Test-Nachricht senden
- [ ] HubSpot Kontakt erstellen
- [ ] LOXONE Licht schalten

---

## 📞 SUPPORT

Bei Problemen:
- 📧 support@west-money-bau.de
- 📱 WhatsApp: +49 XXX XXXXXXX
- 🌐 https://west-money-bau.de

---

*Dokument erstellt: Dezember 2024*
*Version: 1.0*
