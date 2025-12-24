# 🚀 Enterprise-Universe

[![West Money OS](https://img.shields.io/badge/West%20Money%20OS-v2.0-00d4aa?style=for-the-badge)](https://west-money-bau.de)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](https://github.com/WestMoneyDE/Enterprise-Universe)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Genius Agency](https://img.shields.io/badge/Genius%20Agency-12%20Bots-gold?style=for-the-badge)](#-genius-agency)

**West Money OS - Smart Home & PropTech Platform**

*LOXONE Partner | Barrierefreies Bauen | Enterprise Solutions | AI Bot Agency*

[Website](https://west-money-bau.de) • [Documentation](#dokumentation) • [Dashboards](#dashboards) • [Genius Agency](#-genius-agency)

---

## 🆕 NEW: Genius Bot Agency

Die **Genius Agency** ist unser AI Bot Command Center mit 12 spezialisierten Genius Bots!

| Bot | Rolle | Spezialisierung |
|-----|-------|-----------------|
| 🔬 **EINSTEIN** | Der Analytiker | Predictive Analytics, KPI, Finanzprognosen |
| 🎨 **LEONARDO** | Der Kreative | UI/UX Design, Branding, Pitch Decks |
| ⚡ **TESLA** | Der Innovator | LOXONE, IoT, Smart Home Automation |
| ⚔️ **SUN TZU** | Der Stratege | Marktanalyse, Wettbewerb, Sales Strategie |
| 🏛️ **ARISTOTELES** | Der Philosoph | Logik, Ethik, Entscheidungsfindung |
| 🔮 **NOSTRADAMUS** | Der Prophet | Forecasting, Trends, Risk Analysis |
| 🎭 **MACHIAVELLI** | Der Taktiker | Verhandlung, Investor Relations |
| 🔍 **SHERLOCK** | Der Detektiv | Research, Due Diligence, Intel |
| 💡 **EDISON** | Der Erfinder | Prototyping, A/B Testing, Innovation |
| 🎼 **MOZART** | Der Komponist | Content, Copywriting, Brand Voice |
| 🌍 **COLUMBUS** | Der Entdecker | Market Expansion, Partnerships |
| ⚗️ **CURIE** | Die Forscherin | Data Mining, Deep Research, QA |

---

## 📋 Übersicht

**Enterprise-Universe** ist das zentrale Repository für die West Money OS Plattform - eine umfassende Smart Home Management und PropTech Lösung mit integrierter AI Bot Agency.

### 🏢 Unternehmen

| Info | Details |
|------|---------|
| **Firma** | West Money Bau GmbH |
| **CEO** | Ömer Hüseyin Coşkun |
| **Holding** | Enterprise Universe GmbH |
| **Standort** | Köln, Deutschland |
| **Branche** | PropTech / Smart Home / Barrierefreies Bauen |
| **Umsatz 2024** | €847.523 (+23,5% YoY) |

### 🎯 Kernbereiche

- 🏠 **Smart Home Installation** - LOXONE Gold Partner
- ♿ **Barrierefreies Bauen** - Seniorengerecht & Pflege
- 🔐 **Sicherheitssysteme** - Verisure Partner
- 📱 **West Money OS** - SaaS Plattform (Launch: 01.01.2026)
- 🧠 **Genius Agency** - AI Bot Command Center

---

## 📁 Projektstruktur

```
Enterprise-Universe/
│
├── 📁 genius-agency/                    # 🆕 AI Bot Command Center
│   ├── GENIUS_AGENCY_CONTROL_CENTER.html
│   ├── api/
│   │   └── genius-bot-engine.js
│   └── config/
│       └── genius-bots-config.json
│
├── 📁 whatsapp-hub/                     # 🆕 WhatsApp Auth & Consent
│   ├── WHATSAPP_AUTH_DASHBOARD.html
│   └── api/
│       └── consent-manager.js
│
├── 📁 dashboards/                       # Control Centers
│   ├── MASTER_CONTROL_DASHBOARD.html
│   ├── FINANCE_LEADS_CONTROL_HUB.html
│   ├── MEGA_EMAIL_HUB.html
│   ├── INVESTOREN_DASHBOARD.html
│   └── TECH_PARTNER_DASHBOARD.html
│
├── 📁 api/                              # Backend Services
│   ├── hubspot-consent.js
│   ├── hubspot-integration.js
│   └── email-sender.js
│
├── 📁 automation/                       # Automatisierung
│   ├── sales-automation-engine.js
│   └── webhook-server.js
│
├── 📁 integrations/                     # API Integrationen
│   ├── REVOLUT_INTEGRATION_HUB.html
│   ├── hubspot-sync.html
│   └── consent-manager.html
│
├── 📁 docs/                             # Dokumentation
├── 📁 pitch/                            # Investor Materials
├── 📁 js/                               # Shared JavaScript
├── 📁 styles/                           # CSS/Themes
│
├── 📄 package.json
├── 📄 .env.example
├── 📄 README.md
└── 📄 CHANGELOG.md
```

---

## 🧠 Genius Agency

### Command Center Features

```
@einstein analyse die Q4 Verkaufsdaten
@leonardo erstelle ein Pitch Deck für Investoren
@tesla optimiere die LOXONE Konfiguration
@sherlock recherchiere Lead: Firma XYZ
@all starte die wöchentliche Analyse
```

### Verfügbare Workflows

| Workflow | Bots | Beschreibung |
|----------|------|--------------|
| **Lead Qualification** | Sherlock → Einstein → Sun Tzu | Research, Scoring, Strategie |
| **Investor Outreach** | Sherlock → Machiavelli → Leonardo → Mozart | Due Diligence, Mapping, Deck, Emails |
| **Smart Home Project** | Tesla → Edison → Einstein | Config, Prototype, KPIs |
| **Market Expansion** | Columbus → Curie → Nostradamus → Sun Tzu | Research, Data, Forecast, Strategy |

### API Endpoints

```javascript
// Get all bots
GET /api/genius-agency/bots

// Execute task
POST /api/genius-agency/execute
{
  "botId": "einstein",
  "taskType": "lead_scoring",
  "input": { "lead": {...} }
}

// Execute workflow
POST /api/genius-agency/workflow
{
  "workflowId": "lead_qualification",
  "input": { "company": "Firma XYZ" }
}

// Parse command
POST /api/genius-agency/command
{
  "command": "@einstein analyse Q4 Daten"
}
```

---

## 📱 WhatsApp Auth Hub

DSGVO-konformes WhatsApp Consent Management mit HubSpot Integration.

### Features

- ✅ Bulk Opt-In / Opt-Out Management
- ⚖️ Rechtsgrundlage-Tracking (DSGVO Art. 6)
- 🧡 Automatische HubSpot CRM Synchronisation
- 📊 Consent Statistics Dashboard
- 📝 Audit Trail für alle Änderungen

### API Endpoints

```javascript
// Bulk Update Consent
POST /api/whatsapp/consent/bulk-update
{
  "contactIds": ["123", "456"],
  "status": "opt_in",
  "legalBasis": "consent",
  "explanation": "Einwilligung per Telefon erhalten"
}

// Get Statistics
GET /api/whatsapp/consent/stats

// Get Contacts by Status
GET /api/whatsapp/consent/contacts/opt_in
```

---

## 🖥️ Dashboards

| Dashboard | Beschreibung | Status |
|-----------|--------------|--------|
| 🧠 **Genius Agency** | AI Bot Command Center | ✅ Live |
| 📱 **WhatsApp Auth** | Consent Management | ✅ Live |
| 🎛️ **Master Control** | Zentrale Übersicht | ✅ Live |
| 💰 **Finance & Leads** | Umsatz, Pipeline, CRM | ✅ Live |
| 📧 **Mega Email Hub** | 55+ E-Mail Kampagnen | ✅ Live |
| 💼 **Investor Dashboard** | 22 Investor E-Mails | ✅ Live |
| 🤝 **Tech Partner Hub** | 22 Partner E-Mails | ✅ Live |
| 🏦 **Revolut Integration** | Payment API Setup | ✅ Live |

---

## 🔗 Integrationen

### Aktive Verbindungen

| Service | Status | Beschreibung |
|---------|--------|--------------|
| 🧡 **HubSpot CRM** | ✅ Verbunden | Lead Management & E-Mail |
| 📱 **WhatsApp Business** | ✅ Verbunden | Kundenkonmmunikation |
| 📞 **Zadarma VoIP** | ✅ Verbunden | Telefonie |
| 📧 **Gmail SMTP** | ✅ Verbunden | E-Mail Versand |
| 💬 **Slack** | ✅ Verbunden | Team Notifications |
| 🤖 **Anthropic Claude** | ✅ Verbunden | Genius Agency AI |

### In Entwicklung

| Service | Status | Ziel |
|---------|--------|------|
| 🏦 **Revolut** | ⏳ Setup | Payment Processing |
| 🏠 **LOXONE** | 🔄 Partner | Smart Home API |
| 🔐 **Verisure** | 🔄 Partner | Security Integration |
| 📊 **Explorium** | ⏳ Setup | B2B Data Enrichment |
| 💳 **Stripe** | ⏳ Setup | SaaS Payments |

---

## 🚀 Quick Start

### Installation

```bash
# Repository klonen
git clone git@github.com:WestMoneyDE/Enterprise-Universe.git
cd Enterprise-Universe

# Dependencies installieren
npm install

# Environment konfigurieren
cp .env.example .env
# .env Datei mit deinen API Keys ausfüllen
```

### Environment Variables

```env
# Anthropic (Genius Agency)
ANTHROPIC_API_KEY=sk-ant-...

# HubSpot
HUBSPOT_API_KEY=pat-...

# WhatsApp Business
WHATSAPP_PHONE_ID=...
WHATSAPP_ACCESS_TOKEN=...

# Zadarma
ZADARMA_KEY=...
ZADARMA_SECRET=...

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Server
PORT=3000
NODE_ENV=production
```

### Server starten

```bash
# Development
npm run dev

# Production
npm start
```

### Dashboards öffnen

```bash
# Genius Agency
open genius-agency/GENIUS_AGENCY_CONTROL_CENTER.html

# WhatsApp Auth Hub
open whatsapp-hub/WHATSAPP_AUTH_DASHBOARD.html

# Master Control
open dashboards/MASTER_CONTROL_DASHBOARD.html
```

---

## 📊 KPIs & Metriken

### Finanzen 2024/2025

| Metrik | Wert |
|--------|------|
| 💵 Umsatz 2024 | €847.523 |
| 📈 Wachstum | +23,5% |
| 🎯 Pipeline | €425.000 |
| 👥 Kunden | 34 aktiv |
| 💰 Funding Ziel | €1.5M Seed |

### SaaS Ziele (West Money OS)

| Jahr | ARR | Kunden |
|------|-----|--------|
| 2026 | €180K | 250 |
| 2027 | €650K | 900 |
| 2028 | €1.4M | 2.000 |

---

## 🛠️ Tech Stack

### Frontend
- HTML5 / CSS3 / JavaScript
- React (geplant für v3.0)
- Tailwind CSS

### Backend
- Node.js / Express
- TypeScript (Migration geplant)
- PostgreSQL

### AI / ML
- Anthropic Claude (Genius Agency)
- Custom Prompt Engineering

### APIs
- HubSpot API v3
- WhatsApp Business API v17
- Anthropic Messages API
- Zadarma API
- Stripe API
- Explorium B2B API

### Infrastructure
- Ubuntu 24.04 (one.com Cloud Server)
- GitHub Actions (CI/CD)
- Vercel (Frontend Hosting)

---

## 📞 Kontakt

**West Money Bau GmbH**

| Kanal | Info |
|-------|------|
| 📧 E-Mail | [info@west-money-bau.de](mailto:info@west-money-bau.de) |
| 🌐 Website | [west-money-bau.de](https://west-money-bau.de) |
| 📍 Standort | Köln, Deutschland |
| 🐙 GitHub | [@WestMoneyDE](https://github.com/WestMoneyDE) |
| 💼 LinkedIn | [West Money Bau](https://linkedin.com/company/west-money-bau) |

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei.

---

## 🔄 Changelog

### v2.0.0 (24.12.2025)
- 🆕 **Genius Agency** - AI Bot Command Center mit 12 Bots
- 🆕 **WhatsApp Auth Hub** - Consent Management System
- 🆕 **Workflow Engine** - Multi-Bot Automatisierung
- ✨ Anthropic Claude Integration
- 📱 HubSpot WhatsApp Consent Sync
- 🎨 Neue Dashboard Designs

### v1.0.0 (Initial Release)
- Master Control Dashboard
- Finance & Leads Hub
- Mega Email Hub
- Investor & Tech Partner Dashboards
- Revolut Integration

---

**Made with ❤️ in Köln**

*Enterprise Universe | West Money Bau GmbH | © 2025*

```
   _____ ______ _   _ _____ _    _  _____            _____ ______ _   _  ______     __
  / ____|  ____| \ | |_   _| |  | |/ ____|     /\   / ____|  ____| \ | |/ ____\ \   / /
 | |  __| |__  |  \| | | | | |  | | (___      /  \ | |  __| |__  |  \| | |     \ \_/ / 
 | | |_ |  __| | . ` | | | | |  | |\___ \    / /\ \| | |_ |  __| | . ` | |      \   /  
 | |__| | |____| |\  |_| |_| |__| |____) |  / ____ \ |__| | |____| |\  | |____   | |   
  \_____|______|_| \_|_____|____/|_____/  /_/    \_\_____|______|_| \_|\_____|  |_|   
                                                                                       
                    🧠 12 Genius Bots at your service! 🧠
```
