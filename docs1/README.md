# 🚀 GTz Ecosystem - Sales Automation Engine

**Vollautomatisches Lead-zu-Vertrag System mit HubSpot, WhatsApp Business & AI**

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![DSGVO](https://img.shields.io/badge/DSGVO-konform-green)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## 📋 Übersicht

Das GTz Ecosystem ist eine vollautomatische Sales-Automation-Plattform, die:

- ✅ **Leads automatisch findet** (Web-Formulare, WhatsApp, Telefon)
- ✅ **AI-basiertes Lead-Scoring** durchführt
- ✅ **WhatsApp Business Consent** DSGVO-konform verwaltet
- ✅ **Automatische Follow-Ups** sendet
- ✅ **Angebote & Verträge** generiert
- ✅ **Mit HubSpot CRM** synchronisiert

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        GTz Ecosystem                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   WhatsApp   │    │   HubSpot    │    │   Zadarma    │     │
│   │   Business   │◄──►│     CRM      │◄──►│    VoIP      │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│   ┌─────────────────────────────────────────────────────┐      │
│   │              Webhook Server (Express.js)            │      │
│   └─────────────────────────────────────────────────────┘      │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │  AI Lead     │    │  Automation  │    │  Contract    │     │
│   │  Scoring     │    │  Workflows   │    │  Generator   │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Installation

```bash
# Repository klonen
git clone https://github.com/enterprise-universe/gtz-ecosystem.git
cd gtz-ecosystem

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp automation/.env.example automation/.env
```

### 2. API-Keys eintragen

Bearbeite `automation/.env`:

```env
# HubSpot
HUBSPOT_API_KEY=pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# WhatsApp Business
WHATSAPP_API_KEY=EAAxxxxxxxx...
WHATSAPP_PHONE_ID=123456789012345

# Zadarma
ZADARMA_API_KEY=xxxxxxxxxxxxxx
ZADARMA_SECRET=xxxxxxxxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxx...
```

### 3. Server starten

```bash
# Entwicklung
npm run dev

# Produktion
npm start
```

### 4. Webhooks konfigurieren

| Service | Webhook URL |
|---------|-------------|
| WhatsApp | `https://deine-domain.de/webhook/whatsapp` |
| Zadarma | `https://deine-domain.de/webhook/zadarma` |
| HubSpot | `https://deine-domain.de/webhook/hubspot` |

---

## 📁 Projektstruktur

```
gtz-ecosystem/
├── automation/
│   ├── sales-automation-engine.js   # Haupt-Automation-Engine
│   ├── webhook-server.js            # Express Webhook Server
│   └── .env.example                 # Umgebungsvariablen Template
│
├── api/
│   └── hubspot-consent.js           # HubSpot Consent API
│
├── *.html                           # Frontend-Seiten
│   ├── index.html                   # Haupt-Dashboard
│   ├── live-dashboard.html          # Echtzeit-Dashboard
│   ├── gtzhub.html                  # Finance & Leads
│   ├── consent-manager.html         # WhatsApp Consent Manager
│   └── ...
│
├── app.js                           # Frontend JavaScript
├── package.json
└── README.md
```

---

## 🔧 Konfiguration

### HubSpot Setup

1. Gehe zu **Settings > Integrations > Private Apps**
2. Erstelle neue Private App
3. Benötigte Scopes:
   - `crm.objects.contacts` (read/write)
   - `crm.objects.deals` (read/write)
   - `crm.objects.companies` (read/write)
   - `crm.schemas.contacts` (read)

### WhatsApp Business Setup

1. **Meta Business Suite** > WhatsApp > API Setup
2. System User mit Berechtigungen erstellen
3. Permanent Token generieren
4. Phone Number ID kopieren
5. Webhook URL eintragen: `https://deine-domain.de/webhook/whatsapp`
6. Webhook Events aktivieren:
   - `messages`
   - `message_deliveries`
   - `message_reads`

### Zadarma Setup

1. **Zadarma Dashboard** > Einstellungen > API
2. API-Schlüssel erstellen
3. Webhook URL eintragen: `https://deine-domain.de/webhook/zadarma`
4. Events aktivieren:
   - `NOTIFY_START`
   - `NOTIFY_END`
   - `NOTIFY_RECORD`

---

## 📊 API Endpoints

### Webhooks

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/webhook/whatsapp` | WhatsApp Business Webhook |
| POST | `/webhook/zadarma` | Zadarma VoIP Webhook |
| POST | `/webhook/hubspot` | HubSpot Event Webhook |

### REST API

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/api/lead` | Neuen Lead erfassen |
| GET | `/api/leads` | Alle Leads abrufen |
| GET | `/api/deals` | Alle Deals abrufen |
| GET | `/api/stats/pipeline` | Pipeline-Statistiken |
| GET | `/api/stats/automation` | Automation-Statistiken |
| GET | `/api/consent/stats` | Consent-Statistiken |
| POST | `/api/consent/request` | Consent anfragen |
| POST | `/api/proposal/send` | Angebot senden |
| GET | `/api/audit-log` | Audit-Log abrufen |

---

## 🤖 Automatisierungslogik

### Lead-Prozess

```
1. LEAD EINGANG
   ├── Web-Formular → /api/lead
   ├── WhatsApp Nachricht → /webhook/whatsapp
   └── Telefonanruf → /webhook/zadarma
   
2. AI LEAD-SCORING (0-100)
   ├── Basisdaten (+30): Email, Phone, Company
   ├── Engagement (+40): Consent, Opens, Visits
   └── Budget-Indikatoren (+30): Firmengröße
   
3. QUALIFIZIERUNG
   ├── Score ≥80: HOT → Sofort anrufen
   ├── Score ≥60: WARM → Angebot senden
   ├── Score ≥40: NURTURE → Email-Sequenz
   └── Score <40: COLD → Langzeit-Nurturing
   
4. AUTOMATISCHE FOLLOW-UPS
   ├── Tag 1: Intro-Nachricht
   ├── Tag 3: Info-Material
   ├── Tag 7: Terminvorschlag
   ├── Tag 14: Angebot
   └── Tag 30: Final Follow-Up
   
5. DEAL-ABSCHLUSS
   ├── Angebot generieren
   ├── Per WhatsApp senden
   ├── Bei Annahme: Vertrag generieren
   └── HubSpot Deal-Stage aktualisieren
```

---

## 🔒 DSGVO-Compliance

### WhatsApp Consent Flow

```
┌──────────────────┐
│  Neuer Kontakt   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Consent-Anfrage  │
│ via WhatsApp     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│  JA   │ │ NEIN  │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│opt_in  │ │opt_out │
│in HSp  │ │in HSp  │
└────────┘ └────────┘
```

### Dokumentierte Rechtsgrundlagen

- **Art. 6 Abs. 1 lit. a**: Einwilligung (WhatsApp)
- **Art. 6 Abs. 1 lit. b**: Vertragserfüllung
- **Art. 7 Abs. 3**: Widerruf
- **Art. 17**: Recht auf Löschung
- **Art. 20**: Datenportabilität

### Audit-Log

Alle datenschutzrelevanten Aktionen werden protokolliert:
- Consent-Erteilungen/-Widerrufe
- Daten-Exporte
- Lösch-Anfragen
- Automatisierte Nachrichten

Aufbewahrungsfrist: **3 Jahre**

---

## 📈 Dashboard Features

### Live-Dashboard (`live-dashboard.html`)

- Echtzeit-Daten aus HubSpot
- Lead-Liste mit Score
- Deal-Pipeline
- Consent-Statistiken
- Activity-Feed

### Haupt-Dashboard (`index.html`)

- 6 integrierte Module
- DSGVO Cookie-Banner
- Consent-Manager
- Audit-Log

---

## 🛠️ Entwicklung

### Lokale Entwicklung

```bash
# Mit Nodemon (Auto-Reload)
npm run dev

# Tests ausführen
npm test

# Linting
npm run lint
```

### Deployment

```bash
# Mit PM2
pm2 start automation/webhook-server.js --name gtz-ecosystem

# Mit Docker
docker build -t gtz-ecosystem .
docker run -p 3000:3000 --env-file automation/.env gtz-ecosystem
```

---

## 📞 Support

- **E-Mail**: kontakt@enterprise-universe.de
- **Website**: https://enterprise-universe.de
- **Dokumentation**: https://docs.westmoney-bau.de

---

## 📄 Lizenz

Dieses Projekt ist proprietär und gehört Enterprise Universe.
Alle Rechte vorbehalten © 2025

---

## 🙏 Danksagungen

- **HubSpot** für die CRM-API
- **Meta** für die WhatsApp Business API
- **Zadarma** für die VoIP-Integration
- **OpenAI** für die AI-Funktionen
