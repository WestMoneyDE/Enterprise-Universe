// =============================================================================
// API Documentation Data
// =============================================================================
// Comprehensive API endpoint documentation for NEXUS Command Center tRPC APIs

export type EndpointType = "query" | "mutation";

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  nested?: SchemaField[];
  enumValues?: string[];
}

export interface ApiEndpoint {
  id: string;
  router: string;
  procedure: string;
  type: EndpointType;
  description: string;
  authRequired: boolean;
  inputSchema: SchemaField[];
  outputSchema: SchemaField[];
  examples: {
    request?: Record<string, unknown>;
    response: Record<string, unknown>;
  };
}

export interface RouterCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  endpoints: ApiEndpoint[];
}

// =============================================================================
// DASHBOARD ROUTER
// =============================================================================

const dashboardEndpoints: ApiEndpoint[] = [
  {
    id: "dashboard-getStats",
    router: "dashboard",
    procedure: "getStats",
    type: "query",
    description: "Get aggregate dashboard statistics including contacts, deals, revenue, and conversations count. Public endpoint with caching.",
    authRequired: false,
    inputSchema: [],
    outputSchema: [
      { name: "contacts", type: "number", required: true, description: "Total contacts count" },
      { name: "deals", type: "number", required: true, description: "Total deals count" },
      { name: "openDeals", type: "number", required: true, description: "Number of open deals" },
      { name: "wonDeals", type: "number", required: true, description: "Number of won deals" },
      { name: "revenue", type: "number", required: true, description: "Total revenue from won deals" },
      { name: "conversations", type: "number", required: true, description: "Total conversations count" },
      { name: "projects", type: "number", required: true, description: "Total projects count" },
      { name: "timestamp", type: "string", required: true, description: "ISO timestamp of data fetch" },
    ],
    examples: {
      response: {
        contacts: 1847,
        deals: 234,
        openDeals: 47,
        wonDeals: 89,
        revenue: 2847500,
        conversations: 3421,
        projects: 156,
        timestamp: "2024-01-15T10:30:00.000Z",
      },
    },
  },
  {
    id: "dashboard-getModuleStatus",
    router: "dashboard",
    procedure: "getModuleStatus",
    type: "query",
    description: "Get status of all system modules including WhatsApp, CRM, AI Agent, Lead Scoring, and West Money Bau.",
    authRequired: false,
    inputSchema: [],
    outputSchema: [
      {
        name: "modules",
        type: "object",
        required: true,
        description: "Module status map",
        nested: [
          { name: "whatsapp", type: "object", required: true, nested: [
            { name: "status", type: "string", required: true, enumValues: ["online", "warning", "offline"] },
            { name: "count", type: "number", required: true },
          ]},
          { name: "crm", type: "object", required: true, nested: [
            { name: "status", type: "string", required: true },
            { name: "count", type: "number", required: true },
          ]},
          { name: "aiAgent", type: "object", required: true, nested: [
            { name: "status", type: "string", required: true },
            { name: "count", type: "number", required: true },
          ]},
          { name: "leadScoring", type: "object", required: true, nested: [
            { name: "status", type: "string", required: true },
            { name: "count", type: "number", required: true },
          ]},
          { name: "westMoneyBau", type: "object", required: true, nested: [
            { name: "status", type: "string", required: true },
            { name: "count", type: "number", required: true },
          ]},
        ],
      },
      { name: "timestamp", type: "string", required: true },
    ],
    examples: {
      response: {
        modules: {
          whatsapp: { status: "online", count: 3421 },
          crm: { status: "online", count: 1847 },
          aiAgent: { status: "online", count: 2847 },
          leadScoring: { status: "online", count: 1276 },
          westMoneyBau: { status: "online", count: 156 },
        },
        timestamp: "2024-01-15T10:30:00.000Z",
      },
    },
  },
  {
    id: "dashboard-getNexusTasks",
    router: "dashboard",
    procedure: "getNexusTasks",
    type: "query",
    description: "Get aggregate task count for Nexus Command Center combining contacts, conversations, and active deals.",
    authRequired: false,
    inputSchema: [],
    outputSchema: [
      { name: "tasks", type: "number", required: true, description: "Total task count" },
      { name: "timestamp", type: "string", required: true },
    ],
    examples: {
      response: {
        tasks: 5424,
        timestamp: "2024-01-15T10:30:00.000Z",
      },
    },
  },
];

// =============================================================================
// CONTACTS ROUTER
// =============================================================================

const contactsEndpoints: ApiEndpoint[] = [
  {
    id: "contacts-list",
    router: "contacts",
    procedure: "list",
    type: "query",
    description: "List contacts with filtering and pagination support. Supports search, type filtering, subsidiary filtering, and more.",
    authRequired: true,
    inputSchema: [
      {
        name: "filters",
        type: "object",
        required: false,
        description: "Filter criteria",
        nested: [
          { name: "search", type: "string", required: false, description: "Search term for email, name, company" },
          { name: "type", type: "string", required: false, enumValues: ["lead", "customer", "investor", "partner", "vendor", "employee"] },
          { name: "subsidiary", type: "string", required: false, enumValues: ["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"] },
          { name: "consentStatus", type: "string", required: false, enumValues: ["pending", "granted", "revoked"] },
          { name: "emailStatus", type: "string", required: false, enumValues: ["active", "bounced", "complained", "unsubscribed"] },
          { name: "ownerId", type: "string", required: false, description: "UUID of owner" },
          { name: "tags", type: "array", required: false, description: "Array of tag strings" },
          { name: "createdAfter", type: "date", required: false },
          { name: "createdBefore", type: "date", required: false },
        ],
      },
      {
        name: "pagination",
        type: "object",
        required: false,
        nested: [
          { name: "page", type: "number", required: false, description: "Page number (default: 1)" },
          { name: "limit", type: "number", required: false, description: "Items per page (default: 20, max: 100)" },
          { name: "sortBy", type: "string", required: false, description: "Field to sort by (default: createdAt)" },
          { name: "sortOrder", type: "string", required: false, enumValues: ["asc", "desc"] },
        ],
      },
    ],
    outputSchema: [
      { name: "items", type: "array", required: true, description: "Array of contact objects" },
      { name: "total", type: "number", required: true, description: "Total count" },
      { name: "page", type: "number", required: true },
      { name: "limit", type: "number", required: true },
      { name: "hasMore", type: "boolean", required: true },
      { name: "totalPages", type: "number", required: true },
    ],
    examples: {
      request: {
        filters: { type: "lead", search: "test" },
        pagination: { page: 1, limit: 10 },
      },
      response: {
        items: [
          { id: "uuid-1", email: "test@example.com", firstName: "John", lastName: "Doe", type: "lead" },
        ],
        total: 150,
        page: 1,
        limit: 10,
        hasMore: true,
        totalPages: 15,
      },
    },
  },
  {
    id: "contacts-getById",
    router: "contacts",
    procedure: "getById",
    type: "query",
    description: "Get a single contact by ID with related data including activities and list memberships.",
    authRequired: true,
    inputSchema: [
      { name: "id", type: "string", required: true, description: "Contact UUID" },
    ],
    outputSchema: [
      { name: "id", type: "string", required: true },
      { name: "email", type: "string", required: true },
      { name: "firstName", type: "string", required: false },
      { name: "lastName", type: "string", required: false },
      { name: "phone", type: "string", required: false },
      { name: "company", type: "string", required: false },
      { name: "type", type: "string", required: true },
      { name: "activities", type: "array", required: true, description: "Recent activities" },
      { name: "listMemberships", type: "array", required: true, description: "Contact lists" },
    ],
    examples: {
      request: { id: "550e8400-e29b-41d4-a716-446655440000" },
      response: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        type: "lead",
        activities: [],
        listMemberships: [],
      },
    },
  },
  {
    id: "contacts-create",
    router: "contacts",
    procedure: "create",
    type: "mutation",
    description: "Create a new contact. Email must be unique within the organization.",
    authRequired: true,
    inputSchema: [
      { name: "email", type: "string", required: true, description: "Valid email address" },
      { name: "firstName", type: "string", required: false, description: "Max 100 characters" },
      { name: "lastName", type: "string", required: false, description: "Max 100 characters" },
      { name: "salutation", type: "string", required: false },
      { name: "phone", type: "string", required: false },
      { name: "mobile", type: "string", required: false },
      { name: "company", type: "string", required: false },
      { name: "position", type: "string", required: false },
      { name: "street", type: "string", required: false },
      { name: "city", type: "string", required: false },
      { name: "postalCode", type: "string", required: false },
      { name: "country", type: "string", required: false, description: "ISO 3166-1 alpha-2 code (default: DE)" },
      { name: "type", type: "string", required: false, enumValues: ["lead", "customer", "investor", "partner", "vendor", "employee"] },
      { name: "subsidiary", type: "string", required: false },
      { name: "source", type: "string", required: false },
      { name: "tags", type: "array", required: false },
      { name: "notes", type: "string", required: false },
      { name: "customFields", type: "object", required: false },
    ],
    outputSchema: [
      { name: "id", type: "string", required: true },
      { name: "email", type: "string", required: true },
      { name: "createdAt", type: "date", required: true },
    ],
    examples: {
      request: {
        email: "new.contact@example.com",
        firstName: "Jane",
        lastName: "Smith",
        type: "lead",
        source: "website",
      },
      response: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        email: "new.contact@example.com",
        createdAt: "2024-01-15T10:30:00.000Z",
      },
    },
  },
  {
    id: "contacts-update",
    router: "contacts",
    procedure: "update",
    type: "mutation",
    description: "Update an existing contact. All fields except ID are optional.",
    authRequired: true,
    inputSchema: [
      { name: "id", type: "string", required: true, description: "Contact UUID" },
      { name: "email", type: "string", required: false },
      { name: "firstName", type: "string", required: false },
      { name: "lastName", type: "string", required: false },
      { name: "phone", type: "string", required: false },
      { name: "company", type: "string", required: false },
      { name: "type", type: "string", required: false },
    ],
    outputSchema: [
      { name: "id", type: "string", required: true },
      { name: "updatedAt", type: "date", required: true },
    ],
    examples: {
      request: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        type: "customer",
      },
      response: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        updatedAt: "2024-01-15T11:00:00.000Z",
      },
    },
  },
  {
    id: "contacts-delete",
    router: "contacts",
    procedure: "delete",
    type: "mutation",
    description: "Delete a contact by ID.",
    authRequired: true,
    inputSchema: [
      { name: "id", type: "string", required: true, description: "Contact UUID" },
    ],
    outputSchema: [
      { name: "success", type: "boolean", required: true },
    ],
    examples: {
      request: { id: "550e8400-e29b-41d4-a716-446655440000" },
      response: { success: true },
    },
  },
  {
    id: "contacts-stats",
    router: "contacts",
    procedure: "stats",
    type: "query",
    description: "Get contact statistics including totals by type, consent status, and email status.",
    authRequired: true,
    inputSchema: [],
    outputSchema: [
      { name: "total", type: "number", required: true },
      { name: "byType", type: "object", required: true },
      { name: "byConsentStatus", type: "object", required: true },
      { name: "byEmailStatus", type: "object", required: true },
    ],
    examples: {
      response: {
        total: 1847,
        byType: { lead: 1200, customer: 500, investor: 100, partner: 47 },
        byConsentStatus: { granted: 1500, pending: 300, revoked: 47 },
        byEmailStatus: { active: 1700, bounced: 100, unsubscribed: 47 },
      },
    },
  },
];

// =============================================================================
// DEALS ROUTER
// =============================================================================

const dealsEndpoints: ApiEndpoint[] = [
  {
    id: "deals-list",
    router: "deals",
    procedure: "list",
    type: "query",
    description: "List deals with filtering and pagination. Includes related contact, owner, pipeline, and stage data.",
    authRequired: true,
    inputSchema: [
      {
        name: "filters",
        type: "object",
        required: false,
        nested: [
          { name: "search", type: "string", required: false },
          { name: "pipelineId", type: "string", required: false },
          { name: "stageId", type: "string", required: false },
          { name: "stage", type: "string", required: false, enumValues: ["lead", "qualified", "proposal", "negotiation", "won", "lost"] },
          { name: "subsidiary", type: "string", required: false },
          { name: "ownerId", type: "string", required: false },
          { name: "contactId", type: "string", required: false },
          { name: "priority", type: "string", required: false, enumValues: ["low", "medium", "high", "urgent"] },
          { name: "minAmount", type: "number", required: false },
          { name: "maxAmount", type: "number", required: false },
        ],
      },
      {
        name: "pagination",
        type: "object",
        required: false,
        nested: [
          { name: "page", type: "number", required: false },
          { name: "limit", type: "number", required: false },
          { name: "sortBy", type: "string", required: false },
          { name: "sortOrder", type: "string", required: false },
        ],
      },
    ],
    outputSchema: [
      { name: "items", type: "array", required: true },
      { name: "total", type: "number", required: true },
      { name: "page", type: "number", required: true },
      { name: "limit", type: "number", required: true },
      { name: "hasMore", type: "boolean", required: true },
      { name: "totalPages", type: "number", required: true },
    ],
    examples: {
      request: {
        filters: { stage: "negotiation" },
        pagination: { page: 1, limit: 20 },
      },
      response: {
        items: [
          { id: "deal-1", name: "Enterprise Contract", amount: "45000", stage: "negotiation" },
        ],
        total: 47,
        page: 1,
        limit: 20,
        hasMore: true,
        totalPages: 3,
      },
    },
  },
  {
    id: "deals-kanban",
    router: "deals",
    procedure: "kanban",
    type: "query",
    description: "Get deals grouped by stage for Kanban board view.",
    authRequired: true,
    inputSchema: [
      { name: "pipelineId", type: "string", required: false, description: "Filter by pipeline" },
      { name: "filters", type: "object", required: false },
    ],
    outputSchema: [
      { name: "stages", type: "array", required: true, description: "Pipeline stages" },
      { name: "dealsByStage", type: "object", required: true, description: "Deals grouped by stage ID" },
    ],
    examples: {
      request: { pipelineId: "pipeline-uuid" },
      response: {
        stages: [
          { id: "stage-1", name: "Lead", order: 0 },
          { id: "stage-2", name: "Qualified", order: 1 },
        ],
        dealsByStage: {
          "stage-1": [{ id: "deal-1", name: "New Deal" }],
          "stage-2": [{ id: "deal-2", name: "Active Deal" }],
        },
      },
    },
  },
  {
    id: "deals-create",
    router: "deals",
    procedure: "create",
    type: "mutation",
    description: "Create a new deal. Automatically calculates weighted value based on amount and probability.",
    authRequired: true,
    inputSchema: [
      { name: "name", type: "string", required: true, description: "Deal name (1-255 chars)" },
      { name: "description", type: "string", required: false },
      { name: "contactId", type: "string", required: false },
      { name: "pipelineId", type: "string", required: false },
      { name: "stageId", type: "string", required: false },
      { name: "amount", type: "string", required: false, description: "Decimal as string" },
      { name: "currency", type: "string", required: false, description: "3-letter code (default: EUR)" },
      { name: "probability", type: "number", required: false, description: "0-100 (default: 0)" },
      { name: "priority", type: "string", required: false, enumValues: ["low", "medium", "high", "urgent"] },
      { name: "expectedCloseDate", type: "date", required: false },
    ],
    outputSchema: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string", required: true },
      { name: "weightedValue", type: "string", required: true },
      { name: "createdAt", type: "date", required: true },
    ],
    examples: {
      request: {
        name: "Enterprise License",
        amount: "50000",
        probability: 75,
        priority: "high",
      },
      response: {
        id: "deal-uuid",
        name: "Enterprise License",
        weightedValue: "37500.00",
        createdAt: "2024-01-15T10:30:00.000Z",
      },
    },
  },
  {
    id: "deals-moveToStage",
    router: "deals",
    procedure: "moveToStage",
    type: "mutation",
    description: "Move a deal to a different pipeline stage. Updates probability and logs activity.",
    authRequired: true,
    inputSchema: [
      { name: "dealId", type: "string", required: true },
      { name: "stageId", type: "string", required: true },
    ],
    outputSchema: [
      { name: "id", type: "string", required: true },
      { name: "stageId", type: "string", required: true },
      { name: "probability", type: "number", required: true },
      { name: "stageChangedAt", type: "date", required: true },
    ],
    examples: {
      request: {
        dealId: "deal-uuid",
        stageId: "won-stage-uuid",
      },
      response: {
        id: "deal-uuid",
        stageId: "won-stage-uuid",
        probability: 100,
        stageChangedAt: "2024-01-15T10:30:00.000Z",
      },
    },
  },
  {
    id: "deals-stats",
    router: "deals",
    procedure: "stats",
    type: "query",
    description: "Get deal statistics including totals, values, and breakdown by stage.",
    authRequired: true,
    inputSchema: [
      { name: "pipelineId", type: "string", required: false },
      {
        name: "dateRange",
        type: "object",
        required: false,
        nested: [
          { name: "from", type: "date", required: false },
          { name: "to", type: "date", required: false },
        ],
      },
    ],
    outputSchema: [
      { name: "total", type: "number", required: true },
      { name: "totalValue", type: "string", required: true },
      { name: "weightedValue", type: "string", required: true },
      { name: "byStage", type: "object", required: true },
      {
        name: "wonThisMonth",
        type: "object",
        required: true,
        nested: [
          { name: "count", type: "number", required: true },
          { name: "value", type: "string", required: true },
        ],
      },
    ],
    examples: {
      response: {
        total: 234,
        totalValue: "4500000",
        weightedValue: "2847500",
        byStage: {
          lead: { count: 50, value: "500000" },
          negotiation: { count: 47, value: "1200000" },
          won: { count: 89, value: "2800000" },
        },
        wonThisMonth: { count: 12, value: "450000" },
      },
    },
  },
];

// =============================================================================
// LEAD SCORING ROUTER
// =============================================================================

const leadScoringEndpoints: ApiEndpoint[] = [
  {
    id: "leadScoring-getDistribution",
    router: "leadScoring",
    procedure: "getDistribution",
    type: "query",
    description: "Get lead score distribution by grade (A/B/C/D). Returns real-time data from the lead scoring engine.",
    authRequired: false,
    inputSchema: [],
    outputSchema: [
      { name: "A", type: "number", required: true, description: "Count of Grade A leads (hot)" },
      { name: "B", type: "number", required: true, description: "Count of Grade B leads (warm)" },
      { name: "C", type: "number", required: true, description: "Count of Grade C leads (cool)" },
      { name: "D", type: "number", required: true, description: "Count of Grade D leads (cold)" },
      { name: "total", type: "number", required: true, description: "Total scored leads" },
      { name: "averageScore", type: "number", required: true, description: "Average lead score" },
    ],
    examples: {
      response: {
        A: 156,
        B: 342,
        C: 478,
        D: 300,
        total: 1276,
        averageScore: 58.4,
      },
    },
  },
  {
    id: "leadScoring-getConfig",
    router: "leadScoring",
    procedure: "getConfig",
    type: "query",
    description: "Get the current lead scoring configuration including weights and thresholds.",
    authRequired: false,
    inputSchema: [],
    outputSchema: [
      {
        name: "weights",
        type: "object",
        required: true,
        nested: [
          { name: "engagement", type: "number", required: true },
          { name: "behavioral", type: "number", required: true },
          { name: "demographic", type: "number", required: true },
          { name: "firmographic", type: "number", required: true },
        ],
      },
      {
        name: "thresholds",
        type: "object",
        required: true,
        nested: [
          { name: "A", type: "number", required: true, description: "Min score for Grade A" },
          { name: "B", type: "number", required: true, description: "Min score for Grade B" },
          { name: "C", type: "number", required: true, description: "Min score for Grade C" },
          { name: "D", type: "number", required: true, description: "Min score for Grade D" },
        ],
      },
      { name: "decayEnabled", type: "boolean", required: true },
      { name: "decayPeriodDays", type: "number", required: true },
    ],
    examples: {
      response: {
        weights: { engagement: 0.35, behavioral: 0.25, demographic: 0.2, firmographic: 0.2 },
        thresholds: { A: 80, B: 60, C: 40, D: 0 },
        decayEnabled: true,
        decayPeriodDays: 30,
      },
    },
  },
  {
    id: "leadScoring-calculateScore",
    router: "leadScoring",
    procedure: "calculateScore",
    type: "mutation",
    description: "Calculate the lead score for a specific contact without saving.",
    authRequired: false,
    inputSchema: [
      { name: "contactId", type: "string", required: true, description: "Contact UUID" },
    ],
    outputSchema: [
      { name: "contactId", type: "string", required: true },
      { name: "score", type: "number", required: true, description: "Calculated score (0-100)" },
      { name: "grade", type: "string", required: true, enumValues: ["A", "B", "C", "D"] },
      { name: "breakdown", type: "object", required: true, description: "Score breakdown by category" },
      { name: "signals", type: "array", required: true, description: "Individual scoring signals" },
      { name: "calculatedAt", type: "date", required: true },
    ],
    examples: {
      request: { contactId: "contact-uuid" },
      response: {
        contactId: "contact-uuid",
        score: 78,
        grade: "B",
        breakdown: { engagement: 25, behavioral: 20, demographic: 18, firmographic: 15 },
        signals: [
          { category: "engagement", signal: "email_opened", points: 5 },
          { category: "behavioral", signal: "page_view", points: 3 },
        ],
        calculatedAt: "2024-01-15T10:30:00.000Z",
      },
    },
  },
  {
    id: "leadScoring-updateScore",
    router: "leadScoring",
    procedure: "updateScore",
    type: "mutation",
    description: "Calculate and save the lead score for a contact.",
    authRequired: false,
    inputSchema: [
      { name: "contactId", type: "string", required: true },
    ],
    outputSchema: [
      { name: "success", type: "boolean", required: true },
      { name: "contactId", type: "string", required: true },
      { name: "score", type: "number", required: true },
      { name: "grade", type: "string", required: true },
      { name: "previousScore", type: "number", required: false },
      { name: "previousGrade", type: "string", required: false },
      { name: "gradeChanged", type: "boolean", required: true },
    ],
    examples: {
      request: { contactId: "contact-uuid" },
      response: {
        success: true,
        contactId: "contact-uuid",
        score: 85,
        grade: "A",
        previousScore: 78,
        previousGrade: "B",
        gradeChanged: true,
      },
    },
  },
  {
    id: "leadScoring-getLeaderboard",
    router: "leadScoring",
    procedure: "getLeaderboard",
    type: "query",
    description: "Get the top scored contacts (leaderboard).",
    authRequired: false,
    inputSchema: [
      { name: "limit", type: "number", required: false, description: "Max results (1-50, default: 10)" },
      { name: "grade", type: "string", required: false, enumValues: ["A", "B", "C", "D"] },
    ],
    outputSchema: [
      {
        name: "leaders",
        type: "array",
        required: true,
        nested: [
          { name: "contactId", type: "string", required: true },
          { name: "name", type: "string", required: true },
          { name: "email", type: "string", required: true },
          { name: "score", type: "number", required: true },
          { name: "grade", type: "string", required: true },
        ],
      },
    ],
    examples: {
      request: { limit: 5, grade: "A" },
      response: {
        leaders: [
          { contactId: "1", name: "Top Lead", email: "top@example.com", score: 95, grade: "A" },
          { contactId: "2", name: "Hot Prospect", email: "hot@example.com", score: 92, grade: "A" },
        ],
      },
    },
  },
  {
    id: "leadScoring-subscribeToAlerts",
    router: "leadScoring",
    procedure: "subscribeToAlerts",
    type: "mutation",
    description: "Subscribe to grade change alerts for lead scoring updates.",
    authRequired: false,
    inputSchema: [
      { name: "userId", type: "string", required: true },
      { name: "email", type: "string", required: true },
      { name: "phone", type: "string", required: false },
      { name: "enableEmail", type: "boolean", required: false, description: "Default: true" },
      { name: "enableWhatsApp", type: "boolean", required: false, description: "Default: false" },
      { name: "gradeUpgrades", type: "array", required: false, description: "Grades to alert on (default: [A, B])" },
    ],
    outputSchema: [
      { name: "success", type: "boolean", required: true },
      {
        name: "subscription",
        type: "object",
        required: true,
        nested: [
          { name: "id", type: "string", required: true },
          { name: "userId", type: "string", required: true },
          { name: "gradeUpgrades", type: "array", required: true },
        ],
      },
      { name: "message", type: "string", required: true },
    ],
    examples: {
      request: {
        userId: "user-uuid",
        email: "user@example.com",
        gradeUpgrades: ["A"],
      },
      response: {
        success: true,
        subscription: {
          id: "sub-uuid",
          userId: "user-uuid",
          gradeUpgrades: ["A"],
        },
        message: "Successfully subscribed to grade change alerts",
      },
    },
  },
];

// =============================================================================
// AI AGENT ROUTER
// =============================================================================

const aiAgentEndpoints: ApiEndpoint[] = [
  {
    id: "aiAgent-getStats",
    router: "aiAgent",
    procedure: "getStats",
    type: "query",
    description: "Get AI agent statistics including response counts, success rates, and intent distribution.",
    authRequired: false,
    inputSchema: [
      { name: "organizationId", type: "string", required: false },
      { name: "startDate", type: "date", required: false, description: "Default: 30 days ago" },
      { name: "endDate", type: "date", required: false, description: "Default: now" },
    ],
    outputSchema: [
      {
        name: "period",
        type: "object",
        required: true,
        nested: [
          { name: "start", type: "date", required: true },
          { name: "end", type: "date", required: true },
        ],
      },
      { name: "totalResponses", type: "number", required: true },
      { name: "successfulResponses", type: "number", required: true },
      { name: "successRate", type: "number", required: true, description: "Percentage (0-100)" },
      { name: "escalatedResponses", type: "number", required: true },
      { name: "escalationRate", type: "number", required: true },
      { name: "intentDistribution", type: "object", required: true, description: "Map of intent to count" },
      { name: "averageConfidence", type: "number", required: true },
      { name: "aiEnabled", type: "boolean", required: true },
      { name: "source", type: "string", required: true, enumValues: ["live", "demo"] },
    ],
    examples: {
      request: {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-15T00:00:00.000Z",
      },
      response: {
        period: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-15T00:00:00.000Z" },
        totalResponses: 2847,
        successfulResponses: 2634,
        successRate: 92.5,
        escalatedResponses: 213,
        escalationRate: 7.5,
        intentDistribution: {
          baufinanzierung_anfrage: 847,
          terminvereinbarung: 632,
          allgemeine_frage: 528,
        },
        averageConfidence: 87.3,
        aiEnabled: true,
        source: "live",
      },
    },
  },
  {
    id: "aiAgent-getConfig",
    router: "aiAgent",
    procedure: "getConfig",
    type: "query",
    description: "Get AI agent configuration including personality, capabilities, and escalation settings.",
    authRequired: false,
    inputSchema: [
      { name: "subsidiary", type: "string", required: false, enumValues: ["west_money_bau", "enterprise_universe"] },
    ],
    outputSchema: [
      { name: "enabled", type: "boolean", required: true },
      { name: "agentName", type: "string", required: true },
      { name: "language", type: "string", required: true },
      { name: "personalityTrait", type: "string", required: true },
      { name: "companyName", type: "string", required: true },
      { name: "companyDescription", type: "string", required: true },
      { name: "capabilities", type: "array", required: true },
      { name: "escalationKeywords", type: "array", required: true },
      { name: "outOfScopeResponse", type: "string", required: true },
      { name: "model", type: "string", required: true },
      { name: "temperature", type: "number", required: true },
      { name: "maxTokens", type: "number", required: true },
    ],
    examples: {
      request: { subsidiary: "west_money_bau" },
      response: {
        enabled: true,
        agentName: "MAX",
        language: "de",
        personalityTrait: "professional",
        companyName: "West Money Bau",
        companyDescription: "Baufinanzierung & Immobilien",
        capabilities: ["Baufinanzierung", "Terminvereinbarung", "Informationen"],
        escalationKeywords: ["Beschwerde", "Manager", "dringend"],
        outOfScopeResponse: "Das liegt leider ausserhalb meines Bereichs...",
        model: "claude-sonnet-4-20250514",
        temperature: 0.7,
        maxTokens: 500,
      },
    },
  },
  {
    id: "aiAgent-getAiConversations",
    router: "aiAgent",
    procedure: "getAiConversations",
    type: "query",
    description: "Get conversations handled by the AI agent.",
    authRequired: false,
    inputSchema: [
      { name: "limit", type: "number", required: false, description: "1-50, default: 20" },
      { name: "onlyEscalated", type: "boolean", required: false, description: "Filter to escalated only" },
    ],
    outputSchema: [
      {
        name: "conversations",
        type: "array",
        required: true,
        nested: [
          { name: "id", type: "string", required: true },
          {
            name: "contact",
            type: "object",
            required: true,
            nested: [
              { name: "name", type: "string", required: true },
              { name: "phone", type: "string", required: true },
            ],
          },
          { name: "lastMessageAt", type: "date", required: true },
          { name: "unreadCount", type: "number", required: true },
          { name: "botActive", type: "boolean", required: true },
          { name: "escalated", type: "boolean", required: true },
        ],
      },
      { name: "total", type: "number", required: true },
      { name: "aiEnabled", type: "boolean", required: true },
      { name: "source", type: "string", required: true },
    ],
    examples: {
      request: { limit: 10, onlyEscalated: true },
      response: {
        conversations: [
          {
            id: "conv-1",
            contact: { name: "Markus Schneider", phone: "+49152456789" },
            lastMessageAt: "2024-01-15T10:30:00.000Z",
            unreadCount: 1,
            botActive: true,
            escalated: true,
          },
        ],
        total: 1,
        aiEnabled: true,
        source: "database",
      },
    },
  },
  {
    id: "aiAgent-toggleBot",
    router: "aiAgent",
    procedure: "toggleBot",
    type: "mutation",
    description: "Enable or disable the AI bot for a specific conversation.",
    authRequired: false,
    inputSchema: [
      { name: "conversationId", type: "string", required: true },
      { name: "enabled", type: "boolean", required: true },
    ],
    outputSchema: [
      { name: "success", type: "boolean", required: true },
      { name: "conversationId", type: "string", required: true },
      { name: "botActive", type: "boolean", required: true },
    ],
    examples: {
      request: { conversationId: "conv-1", enabled: false },
      response: { success: true, conversationId: "conv-1", botActive: false },
    },
  },
  {
    id: "aiAgent-getServiceStatus",
    router: "aiAgent",
    procedure: "getServiceStatus",
    type: "query",
    description: "Get the current status of the AI service including available features.",
    authRequired: false,
    inputSchema: [],
    outputSchema: [
      { name: "aiEnabled", type: "boolean", required: true },
      { name: "model", type: "string", required: true },
      { name: "provider", type: "string", required: true },
      { name: "status", type: "string", required: true, enumValues: ["active", "inactive"] },
      { name: "message", type: "string", required: true },
      {
        name: "features",
        type: "object",
        required: true,
        nested: [
          { name: "intentClassification", type: "boolean", required: true },
          { name: "responseGeneration", type: "boolean", required: true },
          { name: "dataExtraction", type: "boolean", required: true },
          { name: "escalationDetection", type: "boolean", required: true },
          { name: "sentimentAnalysis", type: "boolean", required: true },
        ],
      },
    ],
    examples: {
      response: {
        aiEnabled: true,
        model: "claude-sonnet-4-20250514",
        provider: "anthropic",
        status: "active",
        message: "MAX AI Agent is active and ready to process messages",
        features: {
          intentClassification: true,
          responseGeneration: true,
          dataExtraction: true,
          escalationDetection: true,
          sentimentAnalysis: true,
        },
      },
    },
  },
  {
    id: "aiAgent-getTeamConfig",
    router: "aiAgent",
    procedure: "getTeamConfig",
    type: "query",
    description: "Get the GENIUS bot team configuration for the dashboard.",
    authRequired: false,
    inputSchema: [],
    outputSchema: [
      { name: "teams", type: "object", required: true, description: "Map of team configurations" },
      { name: "totalBots", type: "number", required: true },
      { name: "activeBots", type: "number", required: true },
      { name: "aiEnabled", type: "boolean", required: true },
      { name: "lastSync", type: "string", required: true },
    ],
    examples: {
      response: {
        teams: {
          leadership: {
            name: "LEADERSHIP COUNCIL",
            active: true,
            bots: [
              { id: "haiku", name: "HAIKU", role: "Speed Oracle", status: "active" },
              { id: "sonnet", name: "SONNET", role: "Balance Master", status: "active" },
            ],
          },
        },
        totalBots: 34,
        activeBots: 34,
        aiEnabled: true,
        lastSync: "2024-01-15T10:30:00.000Z",
      },
    },
  },
];

// =============================================================================
// ROUTER CATEGORIES
// =============================================================================

export const routerCategories: RouterCategory[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Public dashboard statistics and system status endpoints",
    icon: "chart-bar",
    endpoints: dashboardEndpoints,
  },
  {
    id: "contacts",
    name: "Contacts",
    description: "Contact management including CRUD operations and statistics",
    icon: "users",
    endpoints: contactsEndpoints,
  },
  {
    id: "deals",
    name: "Deals",
    description: "Deal pipeline management with Kanban support",
    icon: "briefcase",
    endpoints: dealsEndpoints,
  },
  {
    id: "leadScoring",
    name: "Lead Scoring",
    description: "Lead scoring engine with grade distribution and alerts",
    icon: "target",
    endpoints: leadScoringEndpoints,
  },
  {
    id: "aiAgent",
    name: "AI Agent",
    description: "MAX AI Agent configuration and conversation management",
    icon: "bot",
    endpoints: aiAgentEndpoints,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getAllEndpoints(): ApiEndpoint[] {
  return routerCategories.flatMap((category) => category.endpoints);
}

export function getEndpointById(id: string): ApiEndpoint | undefined {
  return getAllEndpoints().find((e) => e.id === id);
}

export function searchEndpoints(query: string): ApiEndpoint[] {
  const lowerQuery = query.toLowerCase();
  return getAllEndpoints().filter(
    (e) =>
      e.procedure.toLowerCase().includes(lowerQuery) ||
      e.description.toLowerCase().includes(lowerQuery) ||
      e.router.toLowerCase().includes(lowerQuery)
  );
}

export function getEndpointsByRouter(router: string): ApiEndpoint[] {
  const category = routerCategories.find((c) => c.id === router);
  return category?.endpoints ?? [];
}
