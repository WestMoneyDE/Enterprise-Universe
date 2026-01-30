"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Bot, User, Sparkles, RefreshCw, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// =============================================================================
// AI CHAT COMPONENT - Interactive conversation interface
// =============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
}

export interface AIChatProps {
  /** System prompt to guide the AI behavior */
  systemPrompt?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Initial messages to display */
  initialMessages?: ChatMessage[];
  /** Callback when a message is sent */
  onSendMessage?: (message: string) => Promise<string>;
  /** Custom className */
  className?: string;
  /** Show typing indicator while waiting */
  showTypingIndicator?: boolean;
  /** Maximum message length */
  maxLength?: number;
  /** Theme variant */
  variant?: "default" | "scifi" | "minimal";
  /** Enable quick action suggestions */
  suggestions?: string[];
}

export function AIChat({
  systemPrompt,
  placeholder = "Type your message...",
  initialMessages = [],
  onSendMessage,
  className,
  showTypingIndicator = true,
  maxLength = 2000,
  variant = "default",
  suggestions = [],
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // If custom handler provided, use it
      if (onSendMessage) {
        const response = await onSendMessage(userMessage.content);
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Default mock response for demo
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const mockResponse: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I received your message: "${userMessage.content}". This is a demo response. Connect the AI backend to enable real conversations.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, mockResponse]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSuggestion = useCallback((suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Theme-specific styles
  const themeStyles = useMemo(() => {
    switch (variant) {
      case "scifi":
        return {
          container: "bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30",
          header: "bg-cyan-950/50 border-b border-cyan-500/30",
          headerText: "text-cyan-400",
          messageArea: "bg-transparent",
          userBubble: "bg-cyan-600/30 border border-cyan-500/50 text-cyan-100",
          assistantBubble: "bg-purple-900/30 border border-purple-500/30 text-purple-100",
          inputArea: "bg-gray-900/80 border-t border-cyan-500/30",
          input: "bg-gray-800/50 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-600",
          sendButton: "bg-cyan-600 hover:bg-cyan-500 text-black",
        };
      case "minimal":
        return {
          container: "bg-white border border-gray-200 shadow-sm",
          header: "bg-gray-50 border-b border-gray-200",
          headerText: "text-gray-700",
          messageArea: "bg-white",
          userBubble: "bg-blue-500 text-white",
          assistantBubble: "bg-gray-100 text-gray-800",
          inputArea: "bg-white border-t border-gray-200",
          input: "bg-gray-50 border-gray-200",
          sendButton: "bg-blue-500 hover:bg-blue-600 text-white",
        };
      default:
        return {
          container: "bg-gray-900 border border-gray-700",
          header: "bg-gray-800 border-b border-gray-700",
          headerText: "text-white",
          messageArea: "bg-gray-900",
          userBubble: "bg-blue-600 text-white",
          assistantBubble: "bg-gray-800 text-gray-100",
          inputArea: "bg-gray-800 border-t border-gray-700",
          input: "bg-gray-700 border-gray-600",
          sendButton: "bg-blue-600 hover:bg-blue-500 text-white",
        };
    }
  }, [variant]);

  return (
    <div className={cn("flex flex-col h-[600px] rounded-lg overflow-hidden", themeStyles.container, className)}>
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 py-3", themeStyles.header)}>
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", variant === "scifi" ? "bg-cyan-500/20" : "bg-blue-500/20")}>
            <Sparkles className={cn("h-4 w-4", variant === "scifi" ? "text-cyan-400" : "text-blue-400")} />
          </div>
          <span className={cn("font-semibold text-sm", themeStyles.headerText)}>
            {variant === "scifi" ? "NEXUS AI" : "AI Assistant"}
          </span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-gray-400 hover:text-white">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", themeStyles.messageArea)}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className={cn("h-12 w-12 mb-4", variant === "scifi" ? "text-cyan-500/50" : "text-gray-500")} />
            <p className={cn("text-sm", variant === "scifi" ? "text-cyan-500/70" : "text-gray-500")}>
              {variant === "scifi" ? "NEXUS AI ready for your command" : "Start a conversation"}
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 max-w-md">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(suggestion)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full transition-colors",
                      variant === "scifi"
                        ? "bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                message.role === "user"
                  ? variant === "scifi"
                    ? "bg-cyan-600/30"
                    : "bg-blue-600"
                  : variant === "scifi"
                  ? "bg-purple-600/30"
                  : "bg-gray-700"
              )}
            >
              {message.role === "user" ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Bot className={cn("h-4 w-4", variant === "scifi" ? "text-purple-400" : "text-white")} />
              )}
            </div>
            <div
              className={cn(
                "relative max-w-[75%] px-4 py-2.5 rounded-2xl text-sm",
                message.role === "user" ? themeStyles.userBubble : themeStyles.assistantBubble,
                message.error && "border-red-500/50"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs opacity-50">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {message.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(message.id, message.content)}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
              {message.error && (
                <p className="text-xs text-red-400 mt-1">Error: {message.error}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && showTypingIndicator && (
          <div className="flex gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                variant === "scifi" ? "bg-purple-600/30" : "bg-gray-700"
              )}
            >
              <Bot className={cn("h-4 w-4", variant === "scifi" ? "text-purple-400" : "text-white")} />
            </div>
            <div className={cn("px-4 py-3 rounded-2xl", themeStyles.assistantBubble)}>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={cn("p-4", themeStyles.inputArea)}>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn("flex-1", themeStyles.input)}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn("px-4", themeStyles.sendButton)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {input.length > maxLength * 0.8 && (
          <p className="text-xs text-gray-500 mt-1">
            {input.length}/{maxLength} characters
          </p>
        )}
      </div>
    </div>
  );
}
