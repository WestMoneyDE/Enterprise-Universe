// =============================================================================
// COMMENTS ROUTER - Comments and notes system for entities
// =============================================================================

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// =============================================================================
// TYPES
// =============================================================================

export type EntityType = "contact" | "deal" | "project";

export interface Comment {
  id: string;
  entityType: EntityType;
  entityId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatarUrl?: string | null;
  parentId: string | null;
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
}

// =============================================================================
// IN-MEMORY STORAGE
// =============================================================================

// Store comments in memory (keyed by entityType-entityId)
const commentsStore = new Map<string, Comment[]>();

// Helper to generate storage key
function getStorageKey(entityType: EntityType, entityId: string): string {
  return `${entityType}-${entityId}`;
}

// Helper to generate comment ID
function generateCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to extract @mentions from content
function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\.\w+)?)/g;
  const matches = content.matchAll(mentionRegex);
  return Array.from(matches, (m) => m[1] || "").filter(Boolean);
}

// Helper to get all comments for an entity (flat list)
function getCommentsForEntity(
  entityType: EntityType,
  entityId: string
): Comment[] {
  const key = getStorageKey(entityType, entityId);
  return commentsStore.get(key) || [];
}

// Helper to organize comments into threads
function organizeIntoThreads(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create a map of all comments with empty replies arrays
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: organize into parent-child relationships
  comments.forEach((comment) => {
    const mappedComment = commentMap.get(comment.id);
    if (!mappedComment) return;

    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(mappedComment);
      } else {
        // Orphan comment (parent deleted) - treat as root
        rootComments.push(mappedComment);
      }
    } else {
      rootComments.push(mappedComment);
    }
  });

  // Sort root comments by date (newest first)
  rootComments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Sort replies by date (oldest first for natural conversation flow)
  const sortReplies = (comment: Comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      comment.replies.forEach(sortReplies);
    }
  };
  rootComments.forEach(sortReplies);

  return rootComments;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const EntityTypeEnum = z.enum(["contact", "deal", "project"]);

const CommentSchema = z.object({
  id: z.string(),
  entityType: EntityTypeEnum,
  entityId: z.string(),
  content: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorEmail: z.string().optional(),
  authorAvatarUrl: z.string().nullable().optional(),
  parentId: z.string().nullable(),
  mentions: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// =============================================================================
// MOCK USERS (for @mention autocomplete)
// =============================================================================

export const mockUsers = [
  {
    id: "user-1",
    name: "Max Mustermann",
    email: "max@nexus-command.center",
    avatar: null,
  },
  {
    id: "user-2",
    name: "Anna Schmidt",
    email: "anna@nexus-command.center",
    avatar: null,
  },
  {
    id: "user-3",
    name: "Thomas Weber",
    email: "thomas@nexus-command.center",
    avatar: null,
  },
  {
    id: "user-4",
    name: "Julia Fischer",
    email: "julia@nexus-command.center",
    avatar: null,
  },
  {
    id: "user-5",
    name: "Michael Braun",
    email: "michael@nexus-command.center",
    avatar: null,
  },
  {
    id: "user-6",
    name: "Sarah Mueller",
    email: "sarah@nexus-command.center",
    avatar: null,
  },
  {
    id: "user-7",
    name: "David Klein",
    email: "david@nexus-command.center",
    avatar: null,
  },
  {
    id: "user-8",
    name: "Lisa Hoffmann",
    email: "lisa@nexus-command.center",
    avatar: null,
  },
];

// =============================================================================
// ROUTER
// =============================================================================

export const commentsRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // LIST COMMENTS (query)
  // Get all comments for a specific entity, organized into threads
  // ═══════════════════════════════════════════════════════════════════════════
  list: publicProcedure
    .input(
      z.object({
        entityType: EntityTypeEnum,
        entityId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const comments = getCommentsForEntity(input.entityType, input.entityId);
      const threaded = organizeIntoThreads(comments);

      return {
        items: threaded,
        total: comments.length,
        entityType: input.entityType,
        entityId: input.entityId,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD COMMENT (mutation)
  // Add a new comment or reply to an entity
  // ═══════════════════════════════════════════════════════════════════════════
  add: publicProcedure
    .input(
      z.object({
        entityType: EntityTypeEnum,
        entityId: z.string().min(1),
        content: z.string().min(1).max(10000),
        parentId: z.string().nullable().optional(),
        // Author info (would come from session in real app)
        authorId: z.string().optional(),
        authorName: z.string().optional(),
        authorEmail: z.string().optional(),
        authorAvatarUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const key = getStorageKey(input.entityType, input.entityId);
      const comments = commentsStore.get(key) || [];

      // Validate parent exists if parentId provided
      if (input.parentId) {
        const parentExists = comments.some((c) => c.id === input.parentId);
        if (!parentExists) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found",
          });
        }
      }

      // Extract mentions
      const mentions = extractMentions(input.content);

      // Create new comment
      const newComment: Comment = {
        id: generateCommentId(),
        entityType: input.entityType,
        entityId: input.entityId,
        content: input.content,
        authorId: input.authorId || ctx.user?.id || "anonymous",
        authorName:
          input.authorName ||
          (ctx.user
            ? [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") ||
              ctx.user.email
            : "Anonymous User"),
        authorEmail: input.authorEmail || ctx.user?.email,
        authorAvatarUrl: input.authorAvatarUrl ?? null,
        parentId: input.parentId || null,
        mentions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to store
      comments.push(newComment);
      commentsStore.set(key, comments);

      return {
        success: true,
        comment: newComment,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE COMMENT (mutation)
  // Edit an existing comment (only author can edit)
  // ═══════════════════════════════════════════════════════════════════════════
  update: publicProcedure
    .input(
      z.object({
        entityType: EntityTypeEnum,
        entityId: z.string().min(1),
        commentId: z.string().min(1),
        content: z.string().min(1).max(10000),
        // Author ID for validation (would come from session in real app)
        authorId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const key = getStorageKey(input.entityType, input.entityId);
      const comments = commentsStore.get(key) || [];

      const commentIndex = comments.findIndex((c) => c.id === input.commentId);
      if (commentIndex === -1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      const comment = comments[commentIndex];

      // Check ownership (in real app, check against session user)
      const requesterId = input.authorId || ctx.user?.id || "anonymous";
      if (comment && comment.authorId !== requesterId && requesterId !== "anonymous") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      // Update comment
      const updatedComment: Comment = {
        ...comment!,
        content: input.content,
        mentions: extractMentions(input.content),
        updatedAt: new Date(),
      };

      comments[commentIndex] = updatedComment;
      commentsStore.set(key, comments);

      return {
        success: true,
        comment: updatedComment,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE COMMENT (mutation)
  // Delete a comment (only author can delete)
  // ═══════════════════════════════════════════════════════════════════════════
  delete: publicProcedure
    .input(
      z.object({
        entityType: EntityTypeEnum,
        entityId: z.string().min(1),
        commentId: z.string().min(1),
        // Author ID for validation (would come from session in real app)
        authorId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const key = getStorageKey(input.entityType, input.entityId);
      const comments = commentsStore.get(key) || [];

      const commentIndex = comments.findIndex((c) => c.id === input.commentId);
      if (commentIndex === -1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      const comment = comments[commentIndex];

      // Check ownership (in real app, check against session user)
      const requesterId = input.authorId || ctx.user?.id || "anonymous";
      if (comment && comment.authorId !== requesterId && requesterId !== "anonymous") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      // Remove comment and all its replies
      const idsToDelete = new Set<string>();
      idsToDelete.add(input.commentId);

      // Find all nested replies recursively
      let foundMore = true;
      while (foundMore) {
        foundMore = false;
        comments.forEach((c) => {
          if (c.parentId && idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
            idsToDelete.add(c.id);
            foundMore = true;
          }
        });
      }

      const filteredComments = comments.filter((c) => !idsToDelete.has(c.id));
      commentsStore.set(key, filteredComments);

      return {
        success: true,
        deletedCount: idsToDelete.size,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH USERS (query)
  // Search users for @mention autocomplete
  // ═══════════════════════════════════════════════════════════════════════════
  searchUsers: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ input }) => {
      const query = input.query.toLowerCase();
      const results = mockUsers
        .filter(
          (user) =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        )
        .slice(0, input.limit);

      return {
        users: results,
        total: results.length,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET STATS (query)
  // Get comment statistics for an entity
  // ═══════════════════════════════════════════════════════════════════════════
  stats: publicProcedure
    .input(
      z.object({
        entityType: EntityTypeEnum,
        entityId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const comments = getCommentsForEntity(input.entityType, input.entityId);

      const rootComments = comments.filter((c) => !c.parentId);
      const replies = comments.filter((c) => c.parentId);
      const uniqueAuthors = new Set(comments.map((c) => c.authorId));
      const totalMentions = comments.reduce((acc, c) => acc + c.mentions.length, 0);

      return {
        totalComments: comments.length,
        rootComments: rootComments.length,
        replies: replies.length,
        uniqueAuthors: uniqueAuthors.size,
        totalMentions,
        lastActivity:
          comments.length > 0
            ? comments.reduce((latest, c) =>
                new Date(c.createdAt) > new Date(latest.createdAt) ? c : latest
              ).createdAt
            : null,
      };
    }),
});

export default commentsRouter;
