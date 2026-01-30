// =============================================================================
// WHATSAPP BUSINESS API SERVICE
// Comprehensive WhatsApp Cloud API integration for lead communication
// =============================================================================

import { TRPCError } from "@trpc/server";
import {
  db,
  contacts,
  contactActivities,
  conversations,
  messages,
  eq,
  and,
  desc,
  sql,
} from "@nexus/db";
import { updateContactLeadScore } from "./lead-scoring-engine";

// =============================================================================
// CONFIGURATION
// =============================================================================

const WHATSAPP_API_VERSION = "v18.0";
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// Environment variables
const getConfig = () => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "WhatsApp API credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
    });
  }

  return { phoneNumberId, accessToken, verifyToken };
};

// =============================================================================
// TYPES
// =============================================================================

export interface WhatsAppApiResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface WhatsAppApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters?: TemplateParameter[];
  sub_type?: "quick_reply" | "url";
  index?: number;
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

export interface SendNotificationOptions {
  to: string;
  leadId?: string;
  status: string;
  details?: string;
  previewUrl?: boolean;
}

export interface SendTemplateOptions {
  to: string;
  leadId?: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "video" | "audio" | "document" | "location" | "contacts" | "interactive" | "button" | "reaction";
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: Array<{
    name: { formatted_name: string; first_name?: string; last_name?: string };
    phones?: Array<{ phone: string; type?: string }>;
  }>;
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
  reaction?: { message_id: string; emoji: string };
  context?: { from: string; id: string };
}

export interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string; error_data?: { details: string } }>;
  conversation?: { id: string; origin: { type: string }; expiration_timestamp?: string };
  pricing?: { billable: boolean; pricing_model: string; category: string };
}

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: "whatsapp";
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: WebhookMessage[];
        statuses?: WebhookStatus[];
      };
      field: "messages";
    }>;
  }>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  waId?: string;
  error?: string;
}

export interface CreateLeadResult {
  success: boolean;
  contactId?: string;
  conversationId?: string;
  isNew: boolean;
  error?: string;
}

export interface ReceiveMessageResult {
  success: boolean;
  messageId?: string;
  conversationId?: string;
  contactId?: string;
  isNewLead: boolean;
  error?: string;
}

// =============================================================================
// CORE API REQUEST
// =============================================================================

async function sendApiRequest(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken } = getConfig();
  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/${endpoint}`;

  console.log("[WhatsApp] Sending API request:", JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = (await response.json()) as WhatsAppApiError;
    console.error("[WhatsApp] API Error:", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `WhatsApp API error: ${error.error.message} (code: ${error.error.code})`,
    });
  }

  const data = (await response.json()) as WhatsAppApiResponse;
  console.log("[WhatsApp] API Response:", JSON.stringify(data, null, 2));
  return data;
}

// =============================================================================
// SEND NOTIFICATION
// =============================================================================

/**
 * Send a status update notification to a lead via WhatsApp
 * Used for project updates, appointment reminders, document requests, etc.
 */
export async function sendNotification(
  options: SendNotificationOptions
): Promise<SendResult> {
  try {
    const { to, leadId, status, details, previewUrl } = options;

    // Format the notification message
    const message = formatNotificationMessage(status, details);

    // Build payload
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: "text",
      text: {
        preview_url: previewUrl ?? false,
        body: message,
      },
    };

    // Send via API
    const response = await sendApiRequest("messages", payload);

    const messageId = response.messages[0]?.id;
    const waId = response.contacts[0]?.wa_id;

    if (!messageId) {
      return { success: false, error: "No message ID returned from API" };
    }

    // Record the outbound message if we have a lead
    if (leadId) {
      await recordOutboundMessage(leadId, messageId, "text", message);
    }

    console.log(`[WhatsApp] Notification sent successfully: ${messageId}`);
    return { success: true, messageId, waId };
  } catch (error) {
    console.error("[WhatsApp] Send notification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatNotificationMessage(status: string, details?: string): string {
  const statusMessages: Record<string, string> = {
    lead_created: "Vielen Dank für Ihre Anfrage! Wir haben Ihre Daten erhalten und melden uns in Kürze bei Ihnen.",
    document_requested: "Wir benötigen noch einige Unterlagen von Ihnen. Bitte laden Sie diese über unser Portal hoch.",
    appointment_scheduled: "Ihr Termin wurde erfolgreich gebucht.",
    appointment_reminder: "Erinnerung: Sie haben morgen einen Termin bei uns.",
    quote_ready: "Ihr Angebot ist fertig! Sie können es in Ihrem Kundenportal einsehen.",
    project_update: "Es gibt Neuigkeiten zu Ihrem Projekt.",
    payment_received: "Vielen Dank! Ihre Zahlung ist bei uns eingegangen.",
    general: "Wichtige Mitteilung von West Money Bau:",
  };

  let message = statusMessages[status] || statusMessages.general;

  if (details) {
    message += `\n\n${details}`;
  }

  return message;
}

// =============================================================================
// SEND TEMPLATE MESSAGE
// =============================================================================

/**
 * Send a pre-approved WhatsApp template message
 * Templates must be approved by Meta before use
 */
export async function sendTemplate(
  options: SendTemplateOptions
): Promise<SendResult> {
  try {
    const { to, leadId, templateName, languageCode, components } = options;

    // Build template payload
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components ?? [],
      },
    };

    // Send via API
    const response = await sendApiRequest("messages", payload);

    const messageId = response.messages[0]?.id;
    const waId = response.contacts[0]?.wa_id;

    if (!messageId) {
      return { success: false, error: "No message ID returned from API" };
    }

    // Record the outbound message if we have a lead
    if (leadId) {
      await recordOutboundMessage(leadId, messageId, "template", templateName, {
        templateName,
        languageCode,
        components,
      });
    }

    console.log(`[WhatsApp] Template message sent successfully: ${messageId}`);
    return { success: true, messageId, waId };
  } catch (error) {
    console.error("[WhatsApp] Send template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// RECEIVE MESSAGE (WEBHOOK HANDLER)
// =============================================================================

/**
 * Process incoming WhatsApp webhook payload
 * Handles messages, status updates, and creates/updates conversations
 */
export async function receiveMessage(
  payload: WebhookPayload,
  organizationId: string
): Promise<ReceiveMessageResult> {
  try {
    // Validate webhook structure
    if (payload.object !== "whatsapp_business_account") {
      return { success: false, isNewLead: false, error: "Invalid webhook object type" };
    }

    const entry = payload.entry[0];
    if (!entry) {
      return { success: false, isNewLead: false, error: "No entry in webhook payload" };
    }

    const change = entry.changes[0];
    if (!change || change.field !== "messages") {
      return { success: false, isNewLead: false, error: "No message changes in webhook" };
    }

    const value = change.value;
    const metadata = value.metadata;

    // Process status updates
    if (value.statuses && value.statuses.length > 0) {
      await processStatusUpdates(value.statuses);
      return { success: true, isNewLead: false };
    }

    // Process incoming messages
    if (value.messages && value.messages.length > 0) {
      const message = value.messages[0];
      const contactInfo = value.contacts?.[0];

      // Find or create the contact/lead
      const leadResult = await createLeadFromMessage({
        phoneNumber: message.from,
        profileName: contactInfo?.profile?.name,
        waId: contactInfo?.wa_id ?? message.from,
        organizationId,
      });

      if (!leadResult.success || !leadResult.contactId) {
        return { success: false, isNewLead: false, error: leadResult.error };
      }

      // Find or create conversation
      const conversation = await findOrCreateConversation(
        leadResult.contactId,
        message.from,
        metadata.phone_number_id,
        organizationId
      );

      // Store the message
      const storedMessage = await storeInboundMessage(
        conversation.id,
        message,
        contactInfo?.profile?.name
      );

      // Update conversation with last message info
      await updateConversationLastMessage(conversation.id, message);

      // Trigger lead score update for engagement
      await updateLeadScore(leadResult.contactId, "whatsapp_message_received");

      console.log(`[WhatsApp] Message received and processed: ${storedMessage.id}`);
      return {
        success: true,
        messageId: storedMessage.id,
        conversationId: conversation.id,
        contactId: leadResult.contactId,
        isNewLead: leadResult.isNew,
      };
    }

    return { success: true, isNewLead: false };
  } catch (error) {
    console.error("[WhatsApp] Receive message error:", error);
    return {
      success: false,
      isNewLead: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify webhook subscription (GET request from Meta)
 */
export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string
): { valid: boolean; challenge?: string } {
  const { verifyToken } = getConfig();

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp] Webhook verification successful");
    return { valid: true, challenge };
  }

  console.warn("[WhatsApp] Webhook verification failed");
  return { valid: false };
}

// =============================================================================
// CREATE LEAD FROM MESSAGE
// =============================================================================

/**
 * Create or find a lead/contact from an incoming WhatsApp message
 */
export async function createLeadFromMessage(params: {
  phoneNumber: string;
  profileName?: string;
  waId: string;
  organizationId: string;
}): Promise<CreateLeadResult> {
  try {
    const { phoneNumber, profileName, waId, organizationId } = params;
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Try to find existing contact by WhatsApp number
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.organizationId, organizationId),
        eq(contacts.whatsappNumber, normalizedPhone)
      ),
    });

    // Also check mobile/phone fields
    if (!contact) {
      contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.organizationId, organizationId),
          eq(contacts.mobile, normalizedPhone)
        ),
      });
    }

    if (!contact) {
      contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.organizationId, organizationId),
          eq(contacts.phone, normalizedPhone)
        ),
      });
    }

    if (contact) {
      // Update WhatsApp number if not set
      if (!contact.whatsappNumber) {
        await db.update(contacts)
          .set({
            whatsappNumber: normalizedPhone,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contact.id));
      }

      return {
        success: true,
        contactId: contact.id,
        isNew: false,
      };
    }

    // Create new lead
    const nameParts = parseProfileName(profileName);
    const placeholderEmail = `whatsapp-${waId}@placeholder.nexus`;

    const [newContact] = await db.insert(contacts)
      .values({
        organizationId,
        email: placeholderEmail,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        whatsappNumber: normalizedPhone,
        mobile: normalizedPhone,
        type: "lead",
        source: "whatsapp",
        sourceDetail: "Incoming WhatsApp message",
        consentStatus: "pending", // Need explicit consent
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Record activity for new lead
    await db.insert(contactActivities).values({
      contactId: newContact.id,
      organizationId,
      type: "lead_created",
      title: "Lead created from WhatsApp",
      description: `New lead created from incoming WhatsApp message from ${normalizedPhone}`,
      metadata: {
        source: "whatsapp",
        phoneNumber: normalizedPhone,
        waId,
        profileName,
      },
      occurredAt: new Date(),
    });

    console.log(`[WhatsApp] New lead created: ${newContact.id}`);
    return {
      success: true,
      contactId: newContact.id,
      isNew: true,
    };
  } catch (error) {
    console.error("[WhatsApp] Create lead error:", error);
    return {
      success: false,
      isNew: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// UPDATE LEAD SCORE
// =============================================================================

/**
 * Trigger lead score update based on WhatsApp engagement
 */
export async function updateLeadScore(
  contactId: string,
  engagementType: string
): Promise<void> {
  try {
    // Record the engagement activity
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
    });

    if (!contact) {
      console.warn(`[WhatsApp] Contact not found for score update: ${contactId}`);
      return;
    }

    // Record activity
    await db.insert(contactActivities).values({
      contactId,
      organizationId: contact.organizationId,
      type: engagementType,
      title: getEngagementTitle(engagementType),
      description: getEngagementDescription(engagementType),
      metadata: {
        channel: "whatsapp",
        timestamp: new Date().toISOString(),
      },
      occurredAt: new Date(),
    });

    // Update engagement metrics
    await db.update(contacts)
      .set({
        lastEngagementAt: new Date(),
        engagementScore: (contact.engagementScore ?? 0) + getEngagementPoints(engagementType),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId));

    // Recalculate lead score
    await updateContactLeadScore(contactId);

    console.log(`[WhatsApp] Lead score updated for contact: ${contactId}`);
  } catch (error) {
    console.error("[WhatsApp] Update lead score error:", error);
    // Don't throw - score update is non-critical
  }
}

function getEngagementTitle(type: string): string {
  const titles: Record<string, string> = {
    whatsapp_message_received: "WhatsApp Message Received",
    whatsapp_message_sent: "WhatsApp Message Sent",
    whatsapp_message_read: "WhatsApp Message Read",
    whatsapp_template_sent: "WhatsApp Template Sent",
    whatsapp_button_clicked: "WhatsApp Button Clicked",
    whatsapp_list_selected: "WhatsApp List Item Selected",
  };
  return titles[type] || "WhatsApp Engagement";
}

function getEngagementDescription(type: string): string {
  const descriptions: Record<string, string> = {
    whatsapp_message_received: "Contact sent a message via WhatsApp",
    whatsapp_message_sent: "Message sent to contact via WhatsApp",
    whatsapp_message_read: "Contact read a WhatsApp message",
    whatsapp_template_sent: "Template message sent via WhatsApp",
    whatsapp_button_clicked: "Contact clicked a button in WhatsApp message",
    whatsapp_list_selected: "Contact selected an item from WhatsApp list",
  };
  return descriptions[type] || "WhatsApp engagement recorded";
}

function getEngagementPoints(type: string): number {
  const points: Record<string, number> = {
    whatsapp_message_received: 15, // High value - customer initiated contact
    whatsapp_message_sent: 3,
    whatsapp_message_read: 5,
    whatsapp_template_sent: 2,
    whatsapp_button_clicked: 10, // Interactive engagement
    whatsapp_list_selected: 10,
  };
  return points[type] || 5;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle German numbers
  if (cleaned.startsWith("0")) {
    cleaned = "49" + cleaned.substring(1);
  }

  // Ensure it starts with country code
  if (!cleaned.startsWith("49") && !cleaned.startsWith("43") && !cleaned.startsWith("41")) {
    // Default to Germany if no country code
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = "49" + cleaned;
    }
  }

  return cleaned;
}

/**
 * Parse WhatsApp profile name into first/last name
 */
function parseProfileName(name?: string): { firstName?: string; lastName?: string } {
  if (!name) return {};

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Find or create a conversation for a contact
 */
async function findOrCreateConversation(
  contactId: string,
  phoneNumber: string,
  phoneNumberId: string,
  organizationId: string
): Promise<{ id: string }> {
  // Look for existing conversation
  const existing = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.contactId, contactId),
      eq(conversations.channel, "whatsapp"),
      eq(conversations.organizationId, organizationId)
    ),
    orderBy: [desc(conversations.lastMessageAt)],
  });

  if (existing) {
    return { id: existing.id };
  }

  // Create new conversation
  const [newConversation] = await db.insert(conversations)
    .values({
      organizationId,
      contactId,
      externalIdentifier: normalizePhoneNumber(phoneNumber),
      channel: "whatsapp",
      whatsappPhoneNumberId: phoneNumberId,
      status: "active",
      customerWindowOpen: true,
      customerWindowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return { id: newConversation.id };
}

/**
 * Store an inbound message in the database
 */
async function storeInboundMessage(
  conversationId: string,
  message: WebhookMessage,
  senderName?: string
): Promise<{ id: string }> {
  const content = extractMessageContent(message);
  const messageType = message.type;

  const [stored] = await db.insert(messages)
    .values({
      conversationId,
      externalMessageId: message.id,
      direction: "inbound" as const,
      status: "delivered" as const,
      messageType,
      content,
      media: extractMediaData(message),
      location: message.location as { latitude: number; longitude: number; name?: string; address?: string } | undefined,
      contactsData: message.contacts?.map(c => ({
        name: c.name?.formatted_name ?? "Unknown",
        phone: c.phones?.[0]?.phone,
      })),
      interactiveData: message.interactive ? {
        type: message.interactive.type as "button" | "list" | "product" | "product_list",
        action: message.interactive.button_reply || message.interactive.list_reply,
      } : undefined,
      replyToExternalId: message.context?.id,
      senderType: "contact",
      deliveredAt: new Date(parseInt(message.timestamp) * 1000),
    })
    .returning();

  return { id: stored.id };
}

function extractMessageContent(message: WebhookMessage): string | null {
  switch (message.type) {
    case "text":
      return message.text?.body ?? null;
    case "image":
      return message.image?.caption ?? "[Image]";
    case "video":
      return message.video?.caption ?? "[Video]";
    case "audio":
      return "[Voice Message]";
    case "document":
      return message.document?.caption ?? `[Document: ${message.document?.filename ?? "unknown"}]`;
    case "location":
      return message.location?.name ?? `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
    case "contacts":
      return `[Contact: ${message.contacts?.[0]?.name?.formatted_name ?? "Unknown"}]`;
    case "interactive":
    case "button":
      return message.interactive?.button_reply?.title ??
             message.interactive?.list_reply?.title ??
             message.button?.text ?? null;
    case "reaction":
      return `[Reaction: ${message.reaction?.emoji}]`;
    default:
      return null;
  }
}

function extractMediaData(message: WebhookMessage): Record<string, unknown> | undefined {
  const mediaTypes = ["image", "video", "audio", "document"] as const;

  for (const type of mediaTypes) {
    const media = message[type];
    if (media) {
      return {
        id: media.id,
        mimeType: media.mime_type,
        sha256: media.sha256,
        caption: "caption" in media ? media.caption : undefined,
        fileName: "filename" in media ? media.filename : undefined,
      };
    }
  }

  return undefined;
}

/**
 * Update conversation with last message info
 */
async function updateConversationLastMessage(
  conversationId: string,
  message: WebhookMessage
): Promise<void> {
  const content = extractMessageContent(message);

  await db.update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: content?.substring(0, 255),
      lastMessageDirection: "inbound",
      unreadCount: sql`${conversations.unreadCount} + 1`,
      customerWindowOpen: true,
      customerWindowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));
}

/**
 * Record an outbound message in the database
 */
async function recordOutboundMessage(
  leadId: string,
  externalMessageId: string,
  messageType: string,
  content: string,
  templateData?: Record<string, unknown>
): Promise<void> {
  try {
    // Find contact
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, leadId),
    });

    if (!contact) return;

    // Find conversation
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.contactId, leadId),
        eq(conversations.channel, "whatsapp")
      ),
      orderBy: [desc(conversations.lastMessageAt)],
    });

    if (!conversation) return;

    // Store message
    await db.insert(messages).values({
      conversationId: conversation.id,
      externalMessageId,
      direction: "outbound" as const,
      status: "sent" as const,
      messageType,
      content,
      templateData: templateData ? {
        name: templateData.templateName as string,
        language: templateData.languageCode as string,
        components: templateData.components as Array<{
          type: string;
          parameters: Array<{
            type: string;
            text?: string;
            image?: { link: string };
            document?: { link: string; filename: string };
          }>;
        }> | undefined,
      } : undefined,
      senderType: "system",
      sentAt: new Date(),
    });

    // Update conversation
    await db.update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 255),
        lastMessageDirection: "outbound",
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));

    // Record activity
    await db.insert(contactActivities).values({
      contactId: leadId,
      organizationId: contact.organizationId,
      type: messageType === "template" ? "whatsapp_template_sent" : "whatsapp_message_sent",
      title: messageType === "template" ? "WhatsApp Template Sent" : "WhatsApp Message Sent",
      description: content.substring(0, 500),
      metadata: {
        externalMessageId,
        messageType,
        templateData,
      },
      occurredAt: new Date(),
    });
  } catch (error) {
    console.error("[WhatsApp] Record outbound message error:", error);
    // Don't throw - message recording is non-critical
  }
}

/**
 * Process status updates from webhook
 */
async function processStatusUpdates(statuses: WebhookStatus[]): Promise<void> {
  for (const status of statuses) {
    try {
      // Find message by external ID
      const message = await db.query.messages.findFirst({
        where: eq(messages.externalMessageId, status.id),
      });

      if (!message) continue;

      // Update message status
      const updates: Record<string, unknown> = {
        status: status.status,
        updatedAt: new Date(),
      };

      if (status.status === "delivered") {
        updates.deliveredAt = new Date(parseInt(status.timestamp) * 1000);
      } else if (status.status === "read") {
        updates.readAt = new Date(parseInt(status.timestamp) * 1000);

        // Trigger score update for read receipt
        const conversation = await db.query.conversations.findFirst({
          where: eq(conversations.id, message.conversationId),
        });
        if (conversation?.contactId) {
          await updateLeadScore(conversation.contactId, "whatsapp_message_read");
        }
      } else if (status.status === "failed") {
        updates.failedAt = new Date(parseInt(status.timestamp) * 1000);
        updates.failureReason = status.errors?.[0]?.message ?? "Unknown error";
      }

      await db.update(messages)
        .set(updates)
        .where(eq(messages.id, message.id));

      // Store pricing info if available
      if (status.pricing) {
        await db.update(messages)
          .set({
            cost: {
              amount: 0, // Meta doesn't provide exact cost in webhook
              currency: "EUR",
              category: status.pricing.category,
            },
          })
          .where(eq(messages.id, message.id));
      }
    } catch (error) {
      console.error(`[WhatsApp] Process status update error for ${status.id}:`, error);
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const whatsappService = {
  sendNotification,
  sendTemplate,
  receiveMessage,
  verifyWebhook,
  createLeadFromMessage,
  updateLeadScore,
};

export default whatsappService;
