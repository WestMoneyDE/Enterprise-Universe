// =============================================================================
// WHATSAPP MESSAGE SENDING SERVICE
// Sends messages via WhatsApp Cloud API and records results
// =============================================================================

import { db, messages, conversations, contacts, eq } from "@nexus/db";

// WhatsApp API Configuration
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v18.0";
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

interface WhatsAppApiResponse {
  messages?: Array<{ id: string }>;
  contacts?: Array<{ wa_id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.");
  }

  return { phoneNumberId, accessToken };
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle German numbers starting with 0
  if (cleaned.startsWith("0")) {
    cleaned = "49" + cleaned.slice(1);
  }

  // Ensure it has a country code
  if (!cleaned.startsWith("49") && cleaned.length === 10) {
    cleaned = "49" + cleaned;
  }

  return cleaned;
}

/**
 * Send a message via WhatsApp Cloud API and record the result
 */
export async function sendAndRecordMessage(
  messageId: string,
  conversationId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get message details
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Get conversation and contact
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Get contact phone number
    const contact = conversation.contactId
      ? await db.query.contacts.findFirst({
          where: eq(contacts.id, conversation.contactId),
        })
      : null;

    const phoneNumber =
      conversation.externalIdentifier ||
      contact?.whatsappNumber ||
      contact?.mobile ||
      contact?.phone;

    if (!phoneNumber) {
      await updateMessageStatus(messageId, "failed", "No phone number available");
      return { success: false, error: "No phone number available" };
    }

    // Build WhatsApp API payload based on message type
    const payload = buildMessagePayload(message, phoneNumber);

    // Send via WhatsApp API
    const { phoneNumberId, accessToken } = getConfig();
    const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

    console.log("[WhatsApp] Sending message:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: WhatsAppApiResponse = await response.json();

    if (!response.ok || data.error) {
      const errorMessage = data.error?.message || `HTTP ${response.status}`;
      console.error("[WhatsApp] API error:", errorMessage);
      await updateMessageStatus(messageId, "failed", errorMessage);
      return { success: false, error: errorMessage };
    }

    const waMessageId = data.messages?.[0]?.id;

    if (!waMessageId) {
      await updateMessageStatus(messageId, "failed", "No message ID returned");
      return { success: false, error: "No message ID returned from API" };
    }

    // Update message with WhatsApp message ID and sent status
    await db
      .update(messages)
      .set({
        externalMessageId: waMessageId,
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    console.log(`[WhatsApp] Message sent successfully: ${waMessageId}`);
    return { success: true, messageId: waMessageId };
  } catch (error) {
    console.error("[WhatsApp] Send error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateMessageStatus(messageId, "failed", errorMessage);
    return { success: false, error: errorMessage };
  }
}

function buildMessagePayload(
  message: { messageType: string; content: string | null; media?: unknown },
  phoneNumber: string
): Record<string, unknown> {
  const to = normalizePhoneNumber(phoneNumber);

  switch (message.messageType) {
    case "text":
      return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: message.content || "",
        },
      };

    case "image":
      return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "image",
        image: {
          link: (message.media as { url?: string })?.url,
          caption: message.content || undefined,
        },
      };

    case "document":
      return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "document",
        document: {
          link: (message.media as { url?: string })?.url,
          caption: message.content || undefined,
          filename: (message.media as { filename?: string })?.filename,
        },
      };

    case "audio":
      return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "audio",
        audio: {
          link: (message.media as { url?: string })?.url,
        },
      };

    case "video":
      return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "video",
        video: {
          link: (message.media as { url?: string })?.url,
          caption: message.content || undefined,
        },
      };

    default:
      // Default to text for unknown types
      return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          body: message.content || "",
        },
      };
  }
}

async function updateMessageStatus(
  messageId: string,
  status: "sent" | "delivered" | "read" | "failed",
  failureReason?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "failed" && failureReason) {
    updateData.failedAt = new Date();
    updateData.failureReason = failureReason;
  }

  await db.update(messages).set(updateData).where(eq(messages.id, messageId));
}
