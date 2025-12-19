# ═══════════════════════════════════════════════════════════════════════════════
# GMAIL API SETUP - OHNE BILLING (100% KOSTENLOS)
# West Money Bau | info@west-money-bau.de
# ═══════════════════════════════════════════════════════════════════════════════

---

## ✅ ÜBERSICHT

| Info | Details |
|------|---------|
| **Kosten** | €0,00 (komplett kostenlos) |
| **Quota** | 1 Milliarde API-Aufrufe/Tag |
| **E-Mails/Tag** | Unbegrenzt (Workspace: 2.000/Tag) |
| **Dauer Setup** | ca. 10 Minuten |

---

# 📋 SCHRITT 1: PROJEKT ERSTELLEN

## 1.1 Projekt anlegen

1. **Öffne diesen Link:**
   ```
   https://console.cloud.google.com/projectcreate
   ```

2. **Fülle aus:**
   ```
   Projektname:     WestMoneyEmail
   Speicherort:     Keine Organisation (oder 271645343985)
   ```
   
   > 💡 Falls "Organisation" Probleme macht, wähle **"Keine Organisation"**

3. **Klicke:** "ERSTELLEN"

4. **Warte** 10-30 Sekunden

✅ **Fertig wenn:** Du siehst "Projekt WestMoneyEmail wurde erstellt"

---

# 📋 SCHRITT 2: GMAIL API AKTIVIEREN

## 2.1 API Bibliothek öffnen

1. **Öffne diesen Link:**
   ```
   https://console.cloud.google.com/apis/library/gmail.googleapis.com
   ```

2. **Falls gefragt:** Wähle Projekt "WestMoneyEmail"

3. **Klicke:** Den großen blauen Button **"AKTIVIEREN"**

✅ **Fertig wenn:** Du siehst "API wurde aktiviert"

---

# 📋 SCHRITT 3: OAUTH ZUSTIMMUNGSBILDSCHIRM

## 3.1 Consent Screen öffnen

1. **Öffne diesen Link:**
   ```
   https://console.cloud.google.com/apis/credentials/consent
   ```

## 3.2 Nutzertyp wählen

1. **Wähle:** ○ **Extern** (für alle Google-Konten)
   
   > 💡 "Intern" geht nur mit Workspace Admin-Rechten
   
2. **Klicke:** "ERSTELLEN"

## 3.3 App-Informationen (Seite 1)

Fülle aus:

```
App-Name:                    West Money Email
Support-E-Mail:              info@west-money-bau.de

App-Logo:                    [ÜBERSPRINGEN - nicht nötig]

App-Domain:                  [ÜBERSPRINGEN - nicht nötig]
Autorisierte Domains:        [ÜBERSPRINGEN - nicht nötig]

Kontakt Entwickler:          info@west-money-bau.de
```

**Klicke:** "SPEICHERN UND FORTFAHREN"

## 3.4 Scopes (Seite 2)

1. **Klicke:** "BEREICHE HINZUFÜGEN ODER ENTFERNEN"

2. **Suche und aktiviere:**
   ```
   ☑️ .../auth/gmail.send
   ☑️ .../auth/gmail.readonly  
   ```
   
   Oder im Filter eingeben: `gmail`

3. **Klicke:** "AKTUALISIEREN"

4. **Klicke:** "SPEICHERN UND FORTFAHREN"

## 3.5 Testnutzer (Seite 3)

1. **Klicke:** "+ ADD USERS"

2. **Eingeben:**
   ```
   info@west-money-bau.de
   ```

3. **Klicke:** "HINZUFÜGEN"

4. **Klicke:** "SPEICHERN UND FORTFAHREN"

## 3.6 Zusammenfassung (Seite 4)

1. **Prüfen** und **"ZURÜCK ZUM DASHBOARD"**

✅ **Fertig wenn:** Du siehst den OAuth Consent Screen Status

---

# 📋 SCHRITT 4: CLIENT-ID ERSTELLEN

## 4.1 Anmeldedaten öffnen

1. **Öffne diesen Link:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

## 4.2 OAuth Client erstellen

1. **Klicke:** "+ ANMELDEDATEN ERSTELLEN"

2. **Wähle:** "OAuth-Client-ID"

3. **Anwendungstyp:** Wähle **"Webanwendung"**

4. **Name:** `West Money Email Client`

5. **Autorisierte Weiterleitungs-URIs:**
   
   Klicke "+ URI HINZUFÜGEN" und gib ein:
   ```
   https://developers.google.com/oauthplayground
   ```

6. **Klicke:** "ERSTELLEN"

## 4.3 🔴 WICHTIG: CREDENTIALS KOPIEREN!

Ein Popup erscheint mit:

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║  Client-ID:                                                         ║
║  123456789-abcdefghijk.apps.googleusercontent.com                  ║
║                                                                     ║
║  Client Secret:                                                     ║
║  GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz                                ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**📋 KOPIERE BEIDE WERTE JETZT!**

Speichere sie hier:

```
Meine Client-ID:     _______________________________________________

Mein Client Secret:  _______________________________________________
```

✅ **Fertig wenn:** Du beide Werte kopiert hast

---

# 📋 SCHRITT 5: REFRESH TOKEN GENERIEREN

## 5.1 OAuth Playground öffnen

1. **Öffne diesen Link:**
   ```
   https://developers.google.com/oauthplayground
   ```

## 5.2 Eigene Credentials einstellen

1. **Klicke** oben rechts auf das **⚙️ Zahnrad**

2. **Aktiviere:** ☑️ "Use your own OAuth credentials"

3. **Eingeben:**
   ```
   OAuth Client ID:     [Deine Client-ID von Schritt 4.3]
   OAuth Client secret: [Dein Secret von Schritt 4.3]
   ```

4. **Schließe** das Einstellungs-Popup

## 5.3 Gmail Scopes auswählen

1. **Links** in der Liste: Scrolle zu **"Gmail API v1"**

2. **Klicke** auf den Pfeil um aufzuklappen

3. **Aktiviere diese Checkboxen:**
   ```
   ☑️ https://mail.google.com/
   ☑️ https://www.googleapis.com/auth/gmail.send
   ```

4. **Klicke:** "Authorize APIs" (blauer Button)

## 5.4 Mit Google anmelden

1. **Google Login** öffnet sich

2. **Wähle:** `info@west-money-bau.de`

3. **Falls Warnung erscheint:**
   - Klicke "Erweitert" / "Advanced"
   - Klicke "Zu West Money Email (unsicher)" / "Go to West Money Email (unsafe)"
   
   > 💡 Das ist normal für Apps im Test-Modus!

4. **Klicke:** "Weiter" / "Continue"

5. **Erlaube** alle Berechtigungen

## 5.5 Token generieren

1. Du bist jetzt bei **"Step 2"**

2. **Klicke:** "Exchange authorization code for tokens"

3. **Du siehst jetzt:**
   ```json
   {
     "access_token": "ya29.a0AfH6SMBx...",
     "refresh_token": "1//0gXXXXXXXXXX...",   ← DAS BRAUCHST DU!
     "scope": "https://mail.google.com/...",
     "token_type": "Bearer",
     "expires_in": 3599
   }
   ```

## 5.6 🔴 WICHTIG: REFRESH TOKEN KOPIEREN!

**📋 KOPIERE DEN REFRESH TOKEN:**

```
Mein Refresh Token:  _______________________________________________
```

✅ **Fertig!** Du hast alle Credentials!

---

# 📋 SCHRITT 6: TEST E-MAIL SENDEN

## 6.1 Im OAuth Playground testen

1. Du solltest noch im OAuth Playground sein

2. Gehe zu **"Step 3"**

3. **HTTP Method:** `POST`

4. **Request URI:**
   ```
   https://gmail.googleapis.com/gmail/v1/users/me/messages/send
   ```

5. **Content-Type:** `application/json`

6. **Request Body:**
   ```json
   {
     "raw": "VG86IGluZm9Ad2VzdC1tb25leS1iYXUuZGUNClN1YmplY3Q6IFRlc3QgRS1NYWlsIHZvbiBHbWFpbCBBUEkNCg0KRGFzIGlzdCBlaW4gVGVzdC4gR21haWwgQVBJIGZ1bmt0aW9uaWVydCE="
   }
   ```
   
   > 💡 Das ist eine Base64-kodierte Test-E-Mail an dich selbst

7. **Klicke:** "Send the request"

8. **Erfolg wenn:** Du siehst `200 OK`

✅ **Prüfe deinen Posteingang!** Du solltest eine Test-E-Mail erhalten haben.

---

# 🎉 FERTIG! DEINE CREDENTIALS

Sende mir diese 3 Werte:

```
╔════════════════════════════════════════════════════════════════════╗
║  WEST MONEY BAU - GMAIL API CREDENTIALS                            ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  CLIENT_ID:                                                         ║
║  _____________________________________________________________     ║
║                                                                     ║
║  CLIENT_SECRET:                                                     ║
║  _____________________________________________________________     ║
║                                                                     ║
║  REFRESH_TOKEN:                                                     ║
║  _____________________________________________________________     ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

Dann richte ich die **automatische E-Mail-Automation** ein!

---

# ❓ HÄUFIGE PROBLEME

### "Access blocked: This app's request is invalid"
→ Prüfe die Weiterleitungs-URI in Schritt 4.2

### "Error 403: access_denied"  
→ Füge dich als Testnutzer hinzu (Schritt 3.5)

### "This app isn't verified"
→ Normal! Klicke "Advanced" → "Go to App (unsafe)"

### Refresh Token ist leer
→ Lösche alle Tokens und wiederhole ab Schritt 5.3

---

# 📊 ZUSAMMENFASSUNG

| Schritt | Link | Status |
|---------|------|--------|
| 1. Projekt | https://console.cloud.google.com/projectcreate | ☐ |
| 2. Gmail API | https://console.cloud.google.com/apis/library/gmail.googleapis.com | ☐ |
| 3. OAuth Consent | https://console.cloud.google.com/apis/credentials/consent | ☐ |
| 4. Client-ID | https://console.cloud.google.com/apis/credentials | ☐ |
| 5. Refresh Token | https://developers.google.com/oauthplayground | ☐ |
| 6. Test | OAuth Playground Step 3 | ☐ |

---

*Erstellt: Dezember 2024*
*Für: info@west-money-bau.de*
*Kosten: €0,00*

# ═══════════════════════════════════════════════════════════════════════════════
