import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages, messagingWebhookLogs, contacts, eq, and } from "@nexus/db";
import crypto from "crypto";
import { handleAutoResponse } from "@nexus/api/services/ai-agent";
import { syncContactToHubSpot } from "@nexus/api/services/hubspot";

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET!;

// =============================================================================
// WEBHOOK VERIFICATION (GET)
// Meta sends this to verify the webhook endpoint
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Log verification attempt
  console.log("[WhatsApp Webhook] Verification request:", { mode, token: token?.substring(0, 10) + "..." });

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("[WhatsApp Webhook] Verification failed");
  return new NextResponse("Forbidden", { status: 403 });
}

// =============================================================================
// WEBHOOK HANDLER (POST)
// Receives messages and status updates from WhatsApp
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody) as WhatsAppWebhookPayload;

    // Verify webhook signature
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifySignature(rawBody, signature)) {
      console.error("[WhatsApp Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Log webhook for debugging
    const webhookLog = await logWebhook(body);

    // Process webhook entries
    if (body.entry) {
      for (const entry of body.entry) {
        await processEntry(entry, webhookLog.id);
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing webhook:", error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: "error", message: String(error) }, { status: 200 });
  }
}

// =============================================================================
// SIGNATURE VERIFICATION
// =============================================================================

function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !WHATSAPP_APP_SECRET) {
    console.warn("[WhatsApp Webhook] Missing signature or app secret");
    // In development, allow without verification
    return process.env.NODE_ENV === "development";
  }

  const expectedSignature = "sha256=" +
    crypto
      .createHmac("sha256", WHATSAPP_APP_SECRET)
      .update(payload)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// =============================================================================
// WEBHOOK LOGGING
// =============================================================================

async function logWebhook(payload: WhatsAppWebhookPayload) {
  // Extract event type from payload
  let eventType = "unknown";
  if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
    eventType = "message";
  } else if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
    eventType = "status";
  }

  const [log] = await db
    .insert(messagingWebhookLogs)
    .values({
      channel: "whatsapp",
      eventType,
      payload: payload as unknown as Record<string, unknown>,
      processed: false,
    })
    .returning();

  return log;
}

// =============================================================================
// ENTRY PROCESSING
// =============================================================================

async function processEntry(entry: WhatsAppEntry, webhookLogId: string) {
  for (const change of entry.changes || []) {
    if (change.field !== "messages") continue;

    const value = change.value;

    // Process incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        await processIncomingMessage(value, message, webhookLogId);
      }
    }

    // Process status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        await processStatusUpdate(value, status, webhookLogId);
      }
    }
  }

  // Mark webhook as processed
  await db
    .update(messagingWebhookLogs)
    .set({
      processed: true,
      processedAt: new Date()
    })
    .where(eq(messagingWebhookLogs.id, webhookLogId));
}

// =============================================================================
// MESSAGE PROCESSING
// =============================================================================

async function processIncomingMessage(
  value: WhatsAppChangeValue,
  incomingMessage: WhatsAppMessage,
  webhookLogId: string
) {
  const phoneNumberId = value.metadata.phone_number_id;
  const senderNumber = incomingMessage.from;

  console.log(`[WhatsApp] Processing message from ${senderNumber}`);

  // Find or create conversation
  let conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.externalIdentifier, senderNumber),
      eq(conversations.channel, "whatsapp"),
      eq(conversations.whatsappPhoneNumberId, phoneNumberId)
    ),
  });

  // Get organization from phone number config
  const phoneConfig = await db.query.whatsappPhoneNumbers.findFirst({
    where: eq(conversations.whatsappPhoneNumberId, phoneNumberId),
  });

  const organizationId = phoneConfig?.organizationId;

  if (!organizationId) {
    console.error(`[WhatsApp] No organization found for phone number: ${phoneNumberId}`);
    return;
  }

  // Try to match with existing contact by WhatsApp number
  let contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.organizationId, organizationId),
      eq(contacts.whatsappNumber, senderNumber)
    ),
  });

  if (!conversation) {
    // Create new conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        organizationId,
        contactId: contact?.id,
        externalIdentifier: senderNumber,
        channel: "whatsapp",
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: value.metadata.display_phone_number,
        participantName: incomingMessage.contacts?.[0]?.profile?.name,
        status: "active",
        customerWindowOpen: true,
        customerWindowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      })
      .returning();
    conversation = newConversation;
  } else {
    // Update customer window (opens for 24h on incoming message)
    await db
      .update(conversations)
      .set({
        customerWindowOpen: true,
        customerWindowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));
  }

  // Parse message content
  const messageData = parseMessageContent(incomingMessage);

  // Store message
  const [storedMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      externalMessageId: incomingMessage.id,
      direction: "inbound",
      status: "delivered",
      messageType: incomingMessage.type,
      content: messageData.content,
      media: messageData.media,
      location: messageData.location,
      contactsData: messageData.contactsData,
      interactiveData: messageData.interactiveData,
      replyToExternalId: incomingMessage.context?.id,
      senderType: "contact",
      sentAt: new Date(parseInt(incomingMessage.timestamp) * 1000),
      deliveredAt: new Date(),
    })
    .returning();

  // Update conversation last message
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: messageData.content?.substring(0, 100) ?? incomingMessage.type,
      lastMessageDirection: "inbound",
      unreadCount: sql`COALESCE(${conversations.unreadCount}, 0) + 1`,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversation.id));

  // Update webhook log with message reference
  await db
    .update(messagingWebhookLogs)
    .set({
      conversationId: conversation.id,
      messageId: storedMessage.id,
    })
    .where(eq(messagingWebhookLogs.id, webhookLogId));

  // Handle consent keywords
  await handleConsentKeywords(incomingMessage, contact, organizationId, senderNumber);

  console.log(`[WhatsApp] Message stored: ${storedMessage.id}`);

  // Trigger AI auto-response if bot is active and not a consent keyword
  const textContent = incomingMessage.text?.body?.toUpperCase().trim();
  const isConsentKeyword = textContent && (
    OPT_IN_KEYWORDS.includes(textContent) || OPT_OUT_KEYWORDS.includes(textContent)
  );

  if (!isConsentKeyword && conversation.botActive && !conversation.automationPaused) {
    try {
      const autoResponse = await handleAutoResponse(
        conversation.id,
        storedMessage.id,
        organizationId,
        phoneConfig?.subsidiary ?? undefined
      );

      if (autoResponse.responded) {
        console.log(`[WhatsApp] AI auto-response sent for conversation: ${conversation.id}`);
      } else if (autoResponse.escalated) {
        console.log(`[WhatsApp] Escalated to human: ${autoResponse.escalationReason}`);
      }
    } catch (error) {
      console.error(`[WhatsApp] AI auto-response error:`, error);
      // Don't fail the webhook - auto-response is non-critical
    }
  }
}

// =============================================================================
// STATUS UPDATE PROCESSING
// =============================================================================

async function processStatusUpdate(
  value: WhatsAppChangeValue,
  status: WhatsAppStatus,
  webhookLogId: string
) {
  const externalMessageId = status.id;

  console.log(`[WhatsApp] Processing status update: ${status.status} for ${externalMessageId}`);

  // Find the message
  const message = await db.query.messages.findFirst({
    where: eq(messages.externalMessageId, externalMessageId),
  });

  if (!message) {
    console.warn(`[WhatsApp] Message not found for status update: ${externalMessageId}`);
    return;
  }

  // Map WhatsApp status to our status
  const statusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };

  const newStatus = statusMap[status.status];
  if (!newStatus) return;

  // Update message status
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  // Add timestamp based on status
  const timestamp = new Date(parseInt(status.timestamp) * 1000);
  if (status.status === "sent") updateData.sentAt = timestamp;
  if (status.status === "delivered") updateData.deliveredAt = timestamp;
  if (status.status === "read") updateData.readAt = timestamp;
  if (status.status === "failed") {
    updateData.failedAt = timestamp;
    updateData.failureReason = status.errors?.[0]?.message;
  }

  await db
    .update(messages)
    .set(updateData)
    .where(eq(messages.id, message.id));

  // Update webhook log
  await db
    .update(messagingWebhookLogs)
    .set({ messageId: message.id })
    .where(eq(messagingWebhookLogs.id, webhookLogId));

  console.log(`[WhatsApp] Status updated: ${message.id} -> ${newStatus}`);
}

// =============================================================================
// CONSENT KEYWORD HANDLING
// WhatsApp consent management via keywords
// =============================================================================

const OPT_IN_KEYWORDS = ["START", "SUBSCRIBE", "UNSTOP", "YES", "JA", "ANMELDEN"];
const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "ABMELDEN", "NEIN"];

async function handleConsentKeywords(
  message: WhatsAppMessage,
  contact: typeof contacts.$inferSelect | undefined,
  organizationId: string,
  phoneNumber: string
) {
  if (message.type !== "text") return;

  const text = message.text?.body?.toUpperCase().trim();
  if (!text) return;

  const isOptIn = OPT_IN_KEYWORDS.includes(text);
  const isOptOut = OPT_OUT_KEYWORDS.includes(text);

  if (!isOptIn && !isOptOut) return;

  console.log(`[WhatsApp] Consent keyword detected: ${text} (${isOptIn ? "OPT-IN" : "OPT-OUT"})`);

  let contactId: string | undefined;

  if (contact) {
    // Update existing contact consent
    await db
      .update(contacts)
      .set({
        consentStatus: isOptIn ? "granted" : "revoked",
        consentDate: new Date(),
        consentSource: "whatsapp_keyword",
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contact.id));
    contactId = contact.id;
  } else if (isOptIn) {
    // Create new contact with consent
    const [newContact] = await db
      .insert(contacts)
      .values({
        organizationId,
        email: `${phoneNumber}@whatsapp.placeholder`,
        whatsappNumber: phoneNumber,
        type: "lead",
        consentStatus: "granted",
        consentDate: new Date(),
        consentSource: "whatsapp_keyword",
        source: "whatsapp",
      })
      .returning();
    contactId = newContact?.id;
  }

  // Sync consent status to HubSpot
  if (contactId) {
    try {
      await syncContactToHubSpot(contactId, organizationId);
      console.log(`[WhatsApp] Consent synced to HubSpot for contact: ${contactId}`);
    } catch (error) {
      console.error(`[WhatsApp] Failed to sync consent to HubSpot:`, error);
      // Non-critical - don't fail the consent update
    }
  }

  // Send confirmation message (will be implemented via the conversation)
  // The AI agent or manual response will handle confirmation
}

// =============================================================================
// MESSAGE CONTENT PARSING
// =============================================================================

function parseMessageContent(message: WhatsAppMessage): {
  content?: string;
  media?: Record<string, unknown>;
  location?: Record<string, unknown>;
  contactsData?: Array<Record<string, unknown>>;
  interactiveData?: Record<string, unknown>;
} {
  switch (message.type) {
    case "text":
      return { content: message.text?.body };

    case "image":
      return {
        content: message.image?.caption,
        media: {
          mimeType: message.image?.mime_type,
          sha256: message.image?.sha256,
          id: message.image?.id,
          caption: message.image?.caption,
        },
      };

    case "video":
      return {
        content: message.video?.caption,
        media: {
          mimeType: message.video?.mime_type,
          sha256: message.video?.sha256,
          id: message.video?.id,
          caption: message.video?.caption,
        },
      };

    case "audio":
      return {
        media: {
          mimeType: message.audio?.mime_type,
          sha256: message.audio?.sha256,
          id: message.audio?.id,
        },
      };

    case "document":
      return {
        content: message.document?.caption,
        media: {
          mimeType: message.document?.mime_type,
          sha256: message.document?.sha256,
          id: message.document?.id,
          filename: message.document?.filename,
          caption: message.document?.caption,
        },
      };

    case "location":
      return {
        location: {
          latitude: message.location?.latitude,
          longitude: message.location?.longitude,
          name: message.location?.name,
          address: message.location?.address,
        },
      };

    case "contacts":
      return {
        contactsData: message.contacts?.map((c) => ({
          name: c.name?.formatted_name,
          phone: c.phones?.[0]?.phone,
          email: c.emails?.[0]?.email,
        })),
      };

    case "interactive":
      return {
        interactiveData: {
          type: message.interactive?.type,
          buttonReply: message.interactive?.button_reply,
          listReply: message.interactive?.list_reply,
        },
      };

    case "button":
      return {
        content: message.button?.text,
        interactiveData: {
          type: "button",
          payload: message.button?.payload,
        },
      };

    default:
      return { content: `[${message.type}]` };
  }
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface WhatsAppWebhookPayload {
  object: string;
  entry?: WhatsAppEntry[];
}

interface WhatsAppEntry {
  id: string;
  changes?: WhatsAppChange[];
}

interface WhatsAppChange {
  field: string;
  value: WhatsAppChangeValue;
}

interface WhatsAppChangeValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  context?: { id: string };
  contacts?: Array<{
    profile?: { name: string };
  }>;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string; voice?: boolean };
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: Array<{
    name?: { formatted_name: string };
    phones?: Array<{ phone: string }>;
    emails?: Array<{ email: string }>;
  }>;
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
}

interface WhatsAppStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}
