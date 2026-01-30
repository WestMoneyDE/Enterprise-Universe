"use client";

import * as React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, getInitials, stringToColor } from "@/lib/utils";
import {
  useComments,
  type Comment,
  type EntityType,
  type User,
  mockUsers,
} from "@/hooks/use-comments";
import {
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  Reply,
  MoreHorizontal,
  X,
  Check,
  AtSign,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  Clock,
  Loader2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface CommentsPanelProps {
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  currentUser?: User;
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  title?: string;
}

// =============================================================================
// AVATAR COMPONENT
// =============================================================================

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function Avatar({ name, avatarUrl, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };

  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "rounded-lg object-cover border border-white/10",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center font-bold text-white border border-white/10",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}

// =============================================================================
// MENTION AUTOCOMPLETE COMPONENT
// =============================================================================

interface MentionAutocompleteProps {
  query: string;
  users: User[];
  onSelect: (user: User) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

function MentionAutocomplete({
  query,
  users,
  onSelect,
  onClose,
  position,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset selection when users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [users]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (users.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % users.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (users[selectedIndex]) {
            onSelect(users[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [users, selectedIndex, onSelect, onClose]);

  if (users.length === 0) return null;

  return (
    <div
      ref={listRef}
      className={cn(
        "absolute z-50 w-64 max-h-48 overflow-y-auto",
        "bg-void-surface/95 backdrop-blur-xl rounded-lg",
        "border border-neon-cyan/30 shadow-2xl shadow-neon-cyan/10",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-1">
        <div className="px-2 py-1 text-[10px] font-mono text-white/40 uppercase tracking-wider">
          Benutzer erwahnen
        </div>
        {users.map((user, index) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left",
              "transition-colors",
              index === selectedIndex
                ? "bg-neon-cyan/20 text-white"
                : "text-white/70 hover:bg-white/5"
            )}
          >
            <Avatar name={user.name} avatarUrl={user.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user.name}</div>
              <div className="text-[10px] text-white/40 truncate">
                {user.email}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// COMMENT INPUT COMPONENT
// =============================================================================

interface CommentInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  initialValue?: string;
  isEdit?: boolean;
  autoFocus?: boolean;
  className?: string;
}

function CommentInput({
  onSubmit,
  onCancel,
  placeholder = "Kommentar schreiben...",
  initialValue = "",
  isEdit = false,
  autoFocus = false,
  className,
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [matchedUsers, setMatchedUsers] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Handle @ mention detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1] || "";
      setMentionQuery(query);

      // Filter users
      const filtered = mockUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
      );
      setMatchedUsers(filtered.slice(0, 5));

      // Calculate position (simplified)
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.height + 4,
          left: 0,
        });
      }

      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention selection
  const handleSelectMention = (user: User) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = content.substring(0, cursorPos);
    const textAfterCursor = content.substring(cursorPos);

    // Replace @query with @username
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(
        0,
        textBeforeCursor.length - mentionMatch[0].length
      );
      const newContent = `${beforeMention}@${user.name.replace(/\s+/g, ".")} ${textAfterCursor}`;
      setContent(newContent);
    }

    setShowMentions(false);
    textareaRef.current?.focus();
  };

  // Handle submit
  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      if (!isEdit) {
        setContent("");
      }
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) return; // Let mention handler take over

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative rounded-lg overflow-hidden",
          "bg-void/50 border border-white/10",
          "focus-within:border-neon-cyan/50 focus-within:shadow-lg focus-within:shadow-neon-cyan/10",
          "transition-all duration-200"
        )}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={1}
          className={cn(
            "w-full px-3 py-2 text-sm text-white/90",
            "bg-transparent resize-none",
            "placeholder:text-white/30",
            "focus:outline-none",
            "min-h-[40px] max-h-[200px]"
          )}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const cursorPos = textareaRef.current?.selectionStart || content.length;
                const newContent =
                  content.substring(0, cursorPos) + "@" + content.substring(cursorPos);
                setContent(newContent);
                textareaRef.current?.focus();
                // Trigger mention search
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart = cursorPos + 1;
                    textareaRef.current.selectionEnd = cursorPos + 1;
                    handleContentChange({
                      target: textareaRef.current,
                    } as React.ChangeEvent<HTMLTextAreaElement>);
                  }
                }, 0);
              }}
              className={cn(
                "p-1.5 rounded-md text-white/40 hover:text-neon-cyan hover:bg-neon-cyan/10",
                "transition-colors"
              )}
              title="@Erwahnung"
            >
              <AtSign className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {onCancel && (
              <button
                onClick={onCancel}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-mono",
                  "text-white/50 hover:text-white/70 hover:bg-white/5",
                  "transition-colors"
                )}
              >
                Abbrechen
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md",
                "text-xs font-mono font-bold uppercase tracking-wider",
                "transition-all duration-200",
                content.trim()
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30"
                  : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
              )}
            >
              {isEdit ? (
                <>
                  <Check className="w-3 h-3" />
                  Speichern
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Senden
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mention Autocomplete */}
      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          users={matchedUsers}
          onSelect={handleSelectMention}
          onClose={() => setShowMentions(false)}
          position={mentionPosition}
        />
      )}

      {/* Keyboard hint */}
      <div className="mt-1 text-[10px] font-mono text-white/20">
        Cmd/Ctrl + Enter zum Senden
      </div>
    </div>
  );
}

// =============================================================================
// COMMENT ITEM COMPONENT
// =============================================================================

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string) => void;
  depth?: number;
  isFirst?: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  depth = 0,
  isFirst = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const isOwner = comment.authorId === currentUserId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  // Highlight @mentions in content
  const renderContent = (content: string) => {
    const mentionRegex = /@([\w.]+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention
        return (
          <span
            key={index}
            className="px-1 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan font-medium"
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const handleEditSubmit = (content: string) => {
    onEdit(comment.id, content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Kommentar wirklich loschen?")) {
      onDelete(comment.id);
    }
  };

  const wasEdited =
    new Date(comment.updatedAt).getTime() >
    new Date(comment.createdAt).getTime() + 1000;

  return (
    <div className={cn("relative", isFirst && depth === 0 && "animate-[slideIn_0.3s_ease-out]")}>
      {/* Timeline connector */}
      {depth > 0 && (
        <div
          className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-neon-cyan/30 via-neon-cyan/10 to-transparent"
          style={{ left: `${depth * 24 - 9}px` }}
        />
      )}

      <div
        className={cn(
          "group relative flex gap-3 py-3 transition-all duration-200",
          "hover:bg-white/[0.02] rounded-lg px-2 -mx-2"
        )}
        style={{ marginLeft: `${depth * 24}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar
            name={comment.authorName}
            avatarUrl={comment.authorAvatarUrl}
            size="md"
          />
          {depth > 0 && (
            <div className="absolute -left-3 top-1/2 w-3 h-px bg-neon-cyan/20" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white/90">
              {comment.authorName}
            </span>
            {isOwner && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-neon-green/20 text-neon-green border border-neon-green/30">
                Du
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-mono text-white/30">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(comment.createdAt)}
            </span>
            {wasEdited && (
              <span className="text-[10px] font-mono text-white/20">(bearbeitet)</span>
            )}
          </div>

          {/* Body */}
          {isEditing ? (
            <div className="mt-2">
              <CommentInput
                initialValue={comment.content}
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                isEdit
                autoFocus
              />
            </div>
          ) : (
            <div className="mt-1 text-sm text-white/70 whitespace-pre-wrap break-words">
              {renderContent(comment.content)}
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div
              className={cn(
                "flex items-center gap-2 mt-2 transition-opacity duration-200",
                showActions ? "opacity-100" : "opacity-0"
              )}
            >
              <button
                onClick={() => onReply(comment.id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md",
                  "text-[10px] font-mono text-white/40 hover:text-neon-cyan hover:bg-neon-cyan/10",
                  "transition-colors"
                )}
              >
                <Reply className="w-3 h-3" />
                Antworten
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md",
                      "text-[10px] font-mono text-white/40 hover:text-white/70 hover:bg-white/5",
                      "transition-colors"
                    )}
                  >
                    <Edit2 className="w-3 h-3" />
                    Bearbeiten
                  </button>
                  <button
                    onClick={handleDelete}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md",
                      "text-[10px] font-mono text-white/40 hover:text-neon-red hover:bg-neon-red/10",
                      "transition-colors"
                    )}
                  >
                    <Trash2 className="w-3 h-3" />
                    Loschen
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {hasReplies && (
        <div className="mt-1">
          {/* Toggle replies */}
          <button
            onClick={() => setShowReplies(!showReplies)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md ml-8",
              "text-[10px] font-mono text-white/40 hover:text-neon-cyan",
              "transition-colors"
            )}
            style={{ marginLeft: `${(depth + 1) * 24}px` }}
          >
            {showReplies ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            {comment.replies!.length} Antwort{comment.replies!.length > 1 ? "en" : ""}
          </button>

          {/* Nested replies */}
          {showReplies && (
            <div>
              {comment.replies!.map((reply, index) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReply={onReply}
                  depth={depth + 1}
                  isFirst={index === 0}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMMENTS PANEL COMPONENT
// =============================================================================

export function CommentsPanel({
  entityType,
  entityId,
  entityName,
  currentUser,
  className,
  maxHeight = "500px",
  showHeader = true,
  title = "Kommentare",
}: CommentsPanelProps) {
  const {
    threadedComments,
    isLoading,
    error,
    addComment,
    editComment,
    deleteComment,
    totalComments,
    rootCommentsCount,
    repliesCount,
  } = useComments({
    entityType,
    entityId,
    currentUser,
  });

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showNewComment, setShowNewComment] = useState(false);

  // Handle adding a comment
  const handleAddComment = useCallback(
    (content: string) => {
      addComment(content, null);
      setShowNewComment(false);
    },
    [addComment]
  );

  // Handle adding a reply
  const handleAddReply = useCallback(
    (content: string) => {
      if (replyingTo) {
        addComment(content, replyingTo);
        setReplyingTo(null);
      }
    },
    [addComment, replyingTo]
  );

  // Handle edit
  const handleEdit = useCallback(
    (commentId: string, content: string) => {
      editComment(commentId, content);
    },
    [editComment]
  );

  // Handle delete
  const handleDelete = useCallback(
    (commentId: string) => {
      deleteComment(commentId);
    },
    [deleteComment]
  );

  // Handle reply button click
  const handleReplyClick = useCallback((parentId: string) => {
    setReplyingTo(parentId);
    setShowNewComment(false);
  }, []);

  const resolvedCurrentUser = currentUser || {
    id: "current-user",
    name: "Nexus User",
    email: "user@nexus-command.center",
    avatar: null,
  };

  return (
    <div
      className={cn(
        "bg-void-surface/80 backdrop-blur-xl rounded-xl",
        "border border-white/10 overflow-hidden",
        "shadow-2xl shadow-black/50",
        className
      )}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-void/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-neon-cyan" />
              {totalComments > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-cyan text-void text-[9px] font-bold flex items-center justify-center">
                  {totalComments > 99 ? "99+" : totalComments}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white/90 uppercase tracking-wider">
                {title}
              </h3>
              {entityName && (
                <p className="text-[10px] font-mono text-white/40">{entityName}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] font-mono text-white/30">
              <MessageCircle className="w-3 h-3" />
              {rootCommentsCount}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-white/30">
              <Reply className="w-3 h-3" />
              {repliesCount}
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-neon-red/10 border-b border-neon-red/30">
          <div className="flex items-center gap-2 text-xs text-neon-red">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* New comment input */}
      <div className="px-4 py-3 border-b border-white/5">
        {showNewComment ? (
          <CommentInput
            onSubmit={handleAddComment}
            onCancel={() => setShowNewComment(false)}
            autoFocus
            placeholder="Neuen Kommentar schreiben..."
          />
        ) : (
          <button
            onClick={() => {
              setShowNewComment(true);
              setReplyingTo(null);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
              "bg-void/50 border border-white/10",
              "text-white/40 hover:text-white/60 hover:border-neon-cyan/30",
              "transition-all duration-200"
            )}
          >
            <Avatar name={resolvedCurrentUser.name} size="sm" />
            <span className="text-sm">Kommentar schreiben...</span>
          </button>
        )}
      </div>

      {/* Comments list */}
      <div
        className="overflow-y-auto scrollbar-thin scrollbar-track-void scrollbar-thumb-white/10"
        style={{ maxHeight }}
      >
        {isLoading ? (
          // Loading state
          <div className="px-4 py-8 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
            <p className="mt-2 text-xs font-mono text-white/40">
              Kommentare werden geladen...
            </p>
          </div>
        ) : threadedComments.length === 0 ? (
          // Empty state
          <div className="px-4 py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-white/10" />
            <p className="text-sm font-medium text-white/40">Keine Kommentare</p>
            <p className="text-xs text-white/20 mt-1">
              Sei der Erste, der einen Kommentar hinterlasst
            </p>
          </div>
        ) : (
          // Comments
          <div className="px-4 py-2 divide-y divide-white/5">
            {threadedComments.map((comment, index) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  currentUserId={resolvedCurrentUser.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={handleReplyClick}
                  isFirst={index === 0}
                />

                {/* Reply input for this comment */}
                {replyingTo === comment.id && (
                  <div className="ml-11 mt-2 mb-4">
                    <CommentInput
                      onSubmit={handleAddReply}
                      onCancel={() => setReplyingTo(null)}
                      autoFocus
                      placeholder={`Antwort auf ${comment.authorName}...`}
                    />
                  </div>
                )}

                {/* Reply input for nested replies */}
                {comment.replies?.map((reply) =>
                  replyingTo === reply.id ? (
                    <div key={`reply-input-${reply.id}`} className="ml-[68px] mt-2 mb-4">
                      <CommentInput
                        onSubmit={handleAddReply}
                        onCancel={() => setReplyingTo(null)}
                        autoFocus
                        placeholder={`Antwort auf ${reply.authorName}...`}
                      />
                    </div>
                  ) : null
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5 bg-void/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
              Kommentar-System
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/20">
            @Erwahnungen aktiv
          </span>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :root {
          --neon-cyan: #00ffff;
          --neon-cyan-rgb: 0, 255, 255;
          --neon-green: #00ff88;
          --neon-green-rgb: 0, 255, 136;
          --neon-red: #ff4444;
          --neon-red-rgb: 255, 68, 68;
          --neon-purple: #aa66ff;
          --neon-purple-rgb: 170, 102, 255;
        }
      `}</style>
    </div>
  );
}

export default CommentsPanel;
