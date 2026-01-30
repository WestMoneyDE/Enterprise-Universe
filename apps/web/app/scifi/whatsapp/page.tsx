"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";
import {
  HoloCard,
  NeonButton,
  StatsGrid,
  MetricRing,
  DataBar,
  ActivityIndicator,
  StatItem,
  LiveCounter,
} from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP CONSOLE - Messaging & Consent Management
// Real-time tRPC integration with HubSpot-compliant WhatsApp Business API
// ═══════════════════════════════════════════════════════════════════════════════

// Consent keywords (HubSpot compliant)
const OPT_IN_KEYWORDS = ["START", "SUBSCRIBE", "UNSTOP"];
const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE"];

type ConsentStatus = "opted_in" | "opted_out" | "pending" | "never_asked";

// Map conversation status to consent status for display
function mapToConsentStatus(customerWindowOpen: boolean, botActive: boolean): ConsentStatus {
  if (customerWindowOpen) return "opted_in";
  if (botActive) return "pending";
  return "never_asked";
}

export default function WhatsAppConsolePage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterConsent, setFilterConsent] = useState<ConsentStatus | "all">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // tRPC QUERIES
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch conversations list
  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = api.messaging.listConversations.useQuery({
    filters: {
      channel: "whatsapp",
      search: searchQuery || undefined,
      customerWindowOpen: filterConsent === "opted_in" ? true : filterConsent === "pending" ? false : undefined,
    },
    pagination: { limit: 50 },
  });

  // Fetch selected conversation with messages
  const {
    data: selectedConversation,
    isLoading: conversationLoading,
  } = api.messaging.getConversation.useQuery(
    { id: selectedConversationId ?? "", includeMessages: true, messageLimit: 100 },
    { enabled: !!selectedConversationId }
  );

  // Fetch messaging stats
  const { data: stats } = api.messaging.stats.useQuery();

  // Send message mutation
  const sendMessageMutation = api.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      refetchConversations();
    },
  });

  // Mark as read mutation
  const markAsReadMutation = api.messaging.markAsRead.useMutation();

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId && (selectedConversation?.unreadCount ?? 0) > 0) {
      markAsReadMutation.mutate({ id: selectedConversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, selectedConversation?.unreadCount]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      messageType: "text",
      content: messageInput,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────────

  const conversations = conversationsData?.items ?? [];
  const totalConversations = conversationsData?.total ?? 0;

  // Filter conversations by consent status
  const filteredConversations = conversations.filter((conv) => {
    if (filterConsent === "all") return true;
    const consentStatus = mapToConsentStatus(conv.customerWindowOpen ?? false, conv.botActive ?? false);
    return consentStatus === filterConsent;
  });

  // Build stats for StatsGrid
  const dashboardStats: StatItem[] = [
    {
      id: "total",
      label: "Total Conversations",
      value: String(stats?.conversations?.total ?? 0),
      trend: "up",
      trendValue: `+${stats?.conversations?.active ?? 0}`,
      status: "online",
    },
    {
      id: "unread",
      label: "Unread Messages",
      value: String(stats?.conversations?.unread ?? 0),
      trend: (stats?.conversations?.unread ?? 0) > 0 ? "up" : "neutral",
      trendValue: (stats?.conversations?.unread ?? 0) > 0 ? "Active" : "Clear",
      status: (stats?.conversations?.unread ?? 0) > 0 ? "warning" : "online",
    },
    {
      id: "window-open",
      label: "24h Window Open",
      value: String(stats?.conversations?.windowOpen ?? 0),
      trend: "up",
      trendValue: "Active",
      status: "online",
    },
    {
      id: "messages",
      label: "Messages (30d)",
      value: String(stats?.messages?.total ?? 0),
      trend: "up",
      trendValue: `${stats?.messages?.delivered ?? 0} delivered`,
      status: "online",
    },
  ];

  const getConsentBadge = (consent: ConsentStatus) => {
    const styles = {
      opted_in: "bg-neon-green/20 text-neon-green border-neon-green/30",
      opted_out: "bg-neon-red/20 text-neon-red border-neon-red/30",
      pending: "bg-neon-orange/20 text-neon-orange border-neon-orange/30",
      never_asked: "bg-white/10 text-white/50 border-white/20",
    };

    const labels = {
      opted_in: "WINDOW OPEN",
      opted_out: "OPTED OUT",
      pending: "PENDING",
      never_asked: "NEW",
    };

    return (
      <span className={cn("px-2 py-0.5 text-[10px] font-mono rounded border", styles[consent])}>
        {labels[consent]}
      </span>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-neon-green">◉</span>
            WHATSAPP CONSOLE
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            HubSpot-Compliant Messaging • Meta Graph API v18.0 • Real-time Sync
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NeonButton variant="green" size="sm">
            New Broadcast
          </NeonButton>
          <NeonButton variant="cyan" size="sm" glow onClick={() => refetchConversations()}>
            Refresh
          </NeonButton>
        </div>
      </div>

      {/* Stats */}
      <StatsGrid stats={dashboardStats} columns={4} variant="cyan" />

      {/* Main Console Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Contact List */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Search & Filter */}
          <HoloCard variant="cyan">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 rounded-lg",
                    "bg-void-dark/50 border border-neon-cyan/20",
                    "text-white font-mono text-sm",
                    "placeholder:text-white/30",
                    "focus:outline-none focus:border-neon-cyan/50"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">⌘K</span>
              </div>

              {/* Consent Filter */}
              <div className="flex gap-2">
                {(["all", "opted_in", "pending", "never_asked"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterConsent(filter)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-colors",
                      filterConsent === filter
                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
                        : "bg-void-surface/50 text-white/50 border border-white/10 hover:border-white/20"
                    )}
                  >
                    {filter === "all" ? "All" : filter === "opted_in" ? "Active" : filter.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </HoloCard>

          {/* Contact List */}
          <HoloCard
            title="CONVERSATIONS"
            subtitle={`${filteredConversations.length} of ${totalConversations}`}
            className="max-h-[600px] overflow-hidden"
          >
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-white/30 font-mono text-sm">
                    No conversations found
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const consentStatus = mapToConsentStatus(
                      conv.customerWindowOpen ?? false,
                      conv.botActive ?? false
                    );
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-all duration-200",
                          "border hover:border-neon-cyan/30",
                          selectedConversationId === conv.id
                            ? "bg-neon-cyan/10 border-neon-cyan/50"
                            : "bg-void-surface/30 border-white/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-neon-purple font-display">
                              {(conv.participantName ?? conv.externalIdentifier)?.[0]?.toUpperCase() ?? "?"}
                            </span>
                            {(conv.unreadCount ?? 0) > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-red text-[10px] font-bold flex items-center justify-center rounded-full text-white">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-sm text-white truncate">
                                {conv.participantName ?? conv.externalIdentifier}
                              </span>
                              {getConsentBadge(consentStatus)}
                            </div>
                            <div className="text-[10px] text-white/40 font-mono">
                              {conv.externalIdentifier}
                            </div>
                            {conv.lastMessagePreview && (
                              <div className="text-xs text-white/50 truncate mt-1">
                                {conv.lastMessagePreview}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {conv.labels?.map((label) => (
                                <span
                                  key={label}
                                  className="px-1.5 py-0.5 text-[8px] font-mono bg-white/5 text-white/40 rounded"
                                >
                                  {label}
                                </span>
                              ))}
                              {conv.botActive && (
                                <span className="px-1.5 py-0.5 text-[8px] font-mono bg-neon-cyan/20 text-neon-cyan rounded">
                                  BOT ACTIVE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </HoloCard>
        </div>

        {/* Chat Window */}
        <div className="col-span-12 lg:col-span-5">
          <HoloCard
            variant={selectedConversationId ? "cyan" : "default"}
            className="h-[700px] flex flex-col"
          >
            {selectedConversationId && selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                      <span className="text-neon-purple font-display">
                        {(selectedConversation.participantName ?? selectedConversation.externalIdentifier)?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div>
                      <div className="font-display text-white">
                        {selectedConversation.participantName ?? selectedConversation.externalIdentifier}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono">
                        {selectedConversation.externalIdentifier}
                        {selectedConversation.contact?.hubspotContactId && (
                          <span className="ml-2 text-neon-orange">
                            • HS-{selectedConversation.contact.hubspotContactId.slice(-6)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getConsentBadge(
                      mapToConsentStatus(
                        selectedConversation.customerWindowOpen ?? false,
                        selectedConversation.botActive ?? false
                      )
                    )}
                    <button className="p-2 text-white/50 hover:text-white transition-colors">
                      <span>⋮</span>
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20">
                  {conversationLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      <SystemMessage
                        content={`Conversation started with ${selectedConversation.participantName ?? selectedConversation.externalIdentifier}`}
                      />

                      {!selectedConversation.customerWindowOpen && (
                        <SystemMessage
                          content="⚠️ 24h customer window closed. Use template messages only."
                          variant="warning"
                        />
                      )}

                      {/* Render messages in chronological order */}
                      {[...(selectedConversation.messages ?? [])].reverse().map((msg) => (
                        <ChatBubble
                          key={msg.id}
                          type={msg.direction === "inbound" ? "inbound" : "outbound"}
                          content={msg.content ?? ""}
                          timestamp={new Date(msg.createdAt)}
                          status={msg.status as "sent" | "delivered" | "read" | "failed"}
                          senderType={msg.senderType}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-white/10">
                  {!selectedConversation.customerWindowOpen ? (
                    <div className="p-3 rounded-lg bg-neon-orange/10 border border-neon-orange/30 text-center">
                      <span className="text-sm text-neon-orange font-mono">
                        24h window closed. Template messages only.
                      </span>
                      <NeonButton variant="gold" size="sm" className="mt-2">
                        Send Template
                      </NeonButton>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={sendMessageMutation.isPending}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-lg",
                          "bg-void-dark/50 border border-neon-cyan/20",
                          "text-white font-mono text-sm",
                          "placeholder:text-white/30",
                          "focus:outline-none focus:border-neon-cyan/50",
                          "disabled:opacity-50"
                        )}
                      />
                      <NeonButton
                        variant="green"
                        size="md"
                        onClick={handleSendMessage}
                        loading={sendMessageMutation.isPending}
                        disabled={!messageInput.trim()}
                      >
                        Send
                      </NeonButton>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl text-white/20">◉</span>
                  <p className="mt-4 text-white/30 font-mono text-sm">
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </HoloCard>
        </div>

        {/* Right Panel - Consent Management */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Consent Keywords Info */}
          <HoloCard title="CONSENT KEYWORDS" subtitle="HubSpot Compliant" icon="◎" variant="gold">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-mono text-white/40 uppercase mb-2">Opt-In Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {OPT_IN_KEYWORDS.map((kw) => (
                    <span key={kw} className="px-2 py-1 text-xs font-mono bg-neon-green/20 text-neon-green rounded border border-neon-green/30">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-white/40 uppercase mb-2">Opt-Out Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {OPT_OUT_KEYWORDS.map((kw) => (
                    <span key={kw} className="px-2 py-1 text-xs font-mono bg-neon-red/20 text-neon-red rounded border border-neon-red/30">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </HoloCard>

          {/* Consent Statistics */}
          <HoloCard title="MESSAGING METRICS" icon="◇" variant="purple">
            <div className="space-y-4 py-2">
              <MetricRing
                value={
                  stats?.messages?.total
                    ? Math.round((stats.messages.delivered / stats.messages.total) * 100)
                    : 0
                }
                label="Delivery Rate"
                color="green"
                size="lg"
              />
              <div className="space-y-3 mt-4">
                <DataBar
                  label="Sent"
                  value={stats?.messages?.sent ?? 0}
                  max={stats?.messages?.total ?? 1}
                  color="cyan"
                />
                <DataBar
                  label="Delivered"
                  value={stats?.messages?.delivered ?? 0}
                  max={stats?.messages?.total ?? 1}
                  color="green"
                />
                <DataBar
                  label="Read"
                  value={stats?.messages?.read ?? 0}
                  max={stats?.messages?.total ?? 1}
                  color="purple"
                />
                <DataBar
                  label="Failed"
                  value={stats?.messages?.failed ?? 0}
                  max={stats?.messages?.total ?? 1}
                  color="red"
                />
              </div>
            </div>
          </HoloCard>

          {/* Quick Actions */}
          <HoloCard title="QUICK ACTIONS" icon="⚡">
            <div className="space-y-2">
              <NeonButton variant="cyan" size="sm" className="w-full">
                Request Consent
              </NeonButton>
              <NeonButton variant="purple" size="sm" className="w-full">
                View Templates
              </NeonButton>
              <NeonButton variant="gold" size="sm" className="w-full">
                Export Contacts
              </NeonButton>
              <NeonButton variant="outline" size="sm" className="w-full">
                Audit Log
              </NeonButton>
            </div>
          </HoloCard>

          {/* API Status */}
          <HoloCard title="API STATUS" icon="◐">
            <div className="space-y-3">
              <ActivityIndicator status="active" label="WhatsApp Business API" />
              <ActivityIndicator status="active" label="Meta Graph v18.0" />
              <ActivityIndicator
                status={stats ? "active" : "idle"}
                label="tRPC Connection"
              />
              <ActivityIndicator status="active" label="Webhook Handler" />
            </div>
          </HoloCard>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatBubbleProps {
  type: "inbound" | "outbound";
  content: string;
  timestamp: Date;
  status?: "sent" | "delivered" | "read" | "failed" | "pending";
  senderType?: string | null;
}

function ChatBubble({ type, content, timestamp, status, senderType }: ChatBubbleProps) {
  return (
    <div className={cn("flex", type === "outbound" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] p-3 rounded-lg",
          type === "outbound"
            ? senderType === "bot"
              ? "bg-neon-purple/20 border border-neon-purple/30 text-white"
              : "bg-neon-cyan/20 border border-neon-cyan/30 text-white"
            : "bg-void-surface/50 border border-white/10 text-white/90"
        )}
      >
        {senderType === "bot" && type === "outbound" && (
          <div className="text-[10px] text-neon-purple font-mono mb-1">🤖 MAX AI</div>
        )}
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        <div className="flex items-center justify-end gap-2 mt-1">
          <span className="text-[10px] text-white/30 font-mono">
            {timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {status && type === "outbound" && (
            <span className={cn(
              "text-[10px]",
              status === "read" ? "text-neon-cyan" :
              status === "delivered" ? "text-white/50" :
              status === "failed" ? "text-neon-red" :
              status === "pending" ? "text-neon-orange" : "text-white/30"
            )}>
              {status === "read" ? "✓✓" :
               status === "delivered" ? "✓✓" :
               status === "sent" ? "✓" :
               status === "pending" ? "⏳" : "✗"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface SystemMessageProps {
  content: string;
  variant?: "info" | "warning" | "error";
}

function SystemMessage({ content, variant = "info" }: SystemMessageProps) {
  const styles = {
    info: "text-neon-cyan/70 border-neon-cyan/20",
    warning: "text-neon-orange/70 border-neon-orange/20",
    error: "text-neon-red/70 border-neon-red/20",
  };

  return (
    <div className="flex justify-center">
      <span className={cn(
        "px-3 py-1 text-[10px] font-mono rounded-full border",
        styles[variant]
      )}>
        {content}
      </span>
    </div>
  );
}
