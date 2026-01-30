# Lead Acquisition System Design

**Date:** 2026-01-30
**Status:** Approved
**Budget:** €0
**Timeline:** ASAP
**Hosting:** one.com VPS

---

## 1. Executive Summary

Unified lead acquisition and qualification system for Nexus Command Center with:
- Multi-source lead ingestion (Web Forms, HubSpot, Free External APIs)
- Email verification pipeline (Pattern + MX + SMTP)
- Real-time lead scoring (Engagement-heavy: 40/30/20/10)
- Local DB as master with bi-directional HubSpot sync
- Bauherren-Pass with 2.5% commission on revenue
- Full revenue attribution per contact
- Auto-nurturing email sequences
- WhatsApp integration
- GDPR compliance with granular consent

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXUS LEAD ACQUISITION SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                    │
│   │  Web Forms   │   │   HubSpot    │   │ Free APIs    │                    │
│   │   Capture    │   │    Import    │   │  (Google,    │                    │
│   └──────┬───────┘   └──────┬───────┘   │  Registers)  │                    │
│          │                  │           └──────┬───────┘                    │
│          └──────────────────┼──────────────────┘                            │
│                             ▼                                                │
│              ┌──────────────────────────────┐                               │
│              │    EMAIL VERIFICATION        │                               │
│              │  ┌────────────────────────┐  │                               │
│              │  │ 1. Pattern Validation  │  │                               │
│              │  │ 2. DNS/MX Check        │  │                               │
│              │  │ 3. SMTP Verification   │  │                               │
│              │  └────────────────────────┘  │                               │
│              └──────────────┬───────────────┘                               │
│                             ▼                                                │
│              ┌──────────────────────────────┐                               │
│              │      LOCAL DATABASE          │  ◄── Source of Truth          │
│              │  Contacts ↔ Deals            │                               │
│              │  Full Revenue Attribution    │                               │
│              └──────────────┬───────────────┘                               │
│                             │                                                │
│              ┌──────────────┴───────────────┐                               │
│              │       LEAD SCORING           │                               │
│              │  Engagement: 40%             │                               │
│              │  Behavioral: 30%             │                               │
│              │  Demographic: 20%            │                               │
│              │  Firmographic: 10%           │                               │
│              └──────────────┬───────────────┘                               │
│                             │                                                │
│                    ┌────────┴────────┐                                      │
│                    ▼                 ▼                                       │
│              ┌──────────┐     ┌──────────────┐                              │
│              │ HubSpot  │◄───►│  Dashboard   │                              │
│              │ Bi-Sync  │     │  (SciFi UI)  │                              │
│              └──────────┘     └──────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Email Verification Pipeline

### 3.1 Verification Stages

**Stage 1: Pattern Validation** (instant)
- Random number sequences (5+ digits): REJECT
- Test/fake patterns (test@, fake@, demo@): REJECT
- Disposable domains (500+ blacklist): REJECT
- Keyboard mash (asdfgh@, qwerty@): REJECT

**Stage 2: DNS/MX Validation** (~100ms)
- Check domain has valid MX records
- Reject if domain cannot receive email

**Stage 3: SMTP Verification** (~1-2s)
- Connect to mail server
- Verify mailbox exists via RCPT TO
- No actual email sent

### 3.2 Implementation

```typescript
interface VerificationResult {
  isValid: boolean;
  score: number;           // 0-100 quality score
  reason?: string;
  checks: {
    pattern: boolean;
    disposable: boolean;
    mxRecord: boolean;
    smtpValid: boolean;
  };
}
```

### 3.3 Budget Note
- €0 budget = Own SMTP verification only
- No paid services (ZeroBounce, NeverBounce)

---

## 4. Lead Scoring Engine

### 4.1 Weights
- Engagement: 40%
- Behavioral: 30%
- Demographic: 20%
- Firmographic: 10%

### 4.2 Grades
- A: 80-100 points
- B: 60-79 points
- C: 40-59 points
- D: 0-39 points

### 4.3 Scoring Signals

**Engagement (40%)**
| Signal | Points | Decay |
|--------|--------|-------|
| Email opened | +5 | -1/week |
| Email clicked | +10 | -2/week |
| Presentation viewed | +15 | -2/week |
| Presentation completed | +25 | -3/week |
| Website visit | +3 | -1/week |
| Multiple sessions | +10 | -2/week |

**Behavioral (30%)**
| Signal | Points |
|--------|--------|
| Contact form submitted | +20 |
| Bauherren-Pass requested | +30 |
| Kundenkarte created | +25 |
| Meeting scheduled | +35 |
| Quote requested | +40 |
| Document downloaded | +15 |

**Demographic (20%)**
| Signal | Points |
|--------|--------|
| DACH region (DE/AT/CH) | +15 |
| Valid phone number | +10 |
| Company provided | +10 |
| Job title: Decision maker | +20 |
| LinkedIn profile | +5 |

**Firmographic (10%)**
| Signal | Points |
|--------|--------|
| B2B company | +15 |
| Construction/Real Estate | +25 |
| Company size 10-500 | +15 |
| Has website | +5 |

---

## 5. Bauherren-Pass & Commission

### 5.1 Commission Model
- Rate: **2.5% of deal revenue**
- Payout: Automatic after customer payment
- Method: Stripe + SEPA bank transfer
- Recipient: System owner

### 5.2 Workflow
1. Lead qualifies (Score ≥ 60, Grade A/B)
2. Bauherren-Pass created
3. Deal created (Local DB + HubSpot sync)
4. Contact-Deal link with revenue attribution
5. Kundenkarte generated
6. Deal won → Commission calculated
7. Customer pays → Commission auto-payout

### 5.3 Schema
```typescript
bauherrenPass: {
  dealId: uuid,
  contactId: uuid,
  estimatedRevenue: number,
  actualRevenue: number,
  commissionRate: 0.025,        // 2.5% fixed
  commissionAmount: number,
  commissionStatus: 'pending' | 'qualified' | 'approved' | 'paid',
  commissionPaidAt: timestamp,
}
```

---

## 6. Deal-Contact Revenue Attribution

### 6.1 Schema
```typescript
dealContacts: {
  id: uuid,
  dealId: uuid,
  contactId: uuid,

  // Role
  role: 'primary' | 'decision_maker' | 'influencer' | 'billing' | 'technical',
  isPrimary: boolean,

  // Attribution
  revenueShare: number,           // Percentage (0.0-1.0)
  attributedRevenue: number,
  commissionShare: number,

  // Source Tracking
  source: string,
  campaign: string,
  firstTouchAt: timestamp,
  lastTouchAt: timestamp,

  // Engagement
  touchpoints: number,
  engagementScore: number,
}
```

### 6.2 Attribution Rules
- Primary Contact: minimum 50%
- Decision Maker bonus: +20%
- First Touch bonus: +10%
- Remaining: distributed by touchpoints
- Sum always = 100%

---

## 7. HubSpot Integration

### 7.1 Cleanup (One-time)
**Moderate Rules:**
- Random number sequences in email
- Disposable domains
- Invalid MX records
- Test patterns (test@, fake@, demo@)

**Process:**
1. Scan all contacts (read-only)
2. Generate report
3. Manual review/approval
4. Batch delete with rate limiting

### 7.2 Bi-Directional Sync
- **Local → HubSpot:** New verified contacts, deals, scores, stages
- **HubSpot → Local:** Deal updates, stage changes, engagement events
- **Conflict Resolution:** Local DB wins (master)
- **Sync Interval:** 60 seconds

---

## 8. Auto-Nurturing Sequences

### 8.1 Sequences
| # | Name | Trigger | Emails |
|---|------|---------|--------|
| 1 | Welcome | New verified lead | 3 emails (Day 0, 3, 7) |
| 2 | Score Upgrade | B→A grade change | 1 email (personal invite) |
| 3 | Re-Engage | 30 days inactive | 3 emails |
| 4 | Post-Presentation | Viewed presentation | 2 emails (Bauherren-Pass offer) |
| 5 | Deal Stalled | 14+ days no progress | 2 emails (reminder + new offer) |

### 8.2 Email System
- Provider: one.com SMTP (own mailserver)
- Package: Enthusiast
- Languages: German + English

---

## 9. WhatsApp Integration

### 9.1 Setup
- Provider: WhatsApp Business API (Meta Cloud)
- Free tier: 1000 conversations/month

### 9.2 Features
- Notifications (status updates)
- Two-way chat
- Lead capture (incoming)
- Internal score alerts

---

## 10. GDPR Compliance

### 10.1 Double Opt-in
- Email templates: SciFi theme (matching dashboard)
- Languages: German + English

### 10.2 Consent Management
**Granular Consent Tracking:**
- Email marketing
- WhatsApp messages
- Phone calls
- Postal mail

**Data Stored:**
- Consent yes/no per channel
- Timestamp
- IP address
- Consent text shown
- Source

### 10.3 Deletion Rights
- Self-service: User can delete via link
- Admin override: For complex cases
- Audit log: All deletions tracked

---

## 11. User Roles

| Role | Permissions |
|------|-------------|
| Super Admin | Everything + system settings |
| Admin | Everything except system settings |
| Sales Manager | Deals, contacts, commissions, reports |
| Sales Rep | Own deals/contacts only |
| Marketing | Campaigns, lead scoring config |
| Viewer | Read-only |
| Partner/Affiliate | Own leads + commission only |

**Initial Setup:** Single user (Super Admin)

---

## 12. Technical Specifications

### 12.1 Backup
- Frequency: Daily
- Retention: 1 backup (previous deleted after new)
- Storage: Same VPS

### 12.2 Languages
- German (primary)
- English (secondary)

### 12.3 Performance
- Target: Maximum leads/day possible
- Optimization: Async processing, queues

### 12.4 Hosting
- Provider: one.com VPS
- Email: one.com Enthusiast package

---

## 13. Free Lead Sources

Since budget = €0, we use free alternatives:

| Source | Description | Limit |
|--------|-------------|-------|
| Google Places API | Business search | 2500 requests/day free |
| Handelsregister | German company registry | Free public data |
| LinkedIn (manual) | Profile research | No API, manual only |
| Web Forms | Own website capture | Unlimited |
| HubSpot Sync | Existing contacts | Already paid |

---

## 14. Implementation Blocks

### Block 1: Foundation
- [ ] Email Verification Service
- [ ] Lead Scoring Engine (real implementation)
- [ ] Deal-Contact Revenue Attribution schema
- [ ] Bauherren-Pass 2.5% commission update
- [ ] Kundenkarte system refactor

### Block 2: HubSpot Integration
- [ ] Spam cleanup tool
- [ ] Bi-directional sync service
- [ ] ID mapping & conflict resolution
- [ ] All stages revenue tracking

### Block 3: Auto Lead Generator
- [ ] Multi-source ingestion
- [ ] Verification pipeline
- [ ] Duplicate detection
- [ ] Source ROI tracking

### Block 4: Automation & Alerts
- [ ] Score change alerts
- [ ] Auto-nurturing sequences
- [ ] Deal stage automation
- [ ] WhatsApp integration

### Block 5: Dashboard & Compliance
- [ ] Provision dashboard
- [ ] Enhanced Command Deck
- [ ] GDPR compliance (Double opt-in, consent, deletion)
- [ ] User roles system
- [ ] Daily backup system
- [ ] Multi-language (DE/EN)

---

## 15. New Files to Create

```
packages/
├── api/src/
│   ├── services/
│   │   ├── email-verifier.ts
│   │   ├── lead-scoring-engine.ts
│   │   ├── hubspot-sync.ts
│   │   ├── hubspot-cleanup.ts
│   │   ├── auto-nurturing.ts
│   │   └── whatsapp-service.ts
│   └── routers/
│       ├── lead-scoring.ts          # UPDATE
│       ├── deal-contacts.ts         # NEW
│       ├── lead-generator.ts        # NEW
│       ├── provision.ts             # NEW
│       └── gdpr.ts                  # NEW
│
├── db/src/schema/
│   ├── dealContacts.ts              # UPDATE
│   ├── bauherrenPass.ts             # UPDATE
│   ├── leadScores.ts                # NEW
│   ├── emailVerification.ts         # NEW
│   ├── consent.ts                   # NEW
│   └── userRoles.ts                 # NEW
│
apps/web/app/scifi/
├── lead-scoring/page.tsx            # UPDATE
├── provision/page.tsx               # NEW
├── lead-generator/page.tsx          # NEW
└── settings/roles/page.tsx          # NEW
```

---

**Document approved and ready for implementation.**
