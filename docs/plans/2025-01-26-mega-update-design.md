# NEXUS COMMAND CENTER - MEGA UPDATE

> Design Document | 26. Januar 2025
> Status: IN REVIEW

---

## Executive Summary

Umfassende Verbesserung des Nexus Command Centers in 4 Bereichen:
1. **Automation Engine** - Echte Workflow-Automatisierung
2. **Dashboard & UX** - Live-Daten, bessere Interaktion
3. **Neue Integrationen** - n8n, Calendar, Slack, erweiterte Webhooks
4. **Code-Qualität** - Testing, Error Handling, Performance

---

## Sektion 1: Automation Engine

### 1.1 Aktuelle Situation

- `scheduledJobs` Tabelle existiert im DB-Schema (audit.ts)
- `services/scheduler/` und `services/queue-worker/` sind leer
- Automation Page zeigt nur Demo-Daten
- Keine echte Job-Ausführung

### 1.2 Architektur-Entscheidung

**Gewählt: BullMQ + Node-Cron + n8n**

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXUS AUTOMATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   BullMQ     │    │  Node-Cron   │    │     n8n      │  │
│  │   Queues     │    │  Scheduler   │    │  Workflows   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                    │          │
│         └───────────────────┼────────────────────┘          │
│                             │                               │
│                      ┌──────▼──────┐                        │
│                      │    Redis    │                        │
│                      └──────┬──────┘                        │
│                             │                               │
│         ┌───────────────────┼───────────────────┐          │
│         │                   │                   │          │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐   │
│  │ Email Worker│    │ Sync Worker │    │Report Worker│   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Neue Package-Struktur

```
packages/queue/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                 # Exports
    ├── connection.ts            # Redis connection
    ├── queues/
    │   ├── index.ts
    │   ├── email.queue.ts       # E-Mail Versand Queue
    │   ├── sync.queue.ts        # HubSpot/CRM Sync Queue
    │   ├── report.queue.ts      # Report Generation Queue
    │   ├── webhook.queue.ts     # Outgoing Webhook Queue
    │   └── automation.queue.ts  # Custom Automation Queue
    ├── workers/
    │   ├── index.ts
    │   ├── email.worker.ts
    │   ├── hubspot-sync.worker.ts
    │   ├── report.worker.ts
    │   ├── webhook.worker.ts
    │   └── automation.worker.ts
    ├── scheduler/
    │   ├── index.ts
    │   ├── cron-manager.ts      # Cron job management
    │   └── jobs/
    │       ├── daily-report.ts
    │       ├── hubspot-sync.ts
    │       ├── lead-scoring.ts
    │       └── data-cleanup.ts
    └── types.ts
```

### 1.4 Queue Definitions

```typescript
// packages/queue/src/queues/automation.queue.ts

import { Queue } from 'bullmq';
import { connection } from '../connection';

export interface AutomationJobData {
  workflowId: string;
  organizationId: string;
  triggeredBy: 'cron' | 'event' | 'webhook' | 'manual';
  triggerData?: Record<string, unknown>;
}

export const automationQueue = new Queue<AutomationJobData>('automation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
```

### 1.5 Scheduler Service Implementation

```typescript
// services/scheduler/src/index.ts

import { CronJob } from 'cron';
import { db } from '@nexus/db';
import { scheduledJobs } from '@nexus/db/schema';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { automationQueue } from '@nexus/queue';

class SchedulerService {
  private jobs: Map<string, CronJob> = new Map();

  async start() {
    console.log('🚀 Scheduler Service starting...');

    // Load active jobs from DB
    const activeJobs = await db.query.scheduledJobs.findMany({
      where: and(
        eq(scheduledJobs.isActive, true),
        isNotNull(scheduledJobs.cronExpression)
      ),
    });

    for (const job of activeJobs) {
      this.registerJob(job);
    }

    // Start polling for one-time jobs
    this.startOneTimeJobPoller();

    console.log(`✅ Loaded ${activeJobs.length} scheduled jobs`);
  }

  private registerJob(job: typeof scheduledJobs.$inferSelect) {
    if (!job.cronExpression) return;

    const cronJob = new CronJob(
      job.cronExpression,
      async () => {
        await this.executeJob(job.id);
      },
      null,
      true,
      job.timezone || 'Europe/Berlin'
    );

    this.jobs.set(job.id, cronJob);
  }

  private async executeJob(jobId: string) {
    // Update status to running
    await db.update(scheduledJobs)
      .set({ status: 'running', lastRunAt: new Date() })
      .where(eq(scheduledJobs.id, jobId));

    // Add to queue for processing
    await automationQueue.add('execute', {
      workflowId: jobId,
      organizationId: '', // Will be set from job data
      triggeredBy: 'cron',
    });
  }

  private startOneTimeJobPoller() {
    setInterval(async () => {
      const dueJobs = await db.query.scheduledJobs.findMany({
        where: and(
          eq(scheduledJobs.isActive, true),
          eq(scheduledJobs.runOnce, true),
          lte(scheduledJobs.scheduledFor, new Date())
        ),
      });

      for (const job of dueJobs) {
        await this.executeJob(job.id);
        await db.update(scheduledJobs)
          .set({ isActive: false })
          .where(eq(scheduledJobs.id, job.id));
      }
    }, 10000); // Check every 10 seconds
  }
}

const scheduler = new SchedulerService();
scheduler.start();
```

### 1.6 API Router für Automation

```typescript
// packages/api/src/routers/automation.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { scheduledJobs } from '@nexus/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { automationQueue } from '@nexus/queue';

export const automationRouter = createTRPCRouter({
  // List all workflows
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'paused', 'error', 'scheduled']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const workflows = await ctx.db.query.scheduledJobs.findMany({
        where: input?.status
          ? eq(scheduledJobs.status, input.status)
          : undefined,
        orderBy: desc(scheduledJobs.createdAt),
      });
      return workflows;
    }),

  // Create workflow
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.string(),
      cronExpression: z.string().optional(),
      scheduledFor: z.date().optional(),
      payload: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [workflow] = await ctx.db.insert(scheduledJobs)
        .values({
          ...input,
          organizationId: ctx.session.user.organizationId,
          createdBy: ctx.session.user.id,
        })
        .returning();
      return workflow;
    }),

  // Trigger manual execution
  trigger: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.query.scheduledJobs.findFirst({
        where: eq(scheduledJobs.id, input.id),
      });

      if (!job) throw new Error('Workflow not found');

      await automationQueue.add('execute', {
        workflowId: job.id,
        organizationId: job.organizationId || '',
        triggeredBy: 'manual',
      });

      return { success: true, message: 'Workflow triggered' };
    }),

  // Pause/Resume
  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(scheduledJobs)
        .set({ isActive: input.isActive })
        .where(eq(scheduledJobs.id, input.id));
      return { success: true };
    }),

  // Get execution logs
  getLogs: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Query from audit logs or a dedicated execution_logs table
      const logs = await ctx.db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.entityType, 'scheduled_job'),
          eq(auditLogs.entityId, input.workflowId)
        ),
        orderBy: desc(auditLogs.createdAt),
        limit: 50,
      });
      return logs;
    }),

  // Stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const workflows = await ctx.db.query.scheduledJobs.findMany({
      where: eq(scheduledJobs.organizationId, ctx.session.user.organizationId),
    });

    return {
      total: workflows.length,
      active: workflows.filter(w => w.isActive && w.status !== 'error').length,
      paused: workflows.filter(w => !w.isActive).length,
      errors: workflows.filter(w => w.status === 'error').length,
      totalExecutions: workflows.reduce((sum, w) => sum + (w.failureCount || 0), 0),
    };
  }),
});
```

---

## Sektion 2: Dashboard & UX Verbesserungen

### 2.1 Aktuelle Probleme

- Activity Feed zeigt statische Demo-Daten
- Keine Real-Time Updates (WebSocket/SSE fehlt)
- Terminal-Commands limitiert
- Keine Notifications
- Power Modes nur visuell, keine Funktion

### 2.2 Verbesserungen

#### 2.2.1 Real-Time Activity Feed

```typescript
// packages/api/src/routers/activity.ts

export const activityRouter = createTRPCRouter({
  // Live activity stream via SSE
  stream: protectedProcedure.subscription(async function* ({ ctx }) {
    const lastId = 0;

    while (true) {
      const activities = await ctx.db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.organizationId, ctx.session.user.organizationId),
          gt(auditLogs.id, lastId)
        ),
        orderBy: desc(auditLogs.createdAt),
        limit: 10,
      });

      for (const activity of activities) {
        yield {
          id: activity.id,
          type: activity.action,
          title: getActivityTitle(activity),
          description: activity.description,
          timestamp: activity.createdAt,
          status: getActivityStatus(activity),
        };
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }),

  // Recent activity list
  recent: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.auditLogs.findMany({
        where: eq(auditLogs.organizationId, ctx.session.user.organizationId),
        orderBy: desc(auditLogs.createdAt),
        limit: input.limit,
        with: { user: true },
      });
    }),
});
```

#### 2.2.2 Notification System (Frontend)

```typescript
// apps/web/app/scifi/components/NotificationCenter.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc";
import { HoloCard, NeonButton } from "@/components/scifi";

export function NotificationCenter() {
  const { data: notifications } = api.notifications.unread.useQuery();
  const markAsRead = api.notifications.markAsRead.useMutation();

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      {notifications?.map((notification) => (
        <HoloCard
          key={notification.id}
          variant={notification.type === 'error' ? 'red' : 'cyan'}
          className="mb-2 animate-slide-in"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {notification.type === 'success' ? '✓' :
               notification.type === 'error' ? '⚠' : 'ℹ'}
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{notification.title}</p>
              <p className="text-xs text-white/60">{notification.message}</p>
            </div>
            <button
              onClick={() => markAsRead.mutate({ id: notification.id })}
              className="text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>
        </HoloCard>
      ))}
    </div>
  );
}
```

#### 2.2.3 Enhanced Terminal Commands

```typescript
// Neue Terminal Commands für page.tsx

const TERMINAL_COMMANDS = {
  // Existing...

  // Automation
  'auto:list': async () => {
    const workflows = await api.automation.list.fetch();
    return `📋 WORKFLOWS (${workflows.length})\n${workflows.map(w =>
      `  ${w.isActive ? '▶' : '⏸'} ${w.name} - ${w.status}`
    ).join('\n')}`;
  },

  'auto:trigger': async (workflowName: string) => {
    const result = await api.automation.trigger.mutate({ name: workflowName });
    return result.success ? `✓ ${workflowName} triggered` : `✗ Failed`;
  },

  // HubSpot
  'hubspot:sync': async () => {
    await api.hubspot.syncAll.mutate();
    return '🔄 HubSpot sync initiated...';
  },

  'hubspot:status': async () => {
    const stats = await api.hubspotStats.overview.fetch();
    return `HUBSPOT STATUS\n  Contacts: ${stats.contacts}\n  Deals: ${stats.deals}`;
  },

  // System
  'sys:health': async () => {
    const health = await api.system.health.fetch();
    return `SYSTEM HEALTH\n  DB: ${health.db}\n  Redis: ${health.redis}\n  API: ${health.api}`;
  },

  'deploy': async (target: string) => {
    // Trigger deployment via webhook
    return `🚀 Deploying to ${target || 'production'}...`;
  },
};
```

#### 2.2.4 Power Mode Funktionalität

```typescript
// God Mode aktiviert erweiterte Features
const GOD_MODE_FEATURES = {
  // Bulk-Operationen
  bulkEmailEnabled: true,
  bulkDeleteEnabled: true,

  // Erweiterte Ansichten
  showInternalIds: true,
  showDebugInfo: true,

  // Automation
  bypassApprovals: true,
  directDbAccess: true,
};

// Ultra Instinct = Autonomer AI-Modus
const ULTRA_INSTINCT_FEATURES = {
  autoRespond: true,        // AI antwortet automatisch auf Messages
  autoQualify: true,        // Leads werden automatisch qualifiziert
  autoSchedule: true,       // Termine werden automatisch vorgeschlagen
  predictiveActions: true,  // AI schlägt nächste Aktionen vor
};
```

---

## Sektion 3: Neue Integrationen

### 3.1 Integration Matrix

| Integration | Status | Priorität | Aufwand |
|-------------|--------|-----------|---------|
| n8n Webhooks | NEU | HOCH | Medium |
| Google Calendar | NEU | HOCH | Medium |
| Slack Notifications | NEU | MITTEL | Niedrig |
| Telegram Bot | NEU | MITTEL | Niedrig |
| OpenAI/Claude Enhanced | UPGRADE | HOCH | Medium |
| Zapier Webhooks | NEU | NIEDRIG | Niedrig |

### 3.2 n8n Integration

```typescript
// packages/integrations/src/n8n/index.ts

export class N8nIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  // Trigger n8n workflow
  async triggerWorkflow(workflowId: string, data: Record<string, unknown>) {
    const response = await fetch(
      `${this.baseUrl}/webhook/${workflowId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  // Get workflow status
  async getWorkflowStatus(executionId: string) {
    const response = await fetch(
      `${this.baseUrl}/executions/${executionId}`,
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      }
    );
    return response.json();
  }
}
```

### 3.3 Google Calendar Integration

```typescript
// packages/integrations/src/google-calendar/index.ts

import { google } from 'googleapis';

export class GoogleCalendarIntegration {
  private calendar;

  constructor(credentials: GoogleCredentials) {
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
    auth.setCredentials(credentials.tokens);
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  // Create event from deal
  async createDealEvent(deal: Deal) {
    return this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Deal: ${deal.name}`,
        description: `Value: €${deal.amount}\nContact: ${deal.contactName}`,
        start: { dateTime: deal.expectedCloseDate },
        end: { dateTime: addHours(deal.expectedCloseDate, 1) },
        colorId: deal.stage === 'won' ? '10' : '5',
      },
    });
  }

  // Sync construction milestones
  async syncProjectMilestones(project: Project) {
    for (const milestone of project.milestones) {
      await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `🏗️ ${project.name}: ${milestone.name}`,
          start: { date: milestone.dueDate },
          end: { date: milestone.dueDate },
        },
      });
    }
  }
}
```

### 3.4 Slack/Telegram Notifications

```typescript
// packages/integrations/src/notifications/slack.ts

export async function sendSlackNotification(
  webhookUrl: string,
  notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    fields?: Array<{ name: string; value: string }>;
  }
) {
  const colors = {
    info: '#00bcd4',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color: colors[notification.type],
        title: notification.title,
        text: notification.message,
        fields: notification.fields?.map(f => ({
          title: f.name,
          value: f.value,
          short: true,
        })),
        footer: 'Nexus Command Center',
        ts: Math.floor(Date.now() / 1000),
      }],
    }),
  });
}
```

### 3.5 Enhanced AI Integration

```typescript
// packages/ai/src/enhanced-agent.ts

import Anthropic from '@anthropic-ai/sdk';

export class EnhancedAIAgent {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  // Context-aware response with CRM data
  async generateResponse(input: {
    message: string;
    contactId?: string;
    conversationHistory: Message[];
    crmContext?: {
      deals: Deal[];
      activities: Activity[];
      leadScore: string;
    };
  }) {
    const systemPrompt = `Du bist MAX, der KI-Assistent von West Money Bau.

Kontext zum Kunden:
- Lead Score: ${input.crmContext?.leadScore || 'Unbekannt'}
- Offene Deals: ${input.crmContext?.deals?.length || 0}
- Letzte Aktivität: ${input.crmContext?.activities?.[0]?.description || 'Keine'}

Antworte professionell, freundlich und zielgerichtet.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...input.conversationHistory.map(m => ({
          role: m.direction === 'inbound' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: input.message },
      ],
    });

    return response.content[0].text;
  }

  // Predictive actions
  async suggestNextActions(contact: Contact, deals: Deal[]) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Analysiere diesen Kontakt und schlage 3 nächste Aktionen vor:

Kontakt: ${contact.name}
Lead Score: ${contact.leadScore}
Letzte Interaktion: ${contact.lastActivityAt}
Offene Deals: ${deals.map(d => `${d.name} (${d.stage})`).join(', ')}

Antworte als JSON Array mit: { action: string, priority: 'high'|'medium'|'low', reason: string }`,
      }],
    });

    return JSON.parse(response.content[0].text);
  }
}
```

---

## Sektion 4: Code-Qualität & Performance

### 4.1 Testing Strategy

```
tests/
├── unit/
│   ├── queues/
│   │   └── automation.queue.test.ts
│   ├── workers/
│   │   └── email.worker.test.ts
│   └── utils/
│       └── cron-parser.test.ts
├── integration/
│   ├── api/
│   │   ├── automation.test.ts
│   │   └── hubspot-sync.test.ts
│   └── workers/
│       └── full-workflow.test.ts
└── e2e/
    ├── automation-page.test.ts
    └── dashboard.test.ts
```

### 4.2 Error Handling Pattern

```typescript
// packages/api/src/lib/error-handler.ts

import { TRPCError } from '@trpc/server';
import * as Sentry from '@sentry/node';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function handleError(error: unknown, ctx?: { userId?: string }) {
  // Log to Sentry
  Sentry.captureException(error, {
    user: ctx?.userId ? { id: ctx.userId } : undefined,
    extra: error instanceof AppError ? error.context : undefined,
  });

  // Convert to tRPC error
  if (error instanceof AppError) {
    throw new TRPCError({
      code: mapStatusToTRPC(error.statusCode),
      message: error.message,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ein unerwarteter Fehler ist aufgetreten',
  });
}
```

### 4.3 Performance Optimizations

```typescript
// 1. Query Optimization mit Drizzle
const optimizedQuery = db.query.contacts.findMany({
  columns: {
    id: true,
    name: true,
    email: true,
    leadScore: true,
  },
  with: {
    deals: {
      columns: { id: true, amount: true, stage: true },
      where: eq(deals.stage, 'open'),
    },
  },
  limit: 50,
});

// 2. Redis Caching
const CACHE_TTL = 300; // 5 minutes

export async function getCachedStats(orgId: string) {
  const cacheKey = `stats:${orgId}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const stats = await calculateStats(orgId);
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));
  return stats;
}

// 3. Batch Processing
export async function batchProcessContacts(contacts: Contact[]) {
  const BATCH_SIZE = 100;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processContact));

    // Prevent overwhelming the system
    await new Promise(r => setTimeout(r, 100));
  }
}
```

### 4.4 Monitoring & Observability

```typescript
// packages/api/src/lib/metrics.ts

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('nexus-command-center');

// Counters
export const apiRequestsCounter = meter.createCounter('api_requests_total', {
  description: 'Total API requests',
});

export const automationExecutionsCounter = meter.createCounter('automation_executions_total', {
  description: 'Total automation executions',
});

// Histograms
export const apiLatencyHistogram = meter.createHistogram('api_latency_ms', {
  description: 'API request latency in milliseconds',
});

// Gauges
export const activeWorkflowsGauge = meter.createObservableGauge('active_workflows', {
  description: 'Number of active workflows',
});
```

---

## Sektion 5: Implementation Roadmap

### Phase 1: Foundation (Woche 1-2)
- [ ] BullMQ Package erstellen
- [ ] Redis Connection Setup
- [ ] Basic Queue + Worker Implementation
- [ ] Automation Router hinzufügen
- [ ] Automation Page mit echten Daten verbinden

### Phase 2: Core Features (Woche 3-4)
- [ ] Scheduler Service implementieren
- [ ] Cron Jobs für Daily Reports
- [ ] HubSpot Sync Worker
- [ ] Email Queue Worker
- [ ] Real-time Activity Feed

### Phase 3: Integrations (Woche 5-6)
- [ ] n8n Webhook Integration
- [ ] Google Calendar Sync
- [ ] Slack/Telegram Notifications
- [ ] Enhanced AI Agent

### Phase 4: Polish (Woche 7-8)
- [ ] Testing Suite
- [ ] Error Handling
- [ ] Performance Optimization
- [ ] Monitoring Setup
- [ ] Documentation

---

## Sektion 6: Neue Dependencies

```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "cron": "^3.1.0",
    "ioredis": "^5.3.0",
    "@googleapis/calendar": "^9.0.0",
    "@slack/web-api": "^7.0.0",
    "@sentry/node": "^8.0.0",
    "@opentelemetry/api": "^1.7.0"
  }
}
```

---

## Sektion 7: Environment Variables (Neu)

```env
# Redis
REDIS_URL="redis://localhost:6379"

# n8n
N8N_BASE_URL="https://n8n.enterprise-universe.com"
N8N_API_KEY=""

# Google Calendar
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""

# Slack
SLACK_WEBHOOK_URL=""
SLACK_BOT_TOKEN=""

# Telegram
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=""
```

---

## Approval Checklist

- [ ] Automation Engine Architecture approved
- [ ] Dashboard improvements approved
- [ ] Integration priorities confirmed
- [ ] Timeline acceptable
- [ ] Dependencies approved

---

*Document generated by Claude Code - Nexus Command Center Mega Update Planning*
