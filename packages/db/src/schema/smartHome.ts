import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  smartHomeDeviceTypeEnum,
  smartHomeProviderEnum,
  subsidiaryEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { projects } from "./projects";
import { kundenkarten } from "./kundenkarte";

// =============================================================================
// SMART HOME INSTALLATIONS
// =============================================================================

/**
 * Smart Home Installations - LOXONE & Multi-Provider Smart Home Management
 *
 * Tracks complete smart home installations including configuration,
 * device inventory, rooms, scenes, and automation rules.
 */
export const smartHomeInstallations = pgTable(
  "smart_home_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // References
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    kundenkarteId: uuid("kundenkarte_id").references(() => kundenkarten.id, { onDelete: "set null" }),

    // Installation Details
    installationName: varchar("installation_name", { length: 255 }).notNull(),
    provider: smartHomeProviderEnum("provider").notNull(),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // Location
    adresse: text("adresse").notNull(),
    plz: varchar("plz", { length: 10 }).notNull(),
    ort: varchar("ort", { length: 100 }).notNull(),

    // Status
    status: varchar("status", { length: 50 }).default("geplant"),
    // geplant, in_installation, konfiguration, test, live, wartung

    // Provider-specific Configuration
    loxoneConfig: jsonb("loxone_config").$type<{
      miniserverIp?: string;
      miniserverSerial?: string;
      miniserverVersion?: string;
      cloudConnected?: boolean;
      cloudUser?: string;
      lastSync?: string;
      extensions?: Array<{
        type: string;
        serial: string;
        name: string;
      }>;
    }>(),

    // General Configuration
    generalConfig: jsonb("general_config").$type<{
      timezone?: string;
      language?: string;
      currency?: string;
      units?: "metric" | "imperial";
      latitude?: number;
      longitude?: number;
    }>(),

    // Access Credentials (encrypted)
    accessCredentials: jsonb("access_credentials").$type<{
      adminUser?: string;
      // Passwords should be stored encrypted
      apiToken?: string;
      apiEndpoint?: string;
    }>(),

    // Statistics
    totalDevices: integer("total_devices").default(0),
    totalRooms: integer("total_rooms").default(0),
    totalScenes: integer("total_scenes").default(0),
    totalAutomations: integer("total_automations").default(0),

    // Warranty & Support
    installationDate: timestamp("installation_date", { mode: "date" }),
    warrantyEndDate: timestamp("warranty_end_date", { mode: "date" }),
    supportContractActive: boolean("support_contract_active").default(false),
    supportContractEndDate: timestamp("support_contract_end_date", { mode: "date" }),

    // Notes
    notes: text("notes"),
    internalNotes: text("internal_notes"),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("sh_installations_org_idx").on(table.organizationId),
    projectIdx: index("sh_installations_project_idx").on(table.projectId),
    providerIdx: index("sh_installations_provider_idx").on(table.provider),
    statusIdx: index("sh_installations_status_idx").on(table.status),
  })
);

// =============================================================================
// SMART HOME ROOMS
// =============================================================================

export const smartHomeRooms = pgTable(
  "smart_home_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => smartHomeInstallations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }), // wohnzimmer, schlafzimmer, kueche, bad, etc.
    floor: varchar("floor", { length: 50 }), // EG, OG, UG, DG
    area: decimal("area", { precision: 8, scale: 2 }), // m²

    // Provider-specific ID
    externalId: varchar("external_id", { length: 100 }),

    // Image/Icon
    image: text("image"),
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 20 }),

    // Device counts
    deviceCount: integer("device_count").default(0),

    // Climate settings
    defaultTemperature: decimal("default_temperature", { precision: 4, scale: 1 }),
    comfortTemperature: decimal("comfort_temperature", { precision: 4, scale: 1 }),
    ecoTemperature: decimal("eco_temperature", { precision: 4, scale: 1 }),

    sortOrder: integer("sort_order").default(0),
    active: boolean("active").default(true),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    installationIdx: index("sh_rooms_installation_idx").on(table.installationId),
    typeIdx: index("sh_rooms_type_idx").on(table.type),
  })
);

// =============================================================================
// SMART HOME DEVICES
// =============================================================================

export const smartHomeDevices = pgTable(
  "smart_home_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => smartHomeInstallations.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => smartHomeRooms.id, { onDelete: "set null" }),

    // Device Information
    name: varchar("name", { length: 255 }).notNull(),
    deviceType: smartHomeDeviceTypeEnum("device_type").notNull(),
    manufacturer: varchar("manufacturer", { length: 100 }),
    model: varchar("model", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    firmwareVersion: varchar("firmware_version", { length: 50 }),

    // Provider-specific
    externalId: varchar("external_id", { length: 100 }),
    externalType: varchar("external_type", { length: 100 }),

    // Status
    status: varchar("status", { length: 50 }).default("online"),
    // online, offline, error, unknown
    lastSeen: timestamp("last_seen", { mode: "date" }),
    batteryLevel: integer("battery_level"), // 0-100

    // Current State (stored as JSON for flexibility)
    currentState: jsonb("current_state").$type<Record<string, unknown>>(),
    // Examples:
    // Lighting: { on: true, brightness: 80, color: "#FFE4B5" }
    // Climate: { temperature: 21.5, humidity: 45, mode: "heat" }
    // Shading: { position: 50, tilt: 30 }

    // Capabilities
    capabilities: jsonb("capabilities").$type<string[]>(),
    // Examples: ["on_off", "dimming", "color", "temperature"]

    // Configuration
    config: jsonb("config").$type<Record<string, unknown>>(),

    // Energy Tracking (if applicable)
    energyTracking: boolean("energy_tracking").default(false),
    totalEnergyKwh: decimal("total_energy_kwh", { precision: 12, scale: 3 }),

    // Installation
    installedAt: timestamp("installed_at", { mode: "date" }),
    installedBy: uuid("installed_by").references(() => users.id),

    // Icon/Display
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 20 }),
    sortOrder: integer("sort_order").default(0),

    active: boolean("active").default(true),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    installationIdx: index("sh_devices_installation_idx").on(table.installationId),
    roomIdx: index("sh_devices_room_idx").on(table.roomId),
    deviceTypeIdx: index("sh_devices_type_idx").on(table.deviceType),
    statusIdx: index("sh_devices_status_idx").on(table.status),
    externalIdIdx: index("sh_devices_external_id_idx").on(table.externalId),
  })
);

// =============================================================================
// SMART HOME SCENES
// =============================================================================

export const smartHomeScenes = pgTable(
  "smart_home_scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => smartHomeInstallations.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => smartHomeRooms.id, { onDelete: "set null" }),

    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    // Provider-specific
    externalId: varchar("external_id", { length: 100 }),

    // Scene Type
    type: varchar("type", { length: 50 }), // lighting, climate, all

    // Actions to perform
    actions: jsonb("actions").$type<Array<{
      deviceId: string;
      action: string;
      params: Record<string, unknown>;
      delay?: number; // ms
    }>>(),

    // Icon/Display
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 20 }),
    image: text("image"),

    // Usage tracking
    lastActivated: timestamp("last_activated", { mode: "date" }),
    activationCount: integer("activation_count").default(0),

    favorite: boolean("favorite").default(false),
    sortOrder: integer("sort_order").default(0),
    active: boolean("active").default(true),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    installationIdx: index("sh_scenes_installation_idx").on(table.installationId),
    roomIdx: index("sh_scenes_room_idx").on(table.roomId),
  })
);

// =============================================================================
// SMART HOME AUTOMATIONS
// =============================================================================

export const smartHomeAutomations = pgTable(
  "smart_home_automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => smartHomeInstallations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Provider-specific
    externalId: varchar("external_id", { length: 100 }),

    // Triggers
    triggers: jsonb("triggers").$type<Array<{
      type: "time" | "device" | "scene" | "presence" | "weather" | "custom";
      config: Record<string, unknown>;
    }>>(),

    // Conditions
    conditions: jsonb("conditions").$type<Array<{
      type: string;
      operator: string;
      value: unknown;
    }>>(),

    // Actions
    actions: jsonb("actions").$type<Array<{
      type: "device" | "scene" | "notification" | "webhook";
      target: string;
      action: string;
      params?: Record<string, unknown>;
      delay?: number;
    }>>(),

    // Schedule (if time-based)
    schedule: jsonb("schedule").$type<{
      type: "daily" | "weekly" | "cron";
      time?: string;
      days?: number[];
      cron?: string;
    }>(),

    // Status
    enabled: boolean("enabled").default(true),
    lastTriggered: timestamp("last_triggered", { mode: "date" }),
    triggerCount: integer("trigger_count").default(0),
    lastError: text("last_error"),

    // Priority
    priority: integer("priority").default(0),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    installationIdx: index("sh_automations_installation_idx").on(table.installationId),
    enabledIdx: index("sh_automations_enabled_idx").on(table.enabled),
  })
);

// =============================================================================
// SMART HOME EVENT LOG
// =============================================================================

export const smartHomeEvents = pgTable(
  "smart_home_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => smartHomeInstallations.id, { onDelete: "cascade" }),

    // Event Source
    deviceId: uuid("device_id").references(() => smartHomeDevices.id, { onDelete: "set null" }),
    sceneId: uuid("scene_id").references(() => smartHomeScenes.id, { onDelete: "set null" }),
    automationId: uuid("automation_id").references(() => smartHomeAutomations.id, { onDelete: "set null" }),

    // Event Details
    eventType: varchar("event_type", { length: 100 }).notNull(),
    // device_state_change, scene_activated, automation_triggered, error, etc.
    eventData: jsonb("event_data").$type<Record<string, unknown>>(),

    // Source
    source: varchar("source", { length: 50 }), // user, automation, schedule, api

    // User who triggered (if applicable)
    triggeredBy: uuid("triggered_by").references(() => users.id),

    timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    installationIdx: index("sh_events_installation_idx").on(table.installationId),
    deviceIdx: index("sh_events_device_idx").on(table.deviceId),
    typeIdx: index("sh_events_type_idx").on(table.eventType),
    timestampIdx: index("sh_events_timestamp_idx").on(table.timestamp),
  })
);

// =============================================================================
// SMART HOME ENERGY DATA
// =============================================================================

export const smartHomeEnergyData = pgTable(
  "smart_home_energy_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => smartHomeInstallations.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => smartHomeDevices.id, { onDelete: "set null" }),

    // Time period
    periodStart: timestamp("period_start", { mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
    periodType: varchar("period_type", { length: 20 }).notNull(), // hour, day, week, month

    // Energy values
    consumptionKwh: decimal("consumption_kwh", { precision: 12, scale: 3 }),
    productionKwh: decimal("production_kwh", { precision: 12, scale: 3 }), // solar
    feedInKwh: decimal("feed_in_kwh", { precision: 12, scale: 3 }),
    selfConsumptionKwh: decimal("self_consumption_kwh", { precision: 12, scale: 3 }),

    // Cost
    costEur: decimal("cost_eur", { precision: 10, scale: 2 }),
    revenueEur: decimal("revenue_eur", { precision: 10, scale: 2 }),

    // Peak values
    peakPowerW: decimal("peak_power_w", { precision: 10, scale: 2 }),
    peakTimestamp: timestamp("peak_timestamp", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    installationIdx: index("sh_energy_installation_idx").on(table.installationId),
    deviceIdx: index("sh_energy_device_idx").on(table.deviceId),
    periodIdx: index("sh_energy_period_idx").on(table.periodStart, table.periodEnd),
    periodTypeIdx: index("sh_energy_period_type_idx").on(table.periodType),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const smartHomeInstallationsRelations = relations(smartHomeInstallations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [smartHomeInstallations.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [smartHomeInstallations.projectId],
    references: [projects.id],
  }),
  kundenkarte: one(kundenkarten, {
    fields: [smartHomeInstallations.kundenkarteId],
    references: [kundenkarten.id],
  }),
  rooms: many(smartHomeRooms),
  devices: many(smartHomeDevices),
  scenes: many(smartHomeScenes),
  automations: many(smartHomeAutomations),
  events: many(smartHomeEvents),
  energyData: many(smartHomeEnergyData),
}));

export const smartHomeRoomsRelations = relations(smartHomeRooms, ({ one, many }) => ({
  installation: one(smartHomeInstallations, {
    fields: [smartHomeRooms.installationId],
    references: [smartHomeInstallations.id],
  }),
  devices: many(smartHomeDevices),
  scenes: many(smartHomeScenes),
}));

export const smartHomeDevicesRelations = relations(smartHomeDevices, ({ one, many }) => ({
  installation: one(smartHomeInstallations, {
    fields: [smartHomeDevices.installationId],
    references: [smartHomeInstallations.id],
  }),
  room: one(smartHomeRooms, {
    fields: [smartHomeDevices.roomId],
    references: [smartHomeRooms.id],
  }),
  events: many(smartHomeEvents),
  energyData: many(smartHomeEnergyData),
}));

export const smartHomeScenesRelations = relations(smartHomeScenes, ({ one }) => ({
  installation: one(smartHomeInstallations, {
    fields: [smartHomeScenes.installationId],
    references: [smartHomeInstallations.id],
  }),
  room: one(smartHomeRooms, {
    fields: [smartHomeScenes.roomId],
    references: [smartHomeRooms.id],
  }),
}));

export const smartHomeAutomationsRelations = relations(smartHomeAutomations, ({ one }) => ({
  installation: one(smartHomeInstallations, {
    fields: [smartHomeAutomations.installationId],
    references: [smartHomeInstallations.id],
  }),
}));

export const smartHomeEventsRelations = relations(smartHomeEvents, ({ one }) => ({
  installation: one(smartHomeInstallations, {
    fields: [smartHomeEvents.installationId],
    references: [smartHomeInstallations.id],
  }),
  device: one(smartHomeDevices, {
    fields: [smartHomeEvents.deviceId],
    references: [smartHomeDevices.id],
  }),
  scene: one(smartHomeScenes, {
    fields: [smartHomeEvents.sceneId],
    references: [smartHomeScenes.id],
  }),
  automation: one(smartHomeAutomations, {
    fields: [smartHomeEvents.automationId],
    references: [smartHomeAutomations.id],
  }),
}));

export const smartHomeEnergyDataRelations = relations(smartHomeEnergyData, ({ one }) => ({
  installation: one(smartHomeInstallations, {
    fields: [smartHomeEnergyData.installationId],
    references: [smartHomeInstallations.id],
  }),
  device: one(smartHomeDevices, {
    fields: [smartHomeEnergyData.deviceId],
    references: [smartHomeDevices.id],
  }),
}));
