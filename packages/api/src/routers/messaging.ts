import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, adminProcedure } from "../trpc";
import {
  db,
  conversations,
  messages,
  messageTemplates,
  whatsappPhoneNumbers,
  messagingBroadcasts,
  messagingWebhookLogs,
  contacts,
  eq,
  and,
  desc,
  asc,
  count,
  sql,
  inArray,
} from "@nexus/db";
import { sendAndRecordMessage } from "../services/whatsapp";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const conversationFilterSchema = z.object({
  search: z.string().optional(),
  channel: z.enum(["email", "whatsapp", "sms", "push", "in_app"]).optional(),
  status: z.enum(["active", "archived", "blocked"]).optional(),
  assignedTo: z.string().uuid().optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  unreadOnly: z.boolean().optional(),
  customerWindowOpen: z.boolean().optional(),
});

const messageFilterSchema = z.object({
  direction: z.enum(["inbound", "outbound"]).optional(),
  status: z.enum(["pending", "sent", "delivered", "read", "failed", "bounced"]).optional(),
  messageType: z.string().optional(),
});

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  messageType: z.enum(["text", "image", "video", "audio", "document", "template", "interactive"]),
  content: z.string().optional(),
  media: z.object({
    url: z.string().url(),
    mimeType: z.string(),
    fileSize: z.number().optional(),
    fileName: z.string().optional(),
    caption: z.string().optional(),
  }).optional(),
  templateData: z.object({
    name: z.string(),
    language: z.string(),
    components: z.array(z.object({
      type: z.string(),
      parameters: z.array(z.object({
        type: z.string(),
        text: z.string().optional(),
        image: z.object({ link: z.string() }).optional(),
        document: z.object({ link: z.string(), filename: z.string() }).optional(),
      })),
    })).optional(),
  }).optional(),
  interactiveData: z.object({
    type: z.enum(["button", "list", "product", "product_list"]),
    header: z.object({ type: z.string(), text: z.string().optional(), image: z.string().optional() }).optional(),
    body: z.object({ text: z.string() }).optional(),
    footer: z.object({ text: z.string() }).optional(),
    action: z.record(z.unknown()).optional(),
  }).optional(),
  replyToMessageId: z.string().uuid().optional(),
});

const createConversationSchema = z.object({
  contactId: z.string().uuid().optional(),
  externalIdentifier: z.string().max(100),
  channel: z.enum(["email", "whatsapp", "sms", "push", "in_app"]),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  participantName: z.string().max(255).optional(),
});

const updateConversationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "archived", "blocked"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  labels: z.array(z.string()).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  automationPaused: z.boolean().optional(),
  botActive: z.boolean().optional(),
  internalNotes: z.string().optional(),
});

const templateFilterSchema = z.object({
  channel: z.enum(["email", "whatsapp", "sms", "push", "in_app"]).optional(),
  category: z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]).optional(),
  whatsappStatus: z.enum(["APPROVED", "PENDING", "REJECTED", "PAUSED"]).optional(),
  active: z.boolean().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().max(100),
  channel: z.enum(["email", "whatsapp", "sms", "push", "in_app"]),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  category: z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]).optional(),
  language: z.string().max(10).default("de"),
  header: z.object({
    type: z.enum(["none", "text", "image", "video", "document"]),
    text: z.string().optional(),
    example: z.string().optional(),
  }).optional(),
  body: z.string(),
  bodyVariables: z.array(z.object({
    name: z.string(),
    example: z.string(),
  })).optional(),
  footer: z.string().max(60).optional(),
  buttons: z.array(z.object({
    type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"]),
    text: z.string(),
    url: z.string().optional(),
    urlType: z.enum(["STATIC", "DYNAMIC"]).optional(),
    phoneNumber: z.string().optional(),
    example: z.string().optional(),
  })).optional(),
});

// =============================================================================
// MESSAGING ROUTER
// =============================================================================

export const messagingRouter = createTRPCRouter({
  // ===========================================================================
  // CONVERSATIONS
  // ===========================================================================

  /**
   * List conversations with filters and pagination
   */
  listConversations: orgProcedure
    .input(z.object({
      filters: conversationFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [eq(conversations.organizationId, ctx.organizationId)];

      if (filters?.search) {
        conditions.push(
          sql`(
            ${conversations.participantName} ILIKE ${`%${filters.search}%`} OR
            ${conversations.externalIdentifier} ILIKE ${`%${filters.search}%`} OR
            ${conversations.lastMessagePreview} ILIKE ${`%${filters.search}%`}
          )`
        );
      }

      if (filters?.channel) {
        conditions.push(eq(conversations.channel, filters.channel));
      }

      if (filters?.status) {
        conditions.push(eq(conversations.status, filters.status));
      }

      if (filters?.assignedTo) {
        conditions.push(eq(conversations.assignedTo, filters.assignedTo));
      }

      if (filters?.subsidiary) {
        conditions.push(eq(conversations.subsidiary, filters.subsidiary));
      }

      if (filters?.unreadOnly) {
        conditions.push(sql`${conversations.unreadCount} > 0`);
      }

      if (filters?.customerWindowOpen !== undefined) {
        conditions.push(eq(conversations.customerWindowOpen, filters.customerWindowOpen));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(conversations)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      // Get paginated results
      const items = await db.query.conversations.findMany({
        where: and(...conditions),
        orderBy: [desc(conversations.lastMessageAt), desc(conversations.createdAt)],
        limit,
        offset,
        with: {
          contact: true,
          assignedToUser: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get single conversation by ID with messages
   */
  getConversation: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      includeMessages: z.boolean().default(true),
      messageLimit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.id),
          eq(conversations.organizationId, ctx.organizationId)
        ),
        with: {
          contact: true,
          assignedToUser: true,
          messages: input.includeMessages ? {
            orderBy: desc(messages.createdAt),
            limit: input.messageLimit,
          } : undefined,
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conversation;
    }),

  /**
   * Create new conversation
   */
  createConversation: orgProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for existing conversation with same external identifier and channel
      const existing = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.organizationId, ctx.organizationId),
          eq(conversations.externalIdentifier, input.externalIdentifier),
          eq(conversations.channel, input.channel)
        ),
      });

      if (existing) {
        // Return existing conversation instead of creating duplicate
        return existing;
      }

      // Get participant name from contact if not provided
      let participantName = input.participantName;
      if (!participantName && input.contactId) {
        const contact = await db.query.contacts.findFirst({
          where: eq(contacts.id, input.contactId),
        });
        if (contact) {
          participantName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
        }
      }

      const [conversation] = await db
        .insert(conversations)
        .values({
          organizationId: ctx.organizationId,
          contactId: input.contactId,
          externalIdentifier: input.externalIdentifier,
          channel: input.channel,
          subsidiary: input.subsidiary ?? "west_money_bau",
          participantName,
          status: "active",
        })
        .returning();

      return conversation;
    }),

  /**
   * Update conversation
   */
  updateConversation: orgProcedure
    .input(updateConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const existing = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, id),
          eq(conversations.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const [conversation] = await db
        .update(conversations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, id))
        .returning();

      return conversation;
    }),

  /**
   * Mark conversation as read (reset unread count)
   */
  markAsRead: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await db
        .update(conversations)
        .set({
          unreadCount: 0,
          updatedAt: new Date(),
        })
        .where(and(
          eq(conversations.id, input.id),
          eq(conversations.organizationId, ctx.organizationId)
        ))
        .returning();

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conversation;
    }),

  // ===========================================================================
  // MESSAGES
  // ===========================================================================

  /**
   * List messages in a conversation
   */
  listMessages: orgProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      filters: messageFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { conversationId, filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 50;
      const offset = (page - 1) * limit;

      // Verify conversation ownership
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, ctx.organizationId)
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Build where conditions
      const conditions = [eq(messages.conversationId, conversationId)];

      if (filters?.direction) {
        conditions.push(eq(messages.direction, filters.direction));
      }

      if (filters?.status) {
        conditions.push(eq(messages.status, filters.status));
      }

      if (filters?.messageType) {
        conditions.push(eq(messages.messageType, filters.messageType));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(messages)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      // Get paginated results (oldest first for chat view)
      const items = await db.query.messages.findMany({
        where: and(...conditions),
        orderBy: pagination?.sortOrder === "desc"
          ? desc(messages.createdAt)
          : asc(messages.createdAt),
        limit,
        offset,
        with: {
          sender: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Send a message
   */
  sendMessage: orgProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const { conversationId, ...messageData } = input;

      // Verify conversation ownership and get details
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, ctx.organizationId)
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Check if WhatsApp and outside customer window - require template
      if (
        conversation.channel === "whatsapp" &&
        !conversation.customerWindowOpen &&
        messageData.messageType !== "template"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp customer window is closed. Please use a template message.",
        });
      }

      // Create message record
      const [message] = await db
        .insert(messages)
        .values({
          conversationId,
          direction: "outbound",
          status: "pending",
          messageType: messageData.messageType,
          content: messageData.content,
          media: messageData.media,
          templateData: messageData.templateData,
          interactiveData: messageData.interactiveData,
          replyToMessageId: messageData.replyToMessageId,
          senderType: "user",
          senderId: ctx.user.id,
        })
        .returning();

      // Update conversation last message
      const preview = messageData.content?.substring(0, 100) ??
                     (messageData.templateData ? `Template: ${messageData.templateData.name}` :
                     messageData.messageType);

      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          lastMessagePreview: preview,
          lastMessageDirection: "outbound",
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Send message via appropriate channel
      if (conversation.channel === "whatsapp") {
        // Send via WhatsApp Cloud API
        const result = await sendAndRecordMessage(message.id, conversationId);

        if (!result.success) {
          console.error("[Messaging] WhatsApp send failed:", result.error);
          // Message is marked as failed in the service, return updated message
          const updatedMessage = await db.query.messages.findFirst({
            where: eq(messages.id, message.id),
          });
          return updatedMessage ?? message;
        }
      }
      // TODO: Add SMS sending via Twilio or similar
      // TODO: Add push notification sending

      return message;
    }),

  /**
   * Get single message by ID
   */
  getMessage: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const message = await db.query.messages.findFirst({
        where: eq(messages.id, input.id),
        with: {
          conversation: true,
          sender: true,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      // Verify organization access
      if (message.conversation.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return message;
    }),

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  /**
   * List message templates
   */
  listTemplates: orgProcedure
    .input(z.object({
      filters: templateFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [eq(messageTemplates.organizationId, ctx.organizationId)];

      if (filters?.channel) {
        conditions.push(eq(messageTemplates.channel, filters.channel));
      }

      if (filters?.category) {
        conditions.push(eq(messageTemplates.category, filters.category));
      }

      if (filters?.whatsappStatus) {
        conditions.push(eq(messageTemplates.whatsappStatus, filters.whatsappStatus));
      }

      if (filters?.active !== undefined) {
        conditions.push(eq(messageTemplates.active, filters.active));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(messageTemplates)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      // Get paginated results
      const items = await db
        .select()
        .from(messageTemplates)
        .where(and(...conditions))
        .orderBy(desc(messageTemplates.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get template by ID
   */
  getTemplate: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await db.query.messageTemplates.findFirst({
        where: and(
          eq(messageTemplates.id, input.id),
          eq(messageTemplates.organizationId, ctx.organizationId)
        ),
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      return template;
    }),

  /**
   * Create new template
   */
  createTemplate: orgProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name
      const existing = await db.query.messageTemplates.findFirst({
        where: and(
          eq(messageTemplates.organizationId, ctx.organizationId),
          eq(messageTemplates.name, input.name),
          eq(messageTemplates.channel, input.channel)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A template with this name already exists for this channel",
        });
      }

      const [template] = await db
        .insert(messageTemplates)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          whatsappStatus: input.channel === "whatsapp" ? "PENDING" : undefined,
          createdBy: ctx.user.id,
        })
        .returning();

      // TODO: If WhatsApp template, submit to Meta for approval

      return template;
    }),

  /**
   * Update template
   */
  updateTemplate: orgProcedure
    .input(createTemplateSchema.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await db.query.messageTemplates.findFirst({
        where: and(
          eq(messageTemplates.id, id),
          eq(messageTemplates.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // WhatsApp templates can't be edited once approved
      if (existing.channel === "whatsapp" && existing.whatsappStatus === "APPROVED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Approved WhatsApp templates cannot be edited. Create a new template instead.",
        });
      }

      const [template] = await db
        .update(messageTemplates)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(messageTemplates.id, id))
        .returning();

      return template;
    }),

  // ===========================================================================
  // WHATSAPP PHONE NUMBERS
  // ===========================================================================

  /**
   * List WhatsApp phone numbers
   */
  listPhoneNumbers: orgProcedure
    .query(async ({ ctx }) => {
      const items = await db
        .select()
        .from(whatsappPhoneNumbers)
        .where(eq(whatsappPhoneNumbers.organizationId, ctx.organizationId))
        .orderBy(desc(whatsappPhoneNumbers.isDefault), asc(whatsappPhoneNumbers.createdAt));

      return items;
    }),

  /**
   * Get phone number by ID
   */
  getPhoneNumber: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const phoneNumber = await db.query.whatsappPhoneNumbers.findFirst({
        where: and(
          eq(whatsappPhoneNumbers.id, input.id),
          eq(whatsappPhoneNumbers.organizationId, ctx.organizationId)
        ),
      });

      if (!phoneNumber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found",
        });
      }

      return phoneNumber;
    }),

  /**
   * Register WhatsApp phone number (admin only)
   */
  registerPhoneNumber: adminProcedure
    .input(z.object({
      phoneNumberId: z.string(),
      businessAccountId: z.string(),
      displayPhoneNumber: z.string(),
      verifiedName: z.string().optional(),
      subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(whatsappPhoneNumbers)
          .set({ isDefault: false })
          .where(eq(whatsappPhoneNumbers.organizationId, ctx.organizationId));
      }

      const [phoneNumber] = await db
        .insert(whatsappPhoneNumbers)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          webhookVerifyToken: crypto.randomUUID(),
        })
        .returning();

      return phoneNumber;
    }),

  // ===========================================================================
  // BROADCASTS
  // ===========================================================================

  /**
   * List broadcast campaigns
   */
  listBroadcasts: orgProcedure
    .input(z.object({
      status: z.enum(["draft", "scheduled", "sending", "completed", "cancelled", "failed"]).optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { status, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(messagingBroadcasts.organizationId, ctx.organizationId)];

      if (status) {
        conditions.push(eq(messagingBroadcasts.status, status));
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(messagingBroadcasts)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const items = await db.query.messagingBroadcasts.findMany({
        where: and(...conditions),
        orderBy: desc(messagingBroadcasts.createdAt),
        limit,
        offset,
        with: {
          template: true,
        },
      });

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get broadcast by ID
   */
  getBroadcast: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const broadcast = await db.query.messagingBroadcasts.findFirst({
        where: and(
          eq(messagingBroadcasts.id, input.id),
          eq(messagingBroadcasts.organizationId, ctx.organizationId)
        ),
        with: {
          template: true,
        },
      });

      if (!broadcast) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Broadcast not found",
        });
      }

      return broadcast;
    }),

  /**
   * Create broadcast campaign
   */
  createBroadcast: orgProcedure
    .input(z.object({
      name: z.string().max(255),
      description: z.string().optional(),
      channel: z.enum(["email", "whatsapp", "sms", "push", "in_app"]),
      subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
      templateId: z.string().uuid().optional(),
      recipientListId: z.string().uuid().optional(),
      recipientFilter: z.record(z.unknown()).optional(),
      content: z.string().optional(),
      mediaUrl: z.string().url().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate template exists if provided
      if (input.templateId) {
        const template = await db.query.messageTemplates.findFirst({
          where: and(
            eq(messageTemplates.id, input.templateId),
            eq(messageTemplates.organizationId, ctx.organizationId)
          ),
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        // WhatsApp broadcasts require approved templates
        if (input.channel === "whatsapp" && template.whatsappStatus !== "APPROVED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "WhatsApp broadcasts require an approved template",
          });
        }
      }

      const [broadcast] = await db
        .insert(messagingBroadcasts)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          status: "draft",
          createdBy: ctx.user.id,
        })
        .returning();

      return broadcast;
    }),

  /**
   * Schedule/send broadcast
   */
  sendBroadcast: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const broadcast = await db.query.messagingBroadcasts.findFirst({
        where: and(
          eq(messagingBroadcasts.id, input.id),
          eq(messagingBroadcasts.organizationId, ctx.organizationId)
        ),
      });

      if (!broadcast) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Broadcast not found",
        });
      }

      if (broadcast.status !== "draft") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot send broadcast in ${broadcast.status} status`,
        });
      }

      const [updated] = await db
        .update(messagingBroadcasts)
        .set({
          status: input.scheduledAt ? "scheduled" : "sending",
          scheduledAt: input.scheduledAt,
          startedAt: input.scheduledAt ? undefined : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messagingBroadcasts.id, input.id))
        .returning();

      // TODO: Queue broadcast for processing

      return updated;
    }),

  // ===========================================================================
  // WEBHOOK LOGS (Admin only)
  // ===========================================================================

  /**
   * List webhook logs for debugging
   */
  listWebhookLogs: adminProcedure
    .input(z.object({
      channel: z.enum(["email", "whatsapp", "sms", "push", "in_app"]).optional(),
      processed: z.boolean().optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { channel, processed, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 50;
      const offset = (page - 1) * limit;

      const conditions = [eq(messagingWebhookLogs.organizationId, ctx.organizationId)];

      if (channel) {
        conditions.push(eq(messagingWebhookLogs.channel, channel));
      }

      if (processed !== undefined) {
        conditions.push(eq(messagingWebhookLogs.processed, processed));
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(messagingWebhookLogs)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const items = await db
        .select()
        .from(messagingWebhookLogs)
        .where(and(...conditions))
        .orderBy(desc(messagingWebhookLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get messaging statistics
   */
  stats: orgProcedure.query(async ({ ctx }) => {
    // Conversation stats
    const [conversationStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${conversations.status} = 'active')`,
        unread: sql<number>`count(*) filter (where ${conversations.unreadCount} > 0)`,
        windowOpen: sql<number>`count(*) filter (where ${conversations.customerWindowOpen} = true)`,
      })
      .from(conversations)
      .where(eq(conversations.organizationId, ctx.organizationId));

    // Message stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [messageStats] = await db
      .select({
        total: count(),
        sent: sql<number>`count(*) filter (where ${messages.direction} = 'outbound')`,
        received: sql<number>`count(*) filter (where ${messages.direction} = 'inbound')`,
        delivered: sql<number>`count(*) filter (where ${messages.status} = 'delivered')`,
        read: sql<number>`count(*) filter (where ${messages.status} = 'read')`,
        failed: sql<number>`count(*) filter (where ${messages.status} = 'failed')`,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(conversations.organizationId, ctx.organizationId),
        sql`${messages.createdAt} > ${thirtyDaysAgo}`
      ));

    // By channel
    const byChannel = await db
      .select({
        channel: conversations.channel,
        count: count(),
      })
      .from(conversations)
      .where(eq(conversations.organizationId, ctx.organizationId))
      .groupBy(conversations.channel);

    return {
      conversations: conversationStats,
      messages: messageStats,
      byChannel: Object.fromEntries(byChannel.map((r) => [r.channel, r.count])),
    };
  }),
});
