# Enterprise Universe Plugin for Claude Code

A comprehensive business management plugin for Claude Code that integrates with HubSpot CRM, Stripe Payments, and automated invoicing.

## Installation

```bash
/plugin marketplace add WestMoneyDE/enterprise-plugin
```

## Available Commands

### CRM & Contacts

| Command | Description |
|---------|-------------|
| `/enterprise-universe:crm` | CRM overview, pipeline status, global search |
| `/enterprise-universe:contacts` | Manage HubSpot contacts (list, search, create, update, delete) |
| `/enterprise-universe:companies` | Manage companies and associations |
| `/enterprise-universe:deals` | Deal management and analytics |

### Payments & Invoicing

| Command | Description |
|---------|-------------|
| `/enterprise-universe:payments` | Stripe payment management, create payment links |
| `/enterprise-universe:invoice` | Generate and send invoices to deals |
| `/enterprise-universe:email` | Send emails, manage templates |

### Operations

| Command | Description |
|---------|-------------|
| `/enterprise-universe:dashboard` | Dashboard statistics and data refresh |
| `/enterprise-universe:security` | Server security monitoring (fail2ban, UFW, SSH) |

## Command Examples

### Contacts
```bash
/enterprise-universe:contacts list
/enterprise-universe:contacts search john@example.com
/enterprise-universe:contacts create john@example.com John Doe
/enterprise-universe:contacts deals 12345
```

### Deals
```bash
/enterprise-universe:deals list
/enterprise-universe:deals won
/enterprise-universe:deals stats
/enterprise-universe:deals search "Enterprise"
```

### Payments
```bash
/enterprise-universe:payments status
/enterprise-universe:payments recent
/enterprise-universe:payments link 100 "Product Purchase"
/enterprise-universe:payments balance
```

### CRM Overview
```bash
/enterprise-universe:crm overview
/enterprise-universe:crm pipeline
/enterprise-universe:crm search "keyword"
/enterprise-universe:crm health
```

### Security
```bash
/enterprise-universe:security status
/enterprise-universe:security logs
/enterprise-universe:security banned
/enterprise-universe:security audit
```

## Plugin Structure

```
enterprise-plugin/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Marketplace configuration
├── commands/                 # Slash commands
│   ├── contacts.md
│   ├── companies.md
│   ├── deals.md
│   ├── crm.md
│   ├── invoice.md
│   ├── payments.md
│   ├── email.md
│   ├── dashboard.md
│   └── security.md
├── skills/
│   └── crm-expert/
│       └── SKILL.md         # CRM expertise skill
├── hooks/
│   └── hooks.json           # Event handlers
└── .mcp.json                # MCP server configuration
```

## Requirements

- Claude Code CLI
- API access to:
  - HubSpot CRM (API Key)
  - Stripe (Live/Test API Key)
  - SMTP Server for emails

## Configuration

The plugin connects to the Enterprise Universe API at:
```
https://app.enterprise-universe.one/api/v1/
```

## Skills

### CRM Expert
The plugin includes a CRM Expert skill with knowledge of:
- HubSpot CRM API v3
- Deal stages and pipelines
- Contact and company associations
- Revenue forecasting

## License

MIT License

## Author

Enterprise Universe
Email: coskun.oemer@gmail.com

---

Built with Claude Code Plugin Framework
