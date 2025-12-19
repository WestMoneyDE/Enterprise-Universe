# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE CLOUD SETUP - WEST MONEY BAU
# Organization ID: 271645343985
# E-Mail: info@west-money-bau.de
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 DEINE DATEN

| Parameter | Wert |
|-----------|------|
| **Organization ID** | 271645343985 |
| **E-Mail Account** | info@west-money-bau.de |
| **Projekt Name** | West Money Email Automation |
| **Verwendung** | Gmail API für automatischen E-Mail-Versand |

---

## ✅ SCHRITT 1: BILLING EINRICHTEN

Du bist hier: `https://console.cloud.google.com/cloud-setup/billing?organizationId=271645343985`

### 1.1 Abrechnungskonto erstellen (falls noch nicht vorhanden)

1. Klicke **"Abrechnungskonto erstellen"** oder **"Create billing account"**
2. Wähle:
   - Kontotyp: **Geschäftskonto** (Business)
   - Land: **Deutschland**
   - Währung: **EUR**
3. Zahlungsmethode hinzufügen:
   - Kreditkarte oder
   - Bankeinzug (SEPA)
4. **Speichern**

> ⚠️ **Hinweis:** Gmail API ist **kostenlos** bis 1 Milliarde API-Aufrufe/Tag. 
> Du wirst voraussichtlich **€0,00** bezahlen.

---

## ✅ SCHRITT 2: NEUES PROJEKT ERSTELLEN

### 2.1 Projekt anlegen

1. Gehe zu: **https://console.cloud.google.com/projectcreate**
2. Oder: Oben links auf **Projektauswahl** → **Neues Projekt**
3. Eingeben:
   ```
   Projektname:    West-Money-Email-Automation
   Organisation:   271645343985
   Speicherort:    (automatisch)
   ```
4. Klicke **"Erstellen"**
5. Warte 30 Sekunden bis das Projekt erstellt ist

### 2.2 Projekt auswählen

1. Oben links: Projektauswahl öffnen
2. **"West-Money-Email-Automation"** auswählen

---

## ✅ SCHRITT 3: GMAIL API AKTIVIEREN

### 3.1 API aktivieren

1. Gehe zu: **https://console.cloud.google.com/apis/library/gmail.googleapis.com**
2. Oder: Menü → **APIs & Dienste** → **Bibliothek**
3. Suche: **"Gmail API"**
4. Klicke auf **Gmail API**
5. Klicke **"AKTIVIEREN"** (blauer Button)

✅ Du siehst: "Gmail API wurde aktiviert"

---

## ✅ SCHRITT 4: OAUTH ZUSTIMMUNGSBILDSCHIRM

### 4.1 Konfigurieren

1. Gehe zu: **https://console.cloud.google.com/apis/credentials/consent**
2. Oder: **APIs & Dienste** → **OAuth-Zustimmungsbildschirm**

### 4.2 Nutzertyp wählen

- Wähle: **Intern** (nur für Google Workspace Nutzer)
- Klicke **"Erstellen"**

### 4.3 App-Informationen ausfüllen

```
App-Name:                   West Money Email Automation
Support-E-Mail:             info@west-money-bau.de
App-Logo:                   (optional, überspringen)

Autorisierte Domains:       west-money-bau.de

Kontaktdaten Entwickler:    info@west-money-bau.de
```

Klicke **"Speichern und fortfahren"**

### 4.4 Scopes hinzufügen

1. Klicke **"Bereiche hinzufügen oder entfernen"**
2. Suche und wähle:
   ```
   ☑️ https://www.googleapis.com/auth/gmail.send
   ☑️ https://www.googleapis.com/auth/gmail.readonly
   ☑️ https://www.googleapis.com/auth/gmail.modify
   ☑️ https://mail.google.com/
   ```
3. Klicke **"Aktualisieren"**
4. Klicke **"Speichern und fortfahren"**

### 4.5 Testnutzer (falls Extern gewählt)

Falls du "Extern" gewählt hast:
1. Klicke **"Add Users"**
2. Füge hinzu: `info@west-money-bau.de`
3. Klicke **"Speichern"**

---

## ✅ SCHRITT 5: OAUTH CLIENT-ID ERSTELLEN

### 5.1 Anmeldedaten erstellen

1. Gehe zu: **https://console.cloud.google.com/apis/credentials**
2. Oder: **APIs & Dienste** → **Anmeldedaten**
3. Klicke **"+ ANMELDEDATEN ERSTELLEN"**
4. Wähle **"OAuth-Client-ID"**

### 5.2 Client konfigurieren

```
Anwendungstyp:              Webanwendung
Name:                       West Money Email Client

Autorisierte JavaScript-Ursprünge:
                            (leer lassen)

Autorisierte Weiterleitungs-URIs:
                            https://developers.google.com/oauthplayground
```

5. Klicke **"Erstellen"**

### 5.3 WICHTIG: Credentials kopieren! 📋

Du siehst jetzt ein Popup mit:

```
╔═══════════════════════════════════════════════════════════════════╗
║  Deine Client-ID:                                                  ║
║  xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com   ║
║                                                                    ║
║  Dein Client Secret:                                               ║
║  GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx                                ║
╚═══════════════════════════════════════════════════════════════════╝
```

**KOPIERE BEIDE WERTE UND SPEICHERE SIE SICHER!**

---

## ✅ SCHRITT 6: REFRESH TOKEN GENERIEREN

### 6.1 OAuth Playground öffnen

1. Gehe zu: **https://developers.google.com/oauthplayground**

### 6.2 Eigene Credentials verwenden

1. Klicke oben rechts auf **⚙️ Zahnrad** (OAuth 2.0 configuration)
2. Aktiviere: **☑️ Use your own OAuth credentials**
3. Eingeben:
   ```
   OAuth Client ID:     [Deine Client-ID von Schritt 5.3]
   OAuth Client secret: [Dein Secret von Schritt 5.3]
   ```

### 6.3 Scopes autorisieren

1. Links in der Liste: **Gmail API v1** aufklappen
2. Alle Checkboxen aktivieren:
   ```
   ☑️ https://mail.google.com/
   ☑️ https://www.googleapis.com/auth/gmail.compose
   ☑️ https://www.googleapis.com/auth/gmail.modify
   ☑️ https://www.googleapis.com/auth/gmail.readonly
   ☑️ https://www.googleapis.com/auth/gmail.send
   ```
3. Klicke **"Authorize APIs"** (blauer Button)

### 6.4 Mit Google anmelden

1. Google Login-Fenster öffnet sich
2. Anmelden mit: **info@west-money-bau.de**
3. Klicke **"Weiter"** / **"Allow"**
4. Alle Berechtigungen akzeptieren

### 6.5 Token tauschen

1. Du bist jetzt bei "Step 2"
2. Klicke **"Exchange authorization code for tokens"**
3. Du siehst jetzt:

```json
{
  "access_token": "ya29.xxxxxxxxxxxxx...",
  "refresh_token": "1//xxxxxxxxxxxxx...",   ← DAS BRAUCHST DU!
  "scope": "https://mail.google.com/...",
  "token_type": "Bearer",
  "expires_in": 3599
}
```

**KOPIERE DEN REFRESH TOKEN UND SPEICHERE IHN SICHER!**

---

## ✅ SCHRITT 7: KONFIGURATION SPEICHERN

### 7.1 Deine Credentials

Erstelle eine Datei `.env` mit deinen Daten:

```env
# ═══════════════════════════════════════════════════════════════
# WEST MONEY BAU - GOOGLE WORKSPACE EMAIL AUTOMATION
# ═══════════════════════════════════════════════════════════════

# Google Cloud Project
GOOGLE_CLOUD_PROJECT=west-money-email-automation
GOOGLE_ORGANIZATION_ID=271645343985

# OAuth Credentials (aus Schritt 5.3)
GOOGLE_CLIENT_ID=HIER_DEINE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-HIER_DEIN_SECRET

# Refresh Token (aus Schritt 6.5)
GOOGLE_REFRESH_TOKEN=1//HIER_DEIN_REFRESH_TOKEN

# Redirect URI
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground

# Sender
EMAIL_SENDER_ADDRESS=info@west-money-bau.de
EMAIL_SENDER_NAME=West Money Bau
```

---

## 🧪 SCHRITT 8: TESTEN

### 8.1 Test im OAuth Playground

1. Im OAuth Playground (du solltest noch dort sein)
2. Gehe zu "Step 3"
3. Konfiguriere:
   ```
   HTTP Method: POST
   Request URI: https://gmail.googleapis.com/gmail/v1/users/me/messages/send
   ```
4. Request body:
   ```json
   {
     "raw": "VG86IGluZm9Ad2VzdC1tb25leS1iYXUuZGUKU3ViamVjdDogVGVzdCBFLU1haWwKCkRhcyBpc3QgZWluIFRlc3Qu"
   }
   ```
5. Klicke **"Send the request"**

✅ Wenn du `200 OK` siehst, funktioniert alles!

---

## 📊 STATUS ÜBERSICHT

Nach Abschluss aller Schritte:

| Komponente | Status |
|------------|--------|
| Google Cloud Projekt | ☐ Erstellt |
| Billing | ☐ Eingerichtet |
| Gmail API | ☐ Aktiviert |
| OAuth Consent | ☐ Konfiguriert |
| Client ID | ☐ Erstellt |
| Refresh Token | ☐ Generiert |
| Test E-Mail | ☐ Gesendet |

---

## ❓ HÄUFIGE PROBLEME

### "Access Denied" beim Login
→ Füge dich als Testnutzer hinzu (Schritt 4.5)

### "Invalid Client"
→ Prüfe Client ID und Secret auf Tippfehler

### "Refresh Token invalid"
→ Generiere einen neuen Token (Schritt 6 wiederholen)

### API Quota exceeded
→ Unwahrscheinlich, Limit ist 1 Mrd. Aufrufe/Tag

---

## 🎯 NÄCHSTE SCHRITTE NACH DEM SETUP

1. **Credentials kopieren** (Client ID, Secret, Refresh Token)
2. **An Claude senden** → Ich richte die Automation ein
3. **Zapier verbinden** (optional)
4. **E-Mails automatisch versenden** ✅

---

*Erstellt für: West Money Bau GmbH*
*Organization ID: 271645343985*
*Datum: Dezember 2024*

# ═══════════════════════════════════════════════════════════════════════════════
