// =============================================================================
// WHATSAPP CLOUD API SERVICE
// Handles all outbound communication with WhatsApp Business API
// =============================================================================

import { db, messages, conversations, eq } from "@nexus/db";

// =============================================================================
// CONFIGURATION
// =============================================================================

const WHATSAPP_API_VERSION = "v18.0";
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export interface TextMessage {
  type: "text";
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface TemplateMessage {
  type: "template";
  to: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters?: TemplateParameter[];
  subType?: "quick_reply" | "url";
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

export interface MediaMessage {
  type: "image" | "video" | "audio" | "document" | "sticker";
  to: string;
  mediaId?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
}

export interface LocationMessage {
  type: "location";
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactMessage {
  type: "contacts";
  to: string;
  contacts: WhatsAppContact[];
}

export interface WhatsAppContact {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{ phone: string; type?: string }>;
  emails?: Array<{ email: string; type?: string }>;
}

export interface InteractiveMessage {
  type: "interactive";
  to: string;
  interactiveType: "button" | "list" | "product" | "product_list";
  header?: InteractiveHeader;
  body: string;
  footer?: string;
  action: InteractiveAction;
}

interface InteractiveHeader {
  type: "text" | "image" | "video" | "document";
  text?: string;
  image?: { link: string };
  video?: { link: string };
  document?: { link: string };
}

interface InteractiveAction {
  buttons?: Array<{
    type: "reply";
    reply: { id: string; title: string };
  }>;
  button?: string;
  sections?: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export type OutboundMessage =
  | TextMessage
  | TemplateMessage
  | MediaMessage
  | LocationMessage
  | ContactMessage
  | InteractiveMessage;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

interface WhatsAppApiResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

interface MediaUploadResponse {
  id: string;
}

interface MediaUrlResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
}

// =============================================================================
// WHATSAPP SERVICE CLASS
// =============================================================================

export class WhatsAppService {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // SEND TEXT MESSAGE
  // ---------------------------------------------------------------------------

  async sendTextMessage(
    to: string,
    text: string,
    options?: { previewUrl?: boolean; replyToMessageId?: string }
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: options?.previewUrl ?? false,
        body: text,
      },
    };

    if (options?.replyToMessageId) {
      payload.context = { message_id: options.replyToMessageId };
    }

    return this.sendRequest(payload);
  }

  // ---------------------------------------------------------------------------
  // SEND TEMPLATE MESSAGE
  // ---------------------------------------------------------------------------

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: TemplateComponent[]
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components ?? [],
      },
    };

    return this.sendRequest(payload);
  }

  // ---------------------------------------------------------------------------
  // SEND MEDIA MESSAGE
  // ---------------------------------------------------------------------------

  async sendMediaMessage(
    to: string,
    mediaType: "image" | "video" | "audio" | "document" | "sticker",
    media: { id?: string; link?: string; caption?: string; filename?: string },
    options?: { replyToMessageId?: string }
  ): Promise<string> {
    const mediaPayload: Record<string, unknown> = {};

    if (media.id) {
      mediaPayload.id = media.id;
    } else if (media.link) {
      mediaPayload.link = media.link;
    }

    if (media.caption && ["image", "video", "document"].includes(mediaType)) {
      mediaPayload.caption = media.caption;
    }

    if (media.filename && mediaType === "document") {
      mediaPayload.filename = media.filename;
    }

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
    };

    if (options?.replyToMessageId) {
      payload.context = { message_id: options.replyToMessageId };
    }

    return this.sendRequest(payload);
  }

  // ---------------------------------------------------------------------------
  // SEND LOCATION MESSAGE
  // ---------------------------------------------------------------------------

  async sendLocationMessage(
    to: string,
    location: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "location",
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        address: location.address,
      },
    };

    return this.sendRequest(payload);
  }

  // ---------------------------------------------------------------------------
  // SEND CONTACTS MESSAGE
  // ---------------------------------------------------------------------------

  async sendContactsMessage(
    to: string,
    contacts: WhatsAppContact[]
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "contacts",
      contacts,
    };

    return this.sendRequest(payload);
  }

  // ---------------------------------------------------------------------------
  // SEND INTERACTIVE MESSAGE
  // ---------------------------------------------------------------------------

  async sendInteractiveMessage(
    to: string,
    interactive: {
      type: "button" | "list" | "product" | "product_list";
      header?: InteractiveHeader;
      body: string;
      footer?: string;
      action: InteractiveAction;
    }
  ): Promise<string> {
    const interactivePayload: Record<string, unknown> = {
      type: interactive.type,
      body: { text: interactive.body },
      action: interactive.action,
    };

    if (interactive.header) {
      interactivePayload.header = interactive.header;
    }

    if (interactive.footer) {
      interactivePayload.footer = { text: interactive.footer };
    }

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: interactivePayload,
    };

    return this.sendRequest(payload);
  }

  // ---------------------------------------------------------------------------
  // SEND REACTION
  // ---------------------------------------------------------------------------

  async sendReaction(
    to: string,
    messageId: string,
    emoji: string
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "reaction",
      reaction: {
        message_id: messageId,
        emoji,
      },
    };

    return this.sendRequest(payload);
  }

  // ---------------------------------------------------------------------------
  // MARK MESSAGE AS READ
  // ---------------------------------------------------------------------------

  async markAsRead(messageId: string): Promise<boolean> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppApiError;
      console.error("[WhatsApp] Failed to mark as read:", error);
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // MEDIA OPERATIONS
  // ---------------------------------------------------------------------------

  async uploadMedia(
    file: Buffer,
    mimeType: string,
    filename: string
  ): Promise<string> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/media`;

    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", new Blob([file], { type: mimeType }), filename);
    formData.append("type", mimeType);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppApiError;
      throw new Error(`WhatsApp media upload failed: ${error.error.message}`);
    }

    const data = (await response.json()) as MediaUploadResponse;
    return data.id;
  }

  async getMediaUrl(mediaId: string): Promise<MediaUrlResponse> {
    const url = `${WHATSAPP_API_BASE}/${mediaId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppApiError;
      throw new Error(`WhatsApp get media URL failed: ${error.error.message}`);
    }

    return (await response.json()) as MediaUrlResponse;
  }

  async downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
    // First get the media URL
    const mediaInfo = await this.getMediaUrl(mediaId);

    // Download the actual file
    const response = await fetch(mediaInfo.url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`WhatsApp media download failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      data: Buffer.from(arrayBuffer),
      mimeType: mediaInfo.mime_type,
    };
  }

  async deleteMedia(mediaId: string): Promise<boolean> {
    const url = `${WHATSAPP_API_BASE}/${mediaId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    return response.ok;
  }

  // ---------------------------------------------------------------------------
  // BUSINESS PROFILE
  // ---------------------------------------------------------------------------

  async getBusinessProfile(): Promise<Record<string, unknown>> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppApiError;
      throw new Error(`WhatsApp get business profile failed: ${error.error.message}`);
    }

    const data = await response.json();
    return data.data?.[0] ?? {};
  }

  async updateBusinessProfile(profile: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string;
  }): Promise<boolean> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/whatsapp_business_profile`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...profile,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppApiError;
      throw new Error(`WhatsApp update business profile failed: ${error.error.message}`);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private async sendRequest(payload: Record<string, unknown>): Promise<string> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/messages`;

    console.log("[WhatsApp] Sending message:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppApiError;
      console.error("[WhatsApp] API Error:", error);
      throw new Error(`WhatsApp API error: ${error.error.message} (code: ${error.error.code})`);
    }

    const data = (await response.json()) as WhatsAppApiResponse;
    const messageId = data.messages[0]?.id;

    if (!messageId) {
      throw new Error("WhatsApp API did not return a message ID");
    }

    console.log("[WhatsApp] Message sent successfully:", messageId);
    return messageId;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get WhatsApp service instance for a phone number
 */
export async function getWhatsAppService(
  phoneNumberId: string
): Promise<WhatsAppService | null> {
  // Look up phone number configuration
  const phoneConfig = await db.query.whatsappPhoneNumbers.findFirst({
    where: (pn, { eq }) => eq(pn.phoneNumberId, phoneNumberId),
  });

  if (!phoneConfig?.accessToken) {
    console.error(`[WhatsApp] No access token for phone number: ${phoneNumberId}`);
    return null;
  }

  return new WhatsAppService({
    phoneNumberId,
    accessToken: phoneConfig.accessToken,
  });
}

/**
 * Send a message and update database records
 */
export async function sendAndRecordMessage(
  messageId: string,
  conversationId: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    // Get message and conversation
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!message || !conversation) {
      return { success: false, error: "Message or conversation not found" };
    }

    if (!conversation.whatsappPhoneNumberId) {
      return { success: false, error: "No WhatsApp phone number configured" };
    }

    // Get WhatsApp service
    const whatsapp = await getWhatsAppService(conversation.whatsappPhoneNumberId);
    if (!whatsapp) {
      return { success: false, error: "WhatsApp service not available" };
    }

    let externalId: string;

    // Send based on message type
    switch (message.messageType) {
      case "text":
        externalId = await whatsapp.sendTextMessage(
          conversation.externalIdentifier,
          message.content ?? "",
          { replyToMessageId: message.replyToExternalId ?? undefined }
        );
        break;

      case "template":
        if (!message.templateData) {
          return { success: false, error: "Template data missing" };
        }
        const templateData = message.templateData as {
          name: string;
          language: string;
          components?: TemplateComponent[];
        };
        externalId = await whatsapp.sendTemplateMessage(
          conversation.externalIdentifier,
          templateData.name,
          templateData.language,
          templateData.components
        );
        break;

      case "image":
      case "video":
      case "audio":
      case "document":
        const media = message.media as { id?: string; link?: string; caption?: string; filename?: string } | null;
        if (!media) {
          return { success: false, error: "Media data missing" };
        }
        externalId = await whatsapp.sendMediaMessage(
          conversation.externalIdentifier,
          message.messageType as "image" | "video" | "audio" | "document",
          media,
          { replyToMessageId: message.replyToExternalId ?? undefined }
        );
        break;

      case "location":
        const location = message.location as { latitude: number; longitude: number; name?: string; address?: string } | null;
        if (!location) {
          return { success: false, error: "Location data missing" };
        }
        externalId = await whatsapp.sendLocationMessage(
          conversation.externalIdentifier,
          location
        );
        break;

      case "interactive":
        const interactive = message.interactiveData as {
          type: "button" | "list";
          header?: InteractiveHeader;
          body: string;
          footer?: string;
          action: InteractiveAction;
        } | null;
        if (!interactive) {
          return { success: false, error: "Interactive data missing" };
        }
        externalId = await whatsapp.sendInteractiveMessage(
          conversation.externalIdentifier,
          interactive
        );
        break;

      default:
        return { success: false, error: `Unsupported message type: ${message.messageType}` };
    }

    // Update message with external ID and status
    await db
      .update(messages)
      .set({
        externalMessageId: externalId,
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    return { success: true, externalId };
  } catch (error) {
    console.error("[WhatsApp] Send message error:", error);

    // Update message as failed
    await db
      .update(messages)
      .set({
        status: "failed",
        failedAt: new Date(),
        failureReason: String(error),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    return { success: false, error: String(error) };
  }
}
