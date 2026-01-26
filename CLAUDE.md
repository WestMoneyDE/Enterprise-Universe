# CLAUDE.md - Enterprise Universe Repository Guide

This document provides AI assistants with comprehensive context for working with the Enterprise Universe / West Money OS codebase.

## Project Overview

**Enterprise Universe** is a PropTech/Smart Home SaaS platform built for the German market. The platform provides:
- AI-powered lead scoring and CRM automation
- Smart home integration (LOXONE, KNX, ComfortClick)
- WhatsApp Business API integration
- Investor data room and reporting
- Multi-channel sales automation

**Organization:** West Money Bau GmbH / Enterprise Universe GmbH i.G.
**Location:** Koln, Germany
**Primary Language:** German (with English translations for investor materials)

## Quick Commands

```bash
# Install dependencies
npm install

# Start development server (with nodemon)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Setup project
npm run setup

# Build Tailwind CSS (west-money-bau)
npm run build:css --prefix west-money-bau

# Build landing page (Astro)
npm run build --prefix landing-page
```

## Repository Structure

```
Enterprise-Universe/
├── api/                    # REST API endpoints (Express.js)
├── automation/             # Sales automation & webhook handlers
├── services/               # Business logic services
├── modules/                # JavaScript utility modules
├── scripts/                # Data processing & utility scripts
├── daemons/                # Background workers (cron jobs)
├── integrations/           # Third-party service connectors
├── dashboards/             # 25+ HTML dashboards
├── west-money-bau/         # PropTech platform (separate app)
│   ├── api/                # Platform-specific API
│   ├── frontend/           # HTML dashboards & portals
│   └── database/           # PostgreSQL migrations
├── landing-page/           # Astro-based static site
├── Data Room/              # Investor due diligence materials
├── email-templates/        # Email template library
├── enterprise-plugin/      # Claude Code business plugin
├── data/                   # Processed data & logs
└── backup/                 # Daily automated backups
```

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.22
- **Database:** PostgreSQL (pg 8.16)
- **Cache:** Redis
- **Task Scheduling:** node-cron

### Frontend
- **Dashboards:** Vanilla HTML/CSS/JavaScript
- **Landing Page:** Astro 5.16 with TailwindCSS
- **CSS Framework:** TailwindCSS 3.4 (west-money-bau)

### Key Dependencies
- `@anthropic-ai/sdk` - Claude AI for lead scoring
- `express` + `helmet` + `cors` - Secure API server
- `nodemailer` - Email sending
- `stripe` - Payment processing
- `ws` - WebSocket support
- `joi` - Request validation
- `jsonwebtoken` + `bcryptjs` + `otplib` - Authentication & 2FA

## Architecture

### Entry Points

| File | Port | Purpose |
|------|------|---------|
| `automation/webhook-server.js` | 3000 | Main webhook server (WhatsApp, forms, VoIP) |
| `api/app.js` | 3000 | Express API server |
| `west-money-bau/api/bau-server.js` | 3016 | PropTech platform API |

### Key Services

| File | Purpose |
|------|---------|
| `services/genius-bots.js` | 12 AI bots (Einstein, Leonardo, Tesla, etc.) |
| `services/email-queue.js` | Rate-limited email queue (10/min) |
| `services/stripe-commerce.js` | Payment processing |
| `services/workflow-engine.js` | Automation orchestration |
| `services/two-factor-auth.js` | TOTP-based 2FA |

### Background Daemons

Critical workers in `daemons/workers/`:
- `health-monitor.js` - Every 5 min system health checks
- `data-sync.js` - Every 30 min HubSpot sync
- `payment-processor.js` - Every 15 min Stripe processing
- `lead-nurturing.js` - Every 4 hours auto follow-ups
- `report-generator.js` - Daily reports at 8 AM

### API Endpoints

Key files in `api/`:
- `app.js` - Main server with DSGVO consent management
- `hubspot-integration.js` - HubSpot CRM sync
- `customer-planning.js` - Quote/project generation
- `contact-notifications.js` - Email/SMS triggers
- `investor-signup.js` - Investor onboarding

## Coding Conventions

### JavaScript Style
- ES6+ features (async/await, destructuring, arrow functions)
- CommonJS modules (`require()`, `module.exports`)
- JSDoc comments for documentation
- Console logging with prefixes: `[ServiceName]`

### Error Handling
```javascript
try {
  // operation
} catch (error) {
  console.error('[ServiceName] Error:', error.message);
  // handle error
}
```

### API Response Format
```javascript
// Success
res.json({ success: true, data: {...} });

// Error
res.status(400).json({ error: 'Error message' });
```

### Database Conventions
- PostgreSQL with UUID primary keys
- Snake_case column names
- Timestamps: `created_at`, `updated_at`
- Foreign keys with `ON DELETE SET NULL`

### Security
- Helmet.js for HTTP headers
- Rate limiting (100 req/15 min default)
- JWT authentication
- DSGVO/GDPR consent management
- Input validation with Joi

## Environment Configuration

Copy `.env.example` to `.env` and configure:

### Required Variables
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/westmoney_os
JWT_SECRET=<32+ characters>
```

### Integration Keys
```env
# HubSpot CRM
HUBSPOT_API_KEY=pat-eu1-...
HUBSPOT_PORTAL_ID=...

# WhatsApp Business
WHATSAPP_ACCESS_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...

# Payment
STRIPE_SECRET_KEY=sk_live_...

# Email
SMTP_HOST=smtp.ionos.de
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

### Feature Flags
```env
FEATURE_WHATSAPP=true
FEATURE_LOXONE=true
FEATURE_AI_BOT=true
FEATURE_ANALYTICS=true
```

## Testing

- **Framework:** Jest 29.7
- **Linting:** ESLint 8.56
- **Run tests:** `npm test`
- **Run linter:** `npm run lint`

Note: Test files are not yet implemented. When adding tests, follow patterns:
- `*.test.js` or `*.spec.js` naming
- Mock external services (HubSpot, WhatsApp, database)
- Focus on API endpoints, daemons, and services

## Deployment

### Production Server
- **Host:** 81.88.26.204
- **User:** administrator
- **Domain:** enterprise-universe.one

### Deployment Steps
```bash
# 1. Build assets
npm run build --prefix landing-page
npm run build:css --prefix west-money-bau

# 2. Deploy via SCP
scp -r ./dist administrator@81.88.26.204:/var/www/

# 3. Restart services
ssh administrator@81.88.26.204 "sudo systemctl restart nginx"

# 4. Verify
curl -I https://enterprise-universe.one
```

### GitHub Pages (Landing)
```bash
npm run deploy --prefix landing-page
```

## Integrations

### Active
- **HubSpot CRM** - Contacts, deals, companies
- **WhatsApp Business** - Two-way messaging via Meta API
- **Zadarma VoIP** - Phone integration
- **Slack** - Team notifications
- **Stripe** - Payment processing

### Smart Home
- **LOXONE** - Miniserver control via WebSocket
- **Verisure** - Security system
- **ComfortClick** - bOS automation

### AI
- **Claude (Anthropic)** - Lead scoring, content generation
- **OpenAI** - Fallback AI services

## Data Room Structure

Investor materials in `Data Room/`:
```
00_NDA/           - Confidentiality agreements (DE/EN)
01_Executive_Summary/
02_Legal_Corporate/ - Cap table, term sheets
03_Pitch_Deck/
04_Outreach/      - Investor emails, campaigns
05_Won_Deals/     - Closed deals, invoices
06_Financials/    - Financial models
07_Product/
08_Market/        - TAM/SAM/SOM analysis
09_Team/
10_Appendix/
11_Due_Diligence/
12_Investor_Materials/ - One-pagers, FAQs
```

## Dashboard Overview

Key dashboards in `dashboards/`:
- `MASTER_CONTROL_DASHBOARD.html` - Central control panel
- `DEALS_PIPELINE_5MIO.html` - Pipeline visualization
- `INVESTOREN_DASHBOARD.html` - Investor metrics
- `FULL_EMAIL_TRACKING_DASHBOARD.html` - Email analytics
- `MEGA_KAMPAGNEN_DASHBOARD.html` - Campaign management
- `genius-hub.html` - AI bot control center

Root-level dashboards:
- `HAIKU_GOD_MODE_V2.html` - Admin control
- `GOD_MODE_DASHBOARD.html` - System control
- `GENIUS_AGENCY_CONTROL_CENTER.html` - AI management
- `INVESTOR_PORTAL.html` - Investor access

## Common Tasks

### Adding a New API Endpoint
1. Create handler in `api/` directory
2. Register route in `api/app.js`
3. Add Joi validation schema
4. Implement DSGVO consent checks if needed
5. Add error handling and logging

### Adding a Background Worker
1. Create worker in `daemons/workers/`
2. Register in `daemons/daemon-manager.js` with cron schedule
3. Use shared utilities from `daemons/workers/utils/`
4. Add health check if critical

### Adding Email Templates
1. Add template JSON to `email-templates/templates/`
2. Register in `services/email-templates.js`
3. Use Handlebars syntax for variables

### HubSpot Integration
1. Use `api/hubspot-integration.js` for API calls
2. Custom properties are prefixed (e.g., `haiku_score`)
3. Webhook handlers in `automation/webhook-server.js`
4. Sync runs every 30 min via data-sync daemon

## Important Notes

### DSGVO/GDPR Compliance
- All consent is tracked in localStorage and audit logs
- WhatsApp requires explicit opt-in before messaging
- Email campaigns must check consent status
- Max 100 audit entries retained per entity

### Rate Limits
- API: 1000 requests per 15 minutes
- Webhooks: 100 requests per 15 minutes
- Email sending: 10 emails per minute

### Language
- Code comments and variables: English
- User-facing content: German (with EN translations)
- Database fields: snake_case in English

### File Naming
- Dashboards: `SCREAMING_SNAKE_CASE.html`
- Scripts: `kebab-case.js`
- Services: `kebab-case.js`
- Configuration: `kebab-case.json`

## Troubleshooting

### Common Issues

**HubSpot sync failing:**
- Check `HUBSPOT_API_KEY` is valid
- Verify rate limits not exceeded
- Check `data-sync.js` daemon logs

**Email not sending:**
- Verify SMTP credentials in `.env`
- Check `services/email-queue.js` rate limits
- Review bounce logs in `data/`

**WhatsApp messages failing:**
- Verify Meta Business API token
- Check phone number is verified
- Ensure template is approved

**Database connection issues:**
- Verify `DATABASE_URL` format
- Check PostgreSQL is running
- Verify pool settings (min: 2, max: 10)

## Git Workflow

### Branch Naming
- Features: `claude/<feature-name>-<session-id>`
- Fixes: `fix/<issue-description>`

### Commit Messages
Follow conventional commits:
```
feat: add new dashboard feature
fix: resolve email queue issue
docs: update API documentation
refactor: improve HubSpot sync logic
```

### Daily Backups
Automated daily backups at 03:00 to:
```
backup/daily/YYYY-MM-DD/
├── api/
├── automation/
├── config/
├── MANIFEST.md
└── backup-stats.json
```

## Contact

- **Company:** Enterprise Universe GmbH i.G.
- **CEO:** Omer Huseyin Coskun
- **Email:** info@enterprise-universe.com
- **Website:** https://enterprise-universe.de
- **GitHub:** https://github.com/WestMoneyDE
