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

  // Role
  role: varchar("role", { length: 20 }).default("user"),

  // 2FA
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),

  // Status
  status: varchar("status", { length: 20 }).default("pending"),
  lastLoginAt: timestamp("last_login_at"),
  lastActivityAt: timestamp("last_activity_at"),

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
// RELATIONS
// =============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  apiKeys: many(apiKeys),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  apiKeys: many(apiKeys),
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
