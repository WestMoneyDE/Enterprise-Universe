// =============================================================================
// HUBSPOT CRM INTEGRATION SERVICE
// Handles bi-directional sync between Nexus and HubSpot CRM
// =============================================================================

import { db, contacts, deals, eq, and } from "@nexus/db";

// =============================================================================
// CONFIGURATION
// =============================================================================

const HUBSPOT_API_BASE = "https://api.hubapi.com";

interface HubSpotConfig {
  accessToken: string;
  portalId?: string;
}

// =============================================================================
// HUBSPOT TYPES
// =============================================================================

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    website?: string;
    hs_whatsapp_phone_number?: string;
    hs_lead_status?: string;
    lifecyclestage?: string;
    // Custom properties for GDPR consent
    consent_status?: string;
    consent_date?: string;
    consent_source?: string;
    // Custom properties for lead scoring
    lead_score?: string;
    lead_score_grade?: string;
    // Custom properties for West Money Bau
    interested_project_types?: string;
    budget_range?: string;
    financing_ready?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    description?: string;
    hs_deal_stage_probability?: string;
    hs_lastmodifieddate?: string;
    createdate?: string;
    // Custom properties
    deal_type?: string;
    construction_type?: string;
    project_address?: string;
  };
  associations?: {
    contacts?: { results: Array<{ id: string }> };
    companies?: { results: Array<{ id: string }> };
  };
  // Derived timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    industry?: string;
    numberofemployees?: string;
    annualrevenue?: string;
  };
}

interface HubSpotApiResponse<T> {
  results?: T[];
  total?: number;
  paging?: {
    next?: { after: string };
  };
}

interface HubSpotError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

// =============================================================================
// HUBSPOT SERVICE CLASS
// =============================================================================

export class HubSpotService {
  private config: HubSpotConfig;

  constructor(config: HubSpotConfig) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // CONTACTS
  // ---------------------------------------------------------------------------

  async getContact(contactId: string): Promise<HubSpotContact | null> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,company,jobtitle,address,city,state,zip,country,website,hs_whatsapp_phone_number,hs_lead_status,lifecyclestage,consent_status,consent_date,consent_source,lead_score,lead_score_grade`;

    const response = await this.request<HubSpotContact>(url, "GET");
    return response;
  }

  async searchContacts(query: {
    email?: string;
    phone?: string;
    whatsappNumber?: string;
  }): Promise<HubSpotContact[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];

    if (query.email) {
      filters.push({
        propertyName: "email",
        operator: "EQ",
        value: query.email,
      });
    }

    if (query.phone) {
      filters.push({
        propertyName: "phone",
        operator: "CONTAINS_TOKEN",
        value: query.phone,
      });
    }

    if (query.whatsappNumber) {
      filters.push({
        propertyName: "hs_whatsapp_phone_number",
        operator: "EQ",
        value: query.whatsappNumber,
      });
    }

    if (filters.length === 0) {
      return [];
    }

    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`;
    const body = {
      filterGroups: filters.length > 1
        ? [{ filters: [filters[0]] }, ...filters.slice(1).map(f => ({ filters: [f] }))]
        : [{ filters }],
      properties: [
        "email", "firstname", "lastname", "phone", "company", "jobtitle",
        "hs_whatsapp_phone_number", "hs_lead_status", "lifecyclestage",
        "consent_status", "consent_date", "consent_source",
        "lead_score", "lead_score_grade"
      ],
      limit: 10,
    };

    const response = await this.request<HubSpotApiResponse<HubSpotContact>>(
      url,
      "POST",
      body
    );

    return response?.results ?? [];
  }

  async createContact(properties: HubSpotContact["properties"]): Promise<HubSpotContact> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`;

    const response = await this.request<HubSpotContact>(url, "POST", {
      properties,
    });

    if (!response) {
      throw new Error("Failed to create HubSpot contact");
    }

    return response;
  }

  async updateContact(
    contactId: string,
    properties: Partial<HubSpotContact["properties"]>
  ): Promise<HubSpotContact> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`;

    const response = await this.request<HubSpotContact>(url, "PATCH", {
      properties,
    });

    if (!response) {
      throw new Error("Failed to update HubSpot contact");
    }

    return response;
  }

  async deleteContact(contactId: string): Promise<boolean> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`;
    await this.request(url, "DELETE");
    return true;
  }

  // ---------------------------------------------------------------------------
  // DEALS
  // ---------------------------------------------------------------------------

  async getDeal(dealId: string): Promise<HubSpotDeal | null> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,pipeline,closedate,description,deal_type,construction_type,project_address&associations=contacts,companies`;

    const response = await this.request<HubSpotDeal>(url, "GET");
    return response;
  }

  async searchDeals(query: {
    contactId?: string;
    pipeline?: string;
    dealstage?: string;
  }): Promise<HubSpotDeal[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];

    if (query.pipeline) {
      filters.push({
        propertyName: "pipeline",
        operator: "EQ",
        value: query.pipeline,
      });
    }

    if (query.dealstage) {
      filters.push({
        propertyName: "dealstage",
        operator: "EQ",
        value: query.dealstage,
      });
    }

    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`;
    const body = {
      filterGroups: filters.length > 0 ? [{ filters }] : [],
      properties: [
        "dealname", "amount", "dealstage", "pipeline", "closedate",
        "description", "deal_type", "construction_type", "project_address"
      ],
      limit: 100,
    };

    const response = await this.request<HubSpotApiResponse<HubSpotDeal>>(
      url,
      "POST",
      body
    );

    return response?.results ?? [];
  }

  async createDeal(
    properties: HubSpotDeal["properties"],
    associations?: { contactId?: string; companyId?: string }
  ): Promise<HubSpotDeal> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals`;

    const body: Record<string, unknown> = { properties };

    if (associations?.contactId || associations?.companyId) {
      body.associations = [];

      if (associations.contactId) {
        (body.associations as Array<unknown>).push({
          to: { id: associations.contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        });
      }

      if (associations.companyId) {
        (body.associations as Array<unknown>).push({
          to: { id: associations.companyId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 5 }],
        });
      }
    }

    const response = await this.request<HubSpotDeal>(url, "POST", body);

    if (!response) {
      throw new Error("Failed to create HubSpot deal");
    }

    return response;
  }

  async updateDeal(
    dealId: string,
    properties: Partial<HubSpotDeal["properties"]>
  ): Promise<HubSpotDeal> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${dealId}`;

    const response = await this.request<HubSpotDeal>(url, "PATCH", {
      properties,
    });

    if (!response) {
      throw new Error("Failed to update HubSpot deal");
    }

    return response;
  }

  // ---------------------------------------------------------------------------
  // COMPANIES
  // ---------------------------------------------------------------------------

  async getCompany(companyId: string): Promise<HubSpotCompany | null> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}?properties=name,domain,phone,address,city,state,zip,country,industry,numberofemployees,annualrevenue`;

    const response = await this.request<HubSpotCompany>(url, "GET");
    return response;
  }

  async searchCompanies(query: {
    name?: string;
    domain?: string;
  }): Promise<HubSpotCompany[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];

    if (query.name) {
      filters.push({
        propertyName: "name",
        operator: "CONTAINS_TOKEN",
        value: query.name,
      });
    }

    if (query.domain) {
      filters.push({
        propertyName: "domain",
        operator: "EQ",
        value: query.domain,
      });
    }

    if (filters.length === 0) {
      return [];
    }

    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/search`;
    const body = {
      filterGroups: [{ filters }],
      properties: ["name", "domain", "phone", "industry"],
      limit: 10,
    };

    const response = await this.request<HubSpotApiResponse<HubSpotCompany>>(
      url,
      "POST",
      body
    );

    return response?.results ?? [];
  }

  // ---------------------------------------------------------------------------
  // CONSENT MANAGEMENT (GDPR)
  // ---------------------------------------------------------------------------

  async updateContactConsent(
    contactId: string,
    consent: {
      status: "granted" | "revoked" | "pending";
      source: string;
      date: Date;
    }
  ): Promise<HubSpotContact> {
    return this.updateContact(contactId, {
      consent_status: consent.status,
      consent_source: consent.source,
      consent_date: consent.date.toISOString(),
      // Also update HubSpot's built-in legal basis fields
      ...(consent.status === "granted"
        ? {
            hs_legal_basis: "Consent",
          }
        : {}),
    });
  }

  // ---------------------------------------------------------------------------
  // LEAD SCORING
  // ---------------------------------------------------------------------------

  async updateContactLeadScore(
    contactId: string,
    score: number,
    grade: "A" | "B" | "C" | "D"
  ): Promise<HubSpotContact> {
    return this.updateContact(contactId, {
      lead_score: String(score),
      lead_score_grade: grade,
    });
  }

  // ---------------------------------------------------------------------------
  // WEBHOOKS
  // ---------------------------------------------------------------------------

  verifyWebhookSignature(
    payload: string,
    signature: string,
    clientSecret: string
  ): boolean {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", clientSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private async request<T>(
    url: string,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: unknown
  ): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = (await response.json()) as HubSpotError;
        console.error("[HubSpot] API Error:", error);

        if (response.status === 404) {
          return null;
        }

        throw new Error(`HubSpot API error: ${error.message} (${error.category})`);
      }

      if (method === "DELETE") {
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error("[HubSpot] Request failed:", error);
      throw error;
    }
  }
}

// =============================================================================
// BULK FETCH FUNCTIONS
// =============================================================================

/**
 * Fetch all contacts from HubSpot with pagination
 */
export async function fetchAllContactsFromHubSpot(
  accessToken: string,
  limit: number = 100
): Promise<{ contacts: HubSpotContact[]; total: number }> {
  const hubspot = new HubSpotService({ accessToken });
  const allContacts: HubSpotContact[] = [];
  let after: string | undefined;

  const properties = [
    "email", "firstname", "lastname", "phone", "company", "jobtitle",
    "address", "city", "state", "zip", "country", "website",
    "hs_whatsapp_phone_number", "hs_lead_status", "lifecyclestage",
    "consent_status", "consent_date", "consent_source",
    "lead_score", "lead_score_grade"
  ].join(",");

  do {
    const url = `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}&properties=${properties}${after ? `&after=${after}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HubSpot API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as HubSpotApiResponse<HubSpotContact>;

    if (data.results) {
      allContacts.push(...data.results);
    }

    after = data.paging?.next?.after;
  } while (after && allContacts.length < 10000); // Safety limit

  return { contacts: allContacts, total: allContacts.length };
}

/**
 * Fetch all deals from HubSpot with pagination
 */
export async function fetchAllDealsFromHubSpot(
  accessToken: string,
  limit: number = 100
): Promise<{ deals: HubSpotDeal[]; total: number }> {
  const allDeals: HubSpotDeal[] = [];
  let after: string | undefined;

  const properties = [
    "dealname", "amount", "dealstage", "pipeline", "closedate",
    "description", "deal_type", "construction_type", "project_address"
  ].join(",");

  do {
    const url = `https://api.hubapi.com/crm/v3/objects/deals?limit=${limit}&properties=${properties}&associations=contacts${after ? `&after=${after}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HubSpot API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as HubSpotApiResponse<HubSpotDeal>;

    if (data.results) {
      allDeals.push(...data.results);
    }

    after = data.paging?.next?.after;
  } while (after && allDeals.length < 10000); // Safety limit

  return { deals: allDeals, total: allDeals.length };
}

/**
 * Bulk import all contacts from HubSpot to Nexus database
 */
export async function bulkImportContactsFromHubSpot(
  organizationId: string
): Promise<{ success: boolean; imported: number; updated: number; errors: number; error?: string }> {
  try {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!accessToken) {
      return { success: false, imported: 0, updated: 0, errors: 0, error: "HUBSPOT_ACCESS_TOKEN not set" };
    }

    console.log("[HubSpot Sync] Fetching all contacts from HubSpot...");
    const { contacts: hubspotContacts, total } = await fetchAllContactsFromHubSpot(accessToken);
    console.log(`[HubSpot Sync] Found ${total} contacts in HubSpot`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const hsContact of hubspotContacts) {
      try {
        const props = hsContact.properties;

        // Skip contacts without email
        if (!props.email) {
          console.log(`[HubSpot Sync] Skipping contact ${hsContact.id} - no email`);
          continue;
        }

        // Check if contact already exists
        const existingContact = await db.query.contacts.findFirst({
          where: (c, { or, eq, and }) => and(
            eq(c.organizationId, organizationId),
            or(
              eq(c.hubspotContactId, hsContact.id),
              eq(c.email, props.email!)
            )
          ),
        });

        const contactData = {
          organizationId,
          email: props.email,
          firstName: props.firstname || null,
          lastName: props.lastname || null,
          phone: props.phone || null,
          company: props.company || null,
          position: props.jobtitle || null,
          street: props.address || null,
          city: props.city || null,
          postalCode: props.zip || null,
          country: props.country || null,
          whatsappNumber: props.hs_whatsapp_phone_number || null,
          hubspotContactId: hsContact.id,
          consentStatus: (props.consent_status as "granted" | "revoked" | "pending") || null,
          consentSource: props.consent_source || null,
          consentDate: props.consent_date ? new Date(props.consent_date) : null,
          leadScore: props.lead_score ? parseInt(props.lead_score, 10) : null,
          leadScoreGrade: (props.lead_score_grade as "A" | "B" | "C" | "D") || null,
          source: "hubspot" as const,
          updatedAt: new Date(),
        };

        if (existingContact) {
          await db.update(contacts)
            .set(contactData)
            .where(eq(contacts.id, existingContact.id));
          updated++;
        } else {
          await db.insert(contacts).values({
            ...contactData,
            type: "lead",
          });
          imported++;
        }
      } catch (err) {
        console.error(`[HubSpot Sync] Error importing contact ${hsContact.id}:`, err);
        errors++;
      }
    }

    console.log(`[HubSpot Sync] Contacts done: ${imported} imported, ${updated} updated, ${errors} errors`);
    return { success: true, imported, updated, errors };
  } catch (error) {
    console.error("[HubSpot Sync] Bulk import contacts error:", error);
    return { success: false, imported: 0, updated: 0, errors: 0, error: String(error) };
  }
}

/**
 * Bulk import all deals from HubSpot to Nexus database
 */
export async function bulkImportDealsFromHubSpot(
  organizationId: string
): Promise<{ success: boolean; imported: number; updated: number; errors: number; error?: string }> {
  try {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!accessToken) {
      return { success: false, imported: 0, updated: 0, errors: 0, error: "HUBSPOT_ACCESS_TOKEN not set" };
    }

    console.log("[HubSpot Sync] Fetching all deals from HubSpot...");
    const { deals: hubspotDeals, total } = await fetchAllDealsFromHubSpot(accessToken);
    console.log(`[HubSpot Sync] Found ${total} deals in HubSpot`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const hsDeal of hubspotDeals) {
      try {
        const props = hsDeal.properties;

        // Check if deal already exists
        const existingDeal = await db.query.deals.findFirst({
          where: (d, { eq, and }) => and(
            eq(d.organizationId, organizationId),
            eq(d.hubspotDealId, hsDeal.id)
          ),
        });

        // Map HubSpot stage to Nexus stage
        // Valid stages: lead, qualified, proposal, negotiation, won, lost
        const stageMapping: Record<string, "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost"> = {
          appointmentscheduled: "lead",
          qualifiedtobuy: "qualified",
          presentationscheduled: "proposal",
          decisionmakerboughtin: "proposal",
          contractsent: "negotiation",
          closedwon: "won",
          closedlost: "lost",
        };
        const stage = stageMapping[props.dealstage?.toLowerCase() ?? ""] || "lead";

        // Try to find associated contact
        let contactId: string | null = null;
        const associatedContactId = hsDeal.associations?.contacts?.results?.[0]?.id;
        if (associatedContactId) {
          const contact = await db.query.contacts.findFirst({
            where: (c, { eq, and }) => and(
              eq(c.organizationId, organizationId),
              eq(c.hubspotContactId, associatedContactId)
            ),
          });
          contactId = contact?.id ?? null;
        }

        const dealData = {
          organizationId,
          name: props.dealname || `Deal ${hsDeal.id}`,
          amount: props.amount || null, // Keep as string to match schema
          stage,
          expectedCloseDate: props.closedate ? new Date(props.closedate) : null,
          description: props.description || null,
          hubspotDealId: hsDeal.id,
          contactId,
          updatedAt: new Date(),
        };

        if (existingDeal) {
          await db.update(deals)
            .set(dealData)
            .where(eq(deals.id, existingDeal.id));
          updated++;
        } else {
          await db.insert(deals).values(dealData);
          imported++;
        }
      } catch (err) {
        console.error(`[HubSpot Sync] Error importing deal ${hsDeal.id}:`, err);
        errors++;
      }
    }

    console.log(`[HubSpot Sync] Deals done: ${imported} imported, ${updated} updated, ${errors} errors`);
    return { success: true, imported, updated, errors };
  } catch (error) {
    console.error("[HubSpot Sync] Bulk import deals error:", error);
    return { success: false, imported: 0, updated: 0, errors: 0, error: String(error) };
  }
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Get HubSpot service instance for an organization
 */
export async function getHubSpotService(
  organizationId: string
): Promise<HubSpotService | null> {
  // Look up organization's HubSpot credentials
  const org = await db.query.organizations.findFirst({
    where: (orgs, { eq }) => eq(orgs.id, organizationId),
  });

  // Check for HubSpot access token in organization settings or env
  const accessToken =
    (org?.settings as Record<string, unknown>)?.hubspotAccessToken as string ??
    process.env.HUBSPOT_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn(`[HubSpot] No access token for organization: ${organizationId}`);
    return null;
  }

  return new HubSpotService({ accessToken });
}

/**
 * Sync a Nexus contact to HubSpot
 */
export async function syncContactToHubSpot(
  contactId: string,
  organizationId: string
): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  try {
    const hubspot = await getHubSpotService(organizationId);
    if (!hubspot) {
      return { success: false, error: "HubSpot not configured" };
    }

    // Get Nexus contact
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, contactId),
        eq(contacts.organizationId, organizationId)
      ),
    });

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    // Map Nexus fields to HubSpot properties
    const properties: HubSpotContact["properties"] = {
      email: contact.email,
      firstname: contact.firstName ?? undefined,
      lastname: contact.lastName ?? undefined,
      phone: contact.phone ?? undefined,
      company: contact.company ?? undefined,
      jobtitle: contact.position ?? undefined,
      address: contact.street ?? undefined,
      city: contact.city ?? undefined,
      zip: contact.postalCode ?? undefined,
      country: contact.country ?? undefined,
      hs_whatsapp_phone_number: contact.whatsappNumber ?? undefined,
      consent_status: contact.consentStatus ?? undefined,
      consent_source: contact.consentSource ?? undefined,
      consent_date: contact.consentDate?.toISOString() ?? undefined,
      lead_score: contact.leadScore?.toString() ?? undefined,
    };

    let hubspotContact: HubSpotContact;

    if (contact.hubspotContactId) {
      // Update existing HubSpot contact
      hubspotContact = await hubspot.updateContact(contact.hubspotContactId, properties);
    } else {
      // Check if contact exists by email
      const existingContacts = await hubspot.searchContacts({ email: contact.email });

      if (existingContacts.length > 0) {
        // Link and update existing
        hubspotContact = await hubspot.updateContact(existingContacts[0].id, properties);
      } else {
        // Create new contact
        hubspotContact = await hubspot.createContact(properties);
      }

      // Save HubSpot ID to Nexus
      await db
        .update(contacts)
        .set({
          hubspotContactId: hubspotContact.id,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId));
    }

    return { success: true, hubspotId: hubspotContact.id };
  } catch (error) {
    console.error("[HubSpot] Sync contact error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync a HubSpot contact to Nexus
 */
export async function syncContactFromHubSpot(
  hubspotContactId: string,
  organizationId: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const hubspot = await getHubSpotService(organizationId);
    if (!hubspot) {
      return { success: false, error: "HubSpot not configured" };
    }

    // Get HubSpot contact
    const hubspotContact = await hubspot.getContact(hubspotContactId);
    if (!hubspotContact) {
      return { success: false, error: "HubSpot contact not found" };
    }

    const props = hubspotContact.properties;

    // Check if contact already exists in Nexus
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.hubspotContactId, hubspotContactId),
        eq(contacts.organizationId, organizationId)
      ),
    });

    if (!contact && props.email) {
      // Try to find by email
      contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.email, props.email),
          eq(contacts.organizationId, organizationId)
        ),
      });
    }

    const contactData = {
      organizationId,
      email: props.email ?? `hubspot-${hubspotContactId}@placeholder.local`,
      firstName: props.firstname,
      lastName: props.lastname,
      phone: props.phone,
      company: props.company,
      jobTitle: props.jobtitle,
      street: props.address,
      city: props.city,
      postalCode: props.zip,
      country: props.country,
      whatsappNumber: props.hs_whatsapp_phone_number,
      hubspotContactId: hubspotContactId,
      consentStatus: props.consent_status as "granted" | "revoked" | "pending" | null,
      consentSource: props.consent_source,
      consentDate: props.consent_date ? new Date(props.consent_date) : null,
      leadScore: props.lead_score ? parseInt(props.lead_score, 10) : null,
      leadScoreGrade: props.lead_score_grade as "A" | "B" | "C" | "D" | null,
      source: "hubspot" as const,
      updatedAt: new Date(),
    };

    if (contact) {
      // Update existing
      await db
        .update(contacts)
        .set(contactData)
        .where(eq(contacts.id, contact.id));

      return { success: true, contactId: contact.id };
    } else {
      // Create new
      const [newContact] = await db
        .insert(contacts)
        .values({
          ...contactData,
          type: "lead",
        })
        .returning();

      return { success: true, contactId: newContact.id };
    }
  } catch (error) {
    console.error("[HubSpot] Sync from HubSpot error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync a Nexus deal to HubSpot
 */
export async function syncDealToHubSpot(
  dealId: string,
  organizationId: string
): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  try {
    const hubspot = await getHubSpotService(organizationId);
    if (!hubspot) {
      return { success: false, error: "HubSpot not configured" };
    }

    // Get Nexus deal with contact
    const deal = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.organizationId, organizationId)),
      with: { contact: true },
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    // Map Nexus fields to HubSpot properties
    const properties: HubSpotDeal["properties"] = {
      dealname: deal.name,
      amount: deal.amount?.toString() ?? undefined,
      closedate: deal.expectedCloseDate?.toISOString() ?? undefined,
      description: deal.description ?? undefined,
    };

    let hubspotDeal: HubSpotDeal;

    if (deal.hubspotDealId) {
      // Update existing
      hubspotDeal = await hubspot.updateDeal(deal.hubspotDealId, properties);
    } else {
      // Create new with contact association if available
      const associations = deal.contact?.hubspotContactId
        ? { contactId: deal.contact.hubspotContactId }
        : undefined;

      hubspotDeal = await hubspot.createDeal(properties, associations);

      // Save HubSpot ID to Nexus
      await db
        .update(deals)
        .set({
          hubspotDealId: hubspotDeal.id,
          updatedAt: new Date(),
        })
        .where(eq(deals.id, dealId));
    }

    return { success: true, hubspotId: hubspotDeal.id };
  } catch (error) {
    console.error("[HubSpot] Sync deal error:", error);
    return { success: false, error: String(error) };
  }
}
