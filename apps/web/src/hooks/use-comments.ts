"use client";

import { useState, useEffect, useCallback } from "react";

// ===============================================================================
// COMMENTS HOOK
// Manages comments/notes with localStorage persistence per entity
// ===============================================================================

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
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

// ===============================================================================
// MOCK USERS (for @mention autocomplete)
// ===============================================================================

export const mockUsers: User[] = [
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

// ===============================================================================
// HELPER FUNCTIONS
// ===============================================================================

/**
 * Get localStorage key for an entity's comments
 */
function getStorageKey(entityType: EntityType, entityId: string): string {
  return `nexus-comments-${entityType}-${entityId}`;
}

/**
 * Generate a unique comment ID
 */
function generateCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract @mentions from comment content
 */
function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\.\w+)?)/g;
  const matches = content.matchAll(mentionRegex);
  return Array.from(matches, (m) => m[1] || "").filter(Boolean);
}

/**
 * Organize flat comments into threaded structure
 */
function organizeIntoThreads(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create a map with empty replies
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: organize into threads
  comments.forEach((comment) => {
    const mappedComment = commentMap.get(comment.id);
    if (!mappedComment) return;

    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(mappedComment);
      } else {
        // Orphan comment - treat as root
        rootComments.push(mappedComment);
      }
    } else {
      rootComments.push(mappedComment);
    }
  });

  // Sort root comments (newest first)
  rootComments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Sort replies (oldest first for natural conversation)
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

// ===============================================================================
// CURRENT USER (mock - in real app would come from auth)
// ===============================================================================

const defaultCurrentUser: User = {
  id: "current-user",
  name: "Nexus User",
  email: "user@nexus-command.center",
  avatar: null,
};

// ===============================================================================
// HOOK IMPLEMENTATION
// ===============================================================================

export interface UseCommentsOptions {
  entityType: EntityType;
  entityId: string;
  currentUser?: User;
}

export interface UseCommentsReturn {
  // State
  comments: Comment[];
  threadedComments: Comment[];
  isLoading: boolean;
  error: string | null;

  // Comment actions
  addComment: (
    content: string,
    parentId?: string | null
  ) => Comment | null;
  editComment: (commentId: string, content: string) => Comment | null;
  deleteComment: (commentId: string) => boolean;

  // User search for @mentions
  searchUsers: (query: string) => User[];

  // Stats
  totalComments: number;
  rootCommentsCount: number;
  repliesCount: number;

  // Utilities
  refresh: () => void;
  clearAll: () => void;
}

export function useComments({
  entityType,
  entityId,
  currentUser = defaultCurrentUser,
}: UseCommentsOptions): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageKey = getStorageKey(entityType, entityId);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD COMMENTS FROM LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const loadComments = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Comment[];
        setComments(parsed);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
      setError("Failed to load comments");
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  // Load on mount and when entity changes
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE COMMENTS TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const saveComments = useCallback(
    (newComments: Comment[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newComments));
      } catch (err) {
        console.error("Failed to save comments:", err);
        setError("Failed to save comments");
      }
    },
    [storageKey]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD COMMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const addComment = useCallback(
    (content: string, parentId?: string | null): Comment | null => {
      if (!content.trim()) {
        setError("Comment content cannot be empty");
        return null;
      }

      // Validate parent exists if provided
      if (parentId) {
        const parentExists = comments.some((c) => c.id === parentId);
        if (!parentExists) {
          setError("Parent comment not found");
          return null;
        }
      }

      const newComment: Comment = {
        id: generateCommentId(),
        entityType,
        entityId,
        content: content.trim(),
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorEmail: currentUser.email,
        authorAvatarUrl: currentUser.avatar,
        parentId: parentId || null,
        mentions: extractMentions(content),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newComments = [...comments, newComment];
      setComments(newComments);
      saveComments(newComments);
      setError(null);

      return newComment;
    },
    [comments, entityType, entityId, currentUser, saveComments]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT COMMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const editComment = useCallback(
    (commentId: string, content: string): Comment | null => {
      if (!content.trim()) {
        setError("Comment content cannot be empty");
        return null;
      }

      const commentIndex = comments.findIndex((c) => c.id === commentId);
      if (commentIndex === -1) {
        setError("Comment not found");
        return null;
      }

      const comment = comments[commentIndex];

      // Check ownership
      if (comment && comment.authorId !== currentUser.id) {
        setError("You can only edit your own comments");
        return null;
      }

      const updatedComment: Comment = {
        ...comment!,
        content: content.trim(),
        mentions: extractMentions(content),
        updatedAt: new Date().toISOString(),
      };

      const newComments = [...comments];
      newComments[commentIndex] = updatedComment;
      setComments(newComments);
      saveComments(newComments);
      setError(null);

      return updatedComment;
    },
    [comments, currentUser.id, saveComments]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE COMMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const deleteComment = useCallback(
    (commentId: string): boolean => {
      const comment = comments.find((c) => c.id === commentId);
      if (!comment) {
        setError("Comment not found");
        return false;
      }

      // Check ownership
      if (comment.authorId !== currentUser.id) {
        setError("You can only delete your own comments");
        return false;
      }

      // Delete comment and all its replies recursively
      const idsToDelete = new Set<string>();
      idsToDelete.add(commentId);

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

      const newComments = comments.filter((c) => !idsToDelete.has(c.id));
      setComments(newComments);
      saveComments(newComments);
      setError(null);

      return true;
    },
    [comments, currentUser.id, saveComments]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH USERS (for @mention autocomplete)
  // ═══════════════════════════════════════════════════════════════════════════
  const searchUsers = useCallback((query: string): User[] => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return mockUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ALL COMMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const clearAll = useCallback(() => {
    setComments([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.error("Failed to clear comments:", err);
    }
    setError(null);
  }, [storageKey]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════
  const threadedComments = organizeIntoThreads(comments);
  const rootCommentsCount = comments.filter((c) => !c.parentId).length;
  const repliesCount = comments.filter((c) => c.parentId).length;

  return {
    // State
    comments,
    threadedComments,
    isLoading,
    error,

    // Actions
    addComment,
    editComment,
    deleteComment,

    // User search
    searchUsers,

    // Stats
    totalComments: comments.length,
    rootCommentsCount,
    repliesCount,

    // Utilities
    refresh: loadComments,
    clearAll,
  };
}

export type { UseCommentsReturn as UseCommentsHook };
