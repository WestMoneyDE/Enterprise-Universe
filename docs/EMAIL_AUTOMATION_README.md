# ═══════════════════════════════════════════════════════════════════════════════
# WEST MONEY BAU - EMAIL AUTOMATION
# Einsatzbereit für info@west-money-bau.de
# ═══════════════════════════════════════════════════════════════════════════════

## ✅ STATUS: KONFIGURIERT UND EINSATZBEREIT

```
E-Mail:        info@west-money-bau.de
App-Passwort:  ✅ Aktiv
SMTP Server:   smtp.gmail.com
```

---

## 🚀 SCHNELLSTART

### 1. Auf deinem Computer installieren:

```bash
# Ordner erstellen
mkdir westmoney-email
cd westmoney-email

# Package initialisieren
npm init -y

# Nodemailer installieren
npm install nodemailer

# email-sender.js Datei hierher kopieren
```

### 2. E-Mails senden:

```bash
# Test E-Mail senden (an dich selbst)
node email-sender.js test

# ComfortClick Partner-Anfrage
node email-sender.js comfortclick

# LOXONE Angebotsanfrage
node email-sender.js loxone

# Immobilienmakler Anfrage
node email-sender.js immobilien

# Verisure Erweiterung
node email-sender.js verisure

# ALLE E-Mails auf einmal senden
node email-sender.js all
```

---

## 📧 VORDEFINIERTE E-MAILS

| Befehl | Empfänger | Beschreibung |
|--------|-----------|--------------|
| `test` | info@west-money-bau.de | Test-E-Mail an dich selbst |
| `comfortclick` | partners@comfortclick.com | Partner-Anfrage |
| `loxone` | info@smarthome-koeln.de | Angebotsanfrage €35-42k |
| `immobilien` | info@engel-voelkers.com | Mietgesuch Ehrenstraße |
| `verisure` | partner@verisure.de | Partnerschaft erweitern |

---

## 🔐 CREDENTIALS

```
SMTP Host:     smtp.gmail.com
SMTP Port:     587
E-Mail:        info@west-money-bau.de
App-Passwort:  irba vpex elkw biae (ohne Leerzeichen: irbavpexelkwbiae)
```

---

## 📝 EIGENE E-MAILS HINZUFÜGEN

Füge in `email-sender.js` unter `EMAILS` hinzu:

```javascript
meine_email: {
  to: 'empfaenger@example.com',
  cc: 'info@west-money-bau.de',  // optional
  subject: 'Betreff hier',
  body: `Nachrichtentext hier...`
},
```

Dann senden mit: `node email-sender.js meine_email`

---

## 🔄 ZAPIER INTEGRATION (Optional)

Webhook URL erstellen für automatischen Versand:

1. Zapier.com → Create Zap
2. Trigger: Webhook
3. Action: Code (JavaScript)
4. Code einfügen aus email-sender.js

---

## ⚠️ SICHERHEITSHINWEISE

1. **App-Passwort geheim halten** - Nicht teilen!
2. **.env nicht in Git** - In .gitignore eintragen
3. **Bei Kompromittierung:** App-Passwort löschen unter:
   https://myaccount.google.com/apppasswords

---

## 📊 LIMITS

| Limit | Wert |
|-------|------|
| E-Mails pro Tag (Workspace) | 2.000 |
| E-Mails pro Minute | 100 |
| Empfänger pro E-Mail | 500 |

---

*Erstellt: Dezember 2024*
*Für: West Money Bau GmbH*
*Absender: info@west-money-bau.de*

# ═══════════════════════════════════════════════════════════════════════════════
