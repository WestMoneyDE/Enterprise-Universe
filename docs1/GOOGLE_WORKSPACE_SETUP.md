# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE WORKSPACE EMAIL AUTOMATION
# Setup Guide für info@west-money-bau.de
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 ÜBERSICHT

Dieses Setup ermöglicht automatischen E-Mail-Versand über:
- **info@west-money-bau.de** (Google Workspace)
- **Gmail API** (für programmatischen Zugriff)
- **Zapier** (für No-Code Automatisierungen)
- **Claude/AI Integration** (über API)

---

## 🔧 SCHRITT 1: GOOGLE CLOUD PROJEKT ERSTELLEN

### 1.1 Google Cloud Console öffnen
1. Gehe zu: https://console.cloud.google.com
2. Mit info@west-money-bau.de anmelden
3. "Neues Projekt" erstellen:
   - Name: `West Money Email Automation`
   - Organisation: (falls vorhanden auswählen)

### 1.2 Gmail API aktivieren
1. Navigation: **APIs & Dienste** → **Bibliothek**
2. Suche: "Gmail API"
3. **Gmail API** auswählen → **AKTIVIEREN**

### 1.3 OAuth Einwilligung konfigurieren
1. **APIs & Dienste** → **OAuth-Zustimmungsbildschirm**
2. Nutzertyp: **Intern** (für Workspace) oder **Extern**
3. App-Informationen:
   ```
   App-Name: West Money Email Automation
   Support-E-Mail: info@west-money-bau.de
   Autorisierte Domains: west-money-bau.de
   ```
4. Scopes hinzufügen:
   ```
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.modify
   ```

### 1.4 OAuth Client-ID erstellen
1. **APIs & Dienste** → **Anmeldedaten**
2. **+ ANMELDEDATEN ERSTELLEN** → **OAuth-Client-ID**
3. Anwendungstyp: **Webanwendung**
4. Name: `West Money Email Client`
5. Autorisierte Weiterleitungs-URIs:
   ```
   https://developers.google.com/oauthplayground
   https://api.west-money-bau.de/oauth/callback
   ```
6. **ERSTELLEN** → Client-ID und Secret kopieren!

---

## 🔑 SCHRITT 2: REFRESH TOKEN GENERIEREN

### 2.1 OAuth Playground verwenden
1. Öffne: https://developers.google.com/oauthplayground
2. Klicke auf ⚙️ (Einstellungen) oben rechts
3. Aktiviere: **"Use your own OAuth credentials"**
4. Eingeben:
   ```
   OAuth Client ID: [Deine Client ID]
   OAuth Client secret: [Dein Secret]
   ```

### 2.2 Scopes autorisieren
1. Linke Seite: Gmail API v1 aufklappen
2. Auswählen:
   - `https://mail.google.com/`
   - `https://www.googleapis.com/auth/gmail.send`
3. **Authorize APIs** klicken
4. Mit info@west-money-bau.de anmelden
5. Zugriff erlauben

### 2.3 Tokens abrufen
1. **Exchange authorization code for tokens** klicken
2. **Refresh Token** kopieren und sicher speichern!

---

## 📝 SCHRITT 3: ENVIRONMENT KONFIGURATION

### .env Datei erstellen

```env
# ═══════════════════════════════════════════════════════════════
# GOOGLE WORKSPACE / GMAIL API
# ═══════════════════════════════════════════════════════════════

# OAuth Credentials (aus Google Cloud Console)
GOOGLE_CLIENT_ID=xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground

# Refresh Token (aus OAuth Playground)
GOOGLE_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sender Configuration
EMAIL_SENDER_ADDRESS=info@west-money-bau.de
EMAIL_SENDER_NAME=West Money Bau
EMAIL_REPLY_TO=info@west-money-bau.de

# Optional: Backup SMTP (falls Gmail API nicht verfügbar)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@west-money-bau.de
SMTP_PASS=xxxx xxxx xxxx xxxx

# ═══════════════════════════════════════════════════════════════
# ZAPIER INTEGRATION
# ═══════════════════════════════════════════════════════════════

ZAPIER_WEBHOOK_SECRET=your_zapier_webhook_secret
ZAPIER_NLA_API_KEY=your_nla_api_key_if_using_ai_actions
```

---

## ⚡ SCHRITT 4: ZAPIER AUTOMATISIERUNGEN

### 4.1 Zapier Account verbinden
1. Gehe zu: https://zapier.com
2. Anmelden / Account erstellen
3. **My Apps** → **Add Connection** → **Gmail**
4. Mit info@west-money-bau.de verbinden

### 4.2 Zap erstellen: Neue Kundenanfrage → E-Mail

**Trigger:** Webhook (Catch Hook)
```
Webhook URL: https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/
```

**Action 1:** Gmail - Send Email
```
To: {{kunde_email}}
From: info@west-money-bau.de
Subject: Ihre Anfrage bei West Money Bau - Bestätigung
Body: (HTML Template)
```

**Action 2:** Slack - Send Message (optional)
```
Channel: #wmos-leads
Message: Neue Anfrage von {{kunde_name}}
```

### 4.3 Zap erstellen: Follow-Up nach 3 Tagen

**Trigger:** Schedule - Every Day at 9:00
**Filter:** Anfrage älter als 3 Tage, kein Follow-Up

**Action:** Gmail - Send Email
```
Subject: Nachfrage zu Ihrer Anfrage - West Money Bau
Body: Follow-Up Template
```

### 4.4 Zap erstellen: Partner-Anfrage senden

**Trigger:** Webhook
```
POST https://hooks.zapier.com/hooks/catch/xxxxx/partner/
{
  "partner_name": "ComfortClick",
  "partner_email": "partners@comfortclick.com"
}
```

**Action:** Gmail - Send Email (Partner Template)

---

## 🤖 SCHRITT 5: CLAUDE/AI INTEGRATION

### 5.1 API Endpoint für E-Mail-Versand

```typescript
// Express Route für Claude-gesteuerten E-Mail-Versand
app.post('/api/email/send', async (req, res) => {
  const { template, to, variables, auth_token } = req.body;

  // Authentifizierung prüfen
  if (auth_token !== process.env.CLAUDE_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await emailAutomation.sendFromTemplate(template, to, variables);
  res.json(result);
});
```

### 5.2 Claude kann E-Mails auslösen via:

**Option A: Direkte API Calls**
```bash
curl -X POST https://api.west-money-bau.de/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "template": "partner_anfrage",
    "to": "partners@comfortclick.com",
    "variables": {
      "partner_name": "ComfortClick"
    },
    "auth_token": "SECRET_TOKEN"
  }'
```

**Option B: Zapier Webhook**
```bash
curl -X POST https://hooks.zapier.com/hooks/catch/xxxxx/email/ \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_partner_email",
    "partner": "ComfortClick",
    "email": "partners@comfortclick.com"
  }'
```

---

## 📧 SCHRITT 6: E-MAIL TEMPLATES KONFIGURIEREN

### Verfügbare Templates

| Template ID | Verwendung |
|-------------|------------|
| `partner_anfrage` | Partnerschafts-Anfragen |
| `loxone_angebot` | LOXONE Angebotsanfragen |
| `immobilien_anfrage` | Immobilienmakler Kontakt |
| `anfrage_bestaetigung` | Auto-Reply für Kunden |
| `follow_up` | Nachfass-E-Mails |

### Template Variablen

```javascript
// partner_anfrage
{ partner_name: "ComfortClick" }

// anfrage_bestaetigung
{ kunde_name: "Max Mustermann", anfrage_details: "Smart Home Villa..." }

// follow_up
{ kontakt_name: "Herr Müller", thema: "Flagship Store", nachricht: "..." }
```

---

## 📊 SCHRITT 7: AUTOMATISIERUNGS-WORKFLOWS

### Workflow 1: Neue Lead → Auto-Reply + CRM

```
1. Kontaktformular ausgefüllt
   ↓
2. Webhook → Zapier
   ↓
3. E-Mail Bestätigung senden (anfrage_bestaetigung)
   ↓
4. HubSpot Kontakt erstellen
   ↓
5. Slack Benachrichtigung
   ↓
6. Nach 3 Tagen: Follow-Up E-Mail
```

### Workflow 2: Partner-Akquise

```
1. Claude identifiziert Partner
   ↓
2. API Call → /api/email/send
   ↓
3. partner_anfrage Template senden
   ↓
4. CRM Status: "Kontaktiert"
   ↓
5. Reminder nach 7 Tagen
```

### Workflow 3: Angebots-Anfrage

```
1. Benutzer: "Sende LOXONE Angebot"
   ↓
2. Claude → Webhook trigger
   ↓
3. loxone_angebot Template
   ↓
4. An: info@smarthome-koeln.de
   ↓
5. CC: info@west-money-bau.de
```

---

## ✅ CHECKLISTE

### Google Cloud Setup
- [ ] Projekt erstellt
- [ ] Gmail API aktiviert
- [ ] OAuth Consent konfiguriert
- [ ] Client ID & Secret generiert
- [ ] Refresh Token generiert

### Environment
- [ ] .env Datei erstellt
- [ ] Alle Credentials eingetragen
- [ ] Secrets sicher gespeichert

### Zapier
- [ ] Gmail verbunden
- [ ] Auto-Reply Zap aktiv
- [ ] Follow-Up Zap aktiv
- [ ] Partner Zap aktiv

### Testing
- [ ] Test-E-Mail gesendet
- [ ] Templates verifiziert
- [ ] Webhook funktioniert
- [ ] CRM Integration OK

---

## 🔒 SICHERHEITSHINWEISE

1. **Refresh Token niemals teilen** - Gibt vollen E-Mail-Zugriff
2. **API Tokens rotieren** - Alle 90 Tage erneuern
3. **Rate Limits beachten** - Gmail: 100 E-Mails/Tag (Workspace: 2000)
4. **Logs prüfen** - Verdächtige Aktivitäten überwachen
5. **2FA aktivieren** - Auf Google Workspace Account

---

## 📞 SUPPORT

Bei Problemen:
- Google Cloud Support: https://cloud.google.com/support
- Zapier Help: https://help.zapier.com
- West Money IT: info@west-money-bau.de

---

*Dokument erstellt: Dezember 2024*
*Version: 1.0*

# ═══════════════════════════════════════════════════════════════════════════════
