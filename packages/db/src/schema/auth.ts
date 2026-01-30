import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { subsidiaryEnum, userRoleEnum } from "./enums";

// =============================================================================
// ORGANIZATIONS (Multi-Tenant)
// =============================================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),

  // Branding
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#0066FF"),
  secondaryColor: varchar("secondary_color", { length: 7 }),

  // Settings
  subsidiary: subsidiaryEnum("subsidiary").default("enterprise_universe"),
  settings: jsonb("settings").$type<{
    timezone?: string;
    dateFormat?: string;
    language?: string;
    features?: string[];
  }>(),

  // Billing
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }),
  subscriptionPeriodEnd: timestamp("subscription_period_end"),

  // Limits
  contactLimit: integer("contact_limit").default(1000),
  emailLimit: integer("email_limit").default(10000),
  userLimit: integer("user_limit").default(5),
  projectLimit: integer("project_limit").default(10),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// USERS
// =============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  hashedPassword: varchar("password_hash", { length: 255 }),

  // Profile
  firstName: varchar("firstname", { length: 100 }),
  lastName: varchar("lastname", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  phone: varchar("phone", { length: 50 }),

  // Organization
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),

  // Role
  role: varchar("role", { length: 20 }).default("user"),

  // 2FA
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),

  // Status
  status: varchar("status", { length: 20 }).default("pending"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  lastActiveAt: timestamp("last_active_at"),

  // Preferences
  preferences: jsonb("preferences").$type<{
    theme?: "light" | "dark" | "system";
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
    dashboardLayout?: string;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// SESSIONS (NextAuth.js)
// =============================================================================

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// =============================================================================
// ACCOUNTS (OAuth - NextAuth.js)
// =============================================================================

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  })
);

// =============================================================================
// VERIFICATION TOKENS (NextAuth.js)
// =============================================================================

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires").notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.identifier, table.token],
    }),
  })
);

// =============================================================================
// API KEYS
// =============================================================================

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 10 }).notNull(), // e.g., "nxs_"

  // Permissions
  scopes: text("scopes").array(),

  // Usage
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),

  // Expiration
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// USER ROLES (RBAC)
// =============================================================================

/**
 * Role permissions structure for JSONB storage
 */
export interface RolePermissions {
  // System-level permissions
  system?: {
    settings?: boolean;
    users?: boolean;
    organizations?: boolean;
    apiKeys?: boolean;
    audit?: boolean;
  };
  // CRM permissions
  contacts?: {
    create?: boolean;
    read?: boolean | "own";
    update?: boolean | "own";
    delete?: boolean | "own";
    export?: boolean;
    import?: boolean;
  };
  deals?: {
    create?: boolean;
    read?: boolean | "own";
    update?: boolean | "own";
    delete?: boolean | "own";
    assign?: boolean;
  };
  // Marketing permissions
  campaigns?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    send?: boolean;
  };
  leadScoring?: {
    view?: boolean;
    configure?: boolean;
  };
  // Finance permissions
  commissions?: {
    view?: boolean | "own";
    approve?: boolean;
    configure?: boolean;
  };
  reports?: {
    view?: boolean;
    export?: boolean;
    financial?: boolean;
  };
  // Projects permissions
  projects?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  // Partner-specific permissions
  partner?: {
    leads?: boolean;
    commission?: boolean;
    dashboard?: boolean;
  };
}

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").$type<RolePermissions>().notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // System roles cannot be deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// USER ROLE ASSIGNMENTS
// =============================================================================

export const userRoleAssignments = pgTable(
  "user_role_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => userRoles.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by")
      .references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"), // Optional role expiration
  },
  (table) => ({
    // Ensure a user can only have one assignment of the same role per organization
    uniqueUserRoleOrg: primaryKey({
      columns: [table.userId, table.roleId, table.organizationId],
    }),
  })
);

// =============================================================================
// ROLE RELATIONS
// =============================================================================

export const userRolesRelations = relations(userRoles, ({ many }) => ({
  assignments: many(userRoleAssignments),
}));

export const userRoleAssignmentsRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userRoleAssignments.userId],
    references: [users.id],
  }),
  role: one(userRoles, {
    fields: [userRoleAssignments.roleId],
    references: [userRoles.id],
  }),
  organization: one(organizations, {
    fields: [userRoleAssignments.organizationId],
    references: [organizations.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoleAssignments.assignedBy],
    references: [users.id],
    relationName: "assignedByUser",
  }),
}));

// =============================================================================
// AUTH RELATIONS (defined after all tables)
// =============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  apiKeys: many(apiKeys),
  roleAssignments: many(userRoleAssignments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(sessions),
  accounts: many(accounts),
  apiKeys: many(apiKeys),
  roleAssignments: many(userRoleAssignments),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// =============================================================================
// DEFAULT ROLE DEFINITIONS
// =============================================================================

export const DEFAULT_ROLES: Array<{
  name: string;
  displayName: string;
  description: string;
  permissions: RolePermissions;
}> = [
  {
    name: "super_admin",
    displayName: "Super Administrator",
    description: "Full system access including system settings and configuration",
    permissions: {
      system: {
        settings: true,
        users: true,
        organizations: true,
        apiKeys: true,
        audit: true,
      },
      contacts: {
        create: true,
        read: true,
        update: true,
        delete: true,
        export: true,
        import: true,
      },
      deals: {
        create: true,
        read: true,
        update: true,
        delete: true,
        assign: true,
      },
      campaigns: {
        create: true,
        read: true,
        update: true,
        delete: true,
        send: true,
      },
      leadScoring: {
        view: true,
        configure: true,
      },
      commissions: {
        view: true,
        approve: true,
        configure: true,
      },
      reports: {
        view: true,
        export: true,
        financial: true,
      },
      projects: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
  },
  {
    name: "admin",
    displayName: "Administrator",
    description: "Full access except system settings",
    permissions: {
      system: {
        users: true,
        organizations: true,
        apiKeys: true,
        audit: true,
      },
      contacts: {
        create: true,
        read: true,
        update: true,
        delete: true,
        export: true,
        import: true,
      },
      deals: {
        create: true,
        read: true,
        update: true,
        delete: true,
        assign: true,
      },
      campaigns: {
        create: true,
        read: true,
        update: true,
        delete: true,
        send: true,
      },
      leadScoring: {
        view: true,
        configure: true,
      },
      commissions: {
        view: true,
        approve: true,
        configure: true,
      },
      reports: {
        view: true,
        export: true,
        financial: true,
      },
      projects: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    },
  },
  {
    name: "sales_manager",
    displayName: "Sales Manager",
    description: "Manage deals, contacts, commissions, and view reports",
    permissions: {
      contacts: {
        create: true,
        read: true,
        update: true,
        delete: true,
        export: true,
        import: true,
      },
      deals: {
        create: true,
        read: true,
        update: true,
        delete: true,
        assign: true,
      },
      commissions: {
        view: true,
        approve: true,
      },
      reports: {
        view: true,
        export: true,
        financial: true,
      },
    },
  },
  {
    name: "sales_rep",
    displayName: "Sales Representative",
    description: "Manage own deals and contacts only",
    permissions: {
      contacts: {
        create: true,
        read: "own",
        update: "own",
        delete: false,
      },
      deals: {
        create: true,
        read: "own",
        update: "own",
        delete: false,
      },
      commissions: {
        view: "own",
      },
      reports: {
        view: true,
      },
    },
  },
  {
    name: "marketing",
    displayName: "Marketing",
    description: "Manage campaigns and lead scoring configuration",
    permissions: {
      contacts: {
        read: true,
        export: true,
      },
      deals: {
        read: true,
      },
      campaigns: {
        create: true,
        read: true,
        update: true,
        delete: true,
        send: true,
      },
      leadScoring: {
        view: true,
        configure: true,
      },
      reports: {
        view: true,
        export: true,
      },
    },
  },
  {
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access to all data",
    permissions: {
      contacts: {
        read: true,
      },
      deals: {
        read: true,
      },
      campaigns: {
        read: true,
      },
      leadScoring: {
        view: true,
      },
      commissions: {
        view: true,
      },
      reports: {
        view: true,
      },
      projects: {
        read: true,
      },
    },
  },
  {
    name: "partner",
    displayName: "Partner",
    description: "Access to own leads and commission information only",
    permissions: {
      contacts: {
        create: true,
        read: "own",
        update: "own",
      },
      deals: {
        read: "own",
      },
      commissions: {
        view: "own",
      },
      partner: {
        leads: true,
        commission: true,
        dashboard: true,
      },
    },
  },
];
