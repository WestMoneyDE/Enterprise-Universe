"use client";

import { useState } from "react";
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
} from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// MAX AI AGENT - AI Assistant Control Center
// Monitor, configure, and manage the MAX AI agent for automated responses
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONALITY_TRAITS = [
  { id: "professional", name: "Professional", icon: "◈", description: "Formal business tone" },
  { id: "friendly", name: "Friendly", icon: "◉", description: "Warm and approachable" },
  { id: "formal", name: "Formal", icon: "◆", description: "Strict business language" },
] as const;

const LANGUAGES = [
  { id: "de", name: "Deutsch", flag: "🇩🇪" },
  { id: "en", name: "English", flag: "🇬🇧" },
] as const;

export default function AIAgentPage() {
  const [editingConfig, setEditingConfig] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // tRPC QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: stats, isLoading: statsLoading } = api.aiAgent.getStats.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  const { data: config, isLoading: configLoading, refetch: refetchConfig } = api.aiAgent.getConfig.useQuery();

  const { data: aiConversations, isLoading: conversationsLoading, refetch: refetchConversations } =
    api.aiAgent.getAiConversations.useQuery({
      limit: 20,
      onlyEscalated: false,
    });

  const { data: escalatedConversations } = api.aiAgent.getAiConversations.useQuery({
    limit: 10,
    onlyEscalated: true,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // tRPC MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const updateConfigMutation = api.aiAgent.updateConfig.useMutation({
    onSuccess: () => {
      refetchConfig();
      setEditingConfig(false);
    },
  });

  const toggleBotMutation = api.aiAgent.toggleBot.useMutation({
    onSuccess: () => {
      refetchConversations();
    },
  });

  const toggleAutomationMutation = api.aiAgent.toggleAutomation.useMutation({
    onSuccess: () => {
      refetchConversations();
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const agentStats: StatItem[] = [
    {
      id: "responses",
      label: "Total Responses",
      value: stats?.totalResponses?.toString() ?? "0",
      trend: "up",
      trendValue: "+12%",
      status: "online",
    },
    {
      id: "success",
      label: "Success Rate",
      value: `${((stats?.successRate ?? 0) * 100).toFixed(1)}%`,
      trend: (stats?.successRate ?? 0) > 0.9 ? "up" : "neutral",
      trendValue: (stats?.successRate ?? 0) > 0.9 ? "Excellent" : "Good",
      status: (stats?.successRate ?? 0) > 0.9 ? "online" : "warning",
    },
    {
      id: "escalation",
      label: "Escalation Rate",
      value: `${((stats?.escalationRate ?? 0) * 100).toFixed(1)}%`,
      trend: (stats?.escalationRate ?? 0) < 0.1 ? "up" : "neutral",
      trendValue: (stats?.escalationRate ?? 0) < 0.1 ? "Low" : "Moderate",
      status: (stats?.escalationRate ?? 0) < 0.1 ? "online" : "warning",
    },
    {
      id: "confidence",
      label: "Avg Confidence",
      value: `${((stats?.averageConfidence ?? 0) * 100).toFixed(0)}%`,
      trend: "neutral",
      trendValue: "Stable",
      status: "online",
    },
  ];

  // Calculate intent distribution for visualization
  const intentDistribution = stats?.intentDistribution ?? {};
  const totalIntents = Object.values(intentDistribution).reduce((a, b) => a + (b as number), 0);

  const intentBars = Object.entries(intentDistribution)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([intent, count], index) => ({
      label: formatIntent(intent),
      value: totalIntents > 0 ? Math.round(((count as number) / totalIntents) * 100) : 0,
      color: getIntentColor(index),
    }));

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (statsLoading || configLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-wider">
              MAX AI AGENT
            </h1>
            <p className="text-sm text-white/50 font-mono mt-1">
              Loading neural networks...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-void-surface/30 rounded-lg border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            MAX AI AGENT
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Status: <span className="text-neon-green">NEURAL CORE ACTIVE</span>
            <span className="ml-4">Agent: <span className="text-neon-cyan">{config?.agentName ?? "MAX"}</span></span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActivityIndicator
            status="active"
            label="AI Core"
          />
          <NeonButton
            variant="cyan"
            size="sm"
            onClick={() => setEditingConfig(!editingConfig)}
          >
            {editingConfig ? "Cancel" : "Configure"}
          </NeonButton>
          <NeonButton variant="purple" size="sm" glow>
            Train Agent
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={agentStats} columns={4} animated variant="cyan" />

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Configuration & Metrics */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Agent Configuration */}
          <HoloCard
            title="AGENT CONFIGURATION"
            subtitle={editingConfig ? "Edit Mode Active" : `${config?.agentName ?? "MAX"} v2.0`}
            icon="◎"
            variant={editingConfig ? "purple" : "cyan"}
            glow={editingConfig}
          >
            {editingConfig ? (
              <ConfigEditor
                config={config}
                onSave={(newConfig) => updateConfigMutation.mutate(newConfig)}
                onCancel={() => setEditingConfig(false)}
                isLoading={updateConfigMutation.isPending}
              />
            ) : (
              <div className="space-y-4">
                {/* Agent Identity */}
                <div className="flex items-center gap-4 p-3 bg-void-surface/30 rounded-lg border border-white/10">
                  <div className="w-12 h-12 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-lg text-white">{config?.agentName ?? "MAX"}</div>
                    <div className="text-xs text-white/50 font-mono">
                      {config?.companyName ?? "Enterprise Universe"} • {LANGUAGES.find(l => l.id === config?.language)?.name ?? "English"}
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-xs font-mono",
                    (config?.personalityTrait as string) === "professional" && "bg-neon-cyan/20 text-neon-cyan",
                    (config?.personalityTrait as string) === "friendly" && "bg-neon-green/20 text-neon-green",
                    (config?.personalityTrait as string) === "formal" && "bg-neon-purple/20 text-neon-purple"
                  )}>
                    {PERSONALITY_TRAITS.find(p => p.id === config?.personalityTrait)?.name ?? "Professional"}
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <div className="text-xs text-white/50 font-mono mb-2 uppercase">Capabilities</div>
                  <div className="flex flex-wrap gap-2">
                    {(config?.capabilities ?? []).map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-1 text-[10px] font-mono bg-neon-green/10 border border-neon-green/30 rounded text-neon-green"
                      >
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Escalation Keywords */}
                <div>
                  <div className="text-xs text-white/50 font-mono mb-2 uppercase">Escalation Triggers</div>
                  <div className="flex flex-wrap gap-2">
                    {(config?.escalationKeywords ?? []).slice(0, 5).map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 text-[10px] font-mono bg-neon-orange/10 border border-neon-orange/30 rounded text-neon-orange"
                      >
                        {keyword}
                      </span>
                    ))}
                    {(config?.escalationKeywords?.length ?? 0) > 5 && (
                      <span className="px-2 py-1 text-[10px] font-mono text-white/40">
                        +{(config?.escalationKeywords?.length ?? 0) - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </HoloCard>

          {/* Intent Distribution */}
          <HoloCard title="INTENT ANALYSIS" subtitle="Last 30 days" icon="◇">
            <div className="space-y-3">
              {intentBars.length > 0 ? (
                intentBars.map((bar) => (
                  <DataBar
                    key={bar.label}
                    label={bar.label}
                    value={bar.value}
                    color={bar.color as "cyan" | "purple" | "green" | "orange" | "red" | "gold"}
                  />
                ))
              ) : (
                <div className="py-4 text-center text-white/30 text-sm font-mono">
                  No intent data available
                </div>
              )}
            </div>
          </HoloCard>

          {/* Performance Metrics */}
          <HoloCard title="PERFORMANCE METRICS" icon="◈" variant="purple">
            <div className="grid grid-cols-2 gap-4">
              <MetricRing
                value={Math.round((stats?.successRate ?? 0) * 100)}
                label="Success"
                color="green"
                size="lg"
              />
              <MetricRing
                value={100 - Math.round((stats?.escalationRate ?? 0) * 100)}
                label="Resolved"
                color="cyan"
                size="lg"
              />
            </div>
          </HoloCard>
        </div>

        {/* Right Column - Conversations */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Escalated Conversations */}
          {(escalatedConversations?.conversations?.length ?? 0) > 0 && (
            <HoloCard
              title="⚠ ESCALATED CONVERSATIONS"
              subtitle={`${escalatedConversations?.conversations?.length ?? 0} require attention`}
              icon="◐"
              variant="gold"
              glow
            >
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {escalatedConversations?.conversations?.map((conv) => (
                  <ConversationCard
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversation === conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    onToggleBot={(active) => toggleBotMutation.mutate({ conversationId: conv.id, enabled: active })}
                    onTogglePause={(paused) => toggleAutomationMutation.mutate({ conversationId: conv.id, enabled: !paused })}
                    variant="escalated"
                  />
                ))}
              </div>
            </HoloCard>
          )}

          {/* Active Bot Conversations */}
          <HoloCard
            title="BOT-MANAGED CONVERSATIONS"
            subtitle={`${aiConversations?.conversations?.length ?? 0} active`}
            icon="◉"
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {conversationsLoading ? (
                <div className="py-8 text-center text-white/30 text-sm font-mono">
                  Loading conversations...
                </div>
              ) : aiConversations?.conversations && aiConversations.conversations.length > 0 ? (
                aiConversations.conversations.map((conv) => (
                  <ConversationCard
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversation === conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    onToggleBot={(active) => toggleBotMutation.mutate({ conversationId: conv.id, enabled: active })}
                    onTogglePause={(paused) => toggleAutomationMutation.mutate({ conversationId: conv.id, enabled: !paused })}
                    variant="normal"
                  />
                ))
              ) : (
                <div className="py-8 text-center text-white/30 text-sm font-mono">
                  No bot-managed conversations
                </div>
              )}
            </div>
          </HoloCard>

          {/* Response Templates Preview */}
          <HoloCard title="AI RESPONSE PREVIEW" subtitle="Test agent responses" icon="◆" variant="ultra">
            <ResponseTester />
          </HoloCard>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ConversationCardProps {
  conversation: {
    id: string;
    contact?: { name?: string | null; phone?: string | null } | null;
    lastMessageAt?: Date | null;
    unreadCount?: number | null;
    botActive?: boolean | null;
    automationPaused?: boolean | null;
    subsidiary?: string | null;
  };
  isSelected: boolean;
  onClick: () => void;
  onToggleBot: (active: boolean) => void;
  onTogglePause: (paused: boolean) => void;
  variant: "normal" | "escalated";
}

function ConversationCard({
  conversation,
  isSelected,
  onClick,
  onToggleBot,
  onTogglePause,
  variant,
}: ConversationCardProps) {
  const isPaused = conversation.automationPaused;
  const timeAgo = conversation.lastMessageAt
    ? formatTimeAgo(new Date(conversation.lastMessageAt))
    : "Unknown";

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer",
        isSelected
          ? "bg-neon-purple/20 border-neon-purple/50"
          : variant === "escalated"
          ? "bg-neon-orange/10 border-neon-orange/30 hover:bg-neon-orange/20"
          : "bg-void-surface/30 border-white/10 hover:border-neon-cyan/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-lg",
            variant === "escalated" ? "bg-neon-orange/20" : "bg-neon-cyan/20"
          )}>
            {conversation.contact?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="font-display text-sm text-white">
              {conversation.contact?.name ?? "Unknown"}
            </div>
            <div className="text-[10px] text-white/50 font-mono">
              {conversation.contact?.phone ?? "No phone"}
              {conversation.subsidiary && (
                <span className="ml-2 text-neon-purple">• {conversation.subsidiary}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Unread Badge */}
          {(conversation.unreadCount ?? 0) > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-neon-red/20 border border-neon-red/30 rounded text-neon-red">
              {conversation.unreadCount}
            </span>
          )}

          {/* Status */}
          <span className={cn(
            "px-2 py-0.5 text-[10px] font-mono rounded",
            isPaused
              ? "bg-neon-orange/20 text-neon-orange"
              : "bg-neon-green/20 text-neon-green"
          )}>
            {isPaused ? "PAUSED" : "ACTIVE"}
          </span>

          <span className="text-[10px] text-white/30 font-mono">{timeAgo}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-2 border-t border-white/10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePause(!isPaused);
          }}
          className={cn(
            "flex-1 px-2 py-1 text-[10px] font-mono rounded border transition-colors",
            isPaused
              ? "bg-neon-green/10 border-neon-green/30 text-neon-green hover:bg-neon-green/20"
              : "bg-neon-orange/10 border-neon-orange/30 text-neon-orange hover:bg-neon-orange/20"
          )}
        >
          {isPaused ? "▶ Resume Bot" : "⏸ Pause Bot"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBot(false);
          }}
          className="flex-1 px-2 py-1 text-[10px] font-mono rounded border bg-neon-red/10 border-neon-red/30 text-neon-red hover:bg-neon-red/20 transition-colors"
        >
          ✕ Disable Bot
        </button>
      </div>
    </div>
  );
}

interface ConfigEditorProps {
  config: {
    agentName?: string;
    language?: "de" | "en";
    personalityTrait?: "professional" | "friendly" | "formal";
    companyName?: string;
    companyDescription?: string;
    capabilities?: string[];
    escalationKeywords?: string[];
    outOfScopeResponse?: string;
  } | undefined;
  onSave: (config: {
    agentName?: string;
    language?: "de" | "en";
    personalityTrait?: "professional" | "friendly" | "formal";
    companyName?: string;
    companyDescription?: string;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfigEditor({ config, onSave, onCancel, isLoading }: ConfigEditorProps) {
  const [formData, setFormData] = useState({
    agentName: config?.agentName ?? "MAX",
    language: config?.language ?? "en",
    personalityTrait: config?.personalityTrait ?? "professional",
    companyName: config?.companyName ?? "",
    companyDescription: config?.companyDescription ?? "",
  });

  return (
    <div className="space-y-4">
      {/* Agent Name */}
      <div>
        <label className="text-xs text-white/50 font-mono uppercase mb-1 block">Agent Name</label>
        <input
          type="text"
          value={formData.agentName}
          onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
          className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
          placeholder="MAX"
        />
      </div>

      {/* Language */}
      <div>
        <label className="text-xs text-white/50 font-mono uppercase mb-1 block">Language</label>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setFormData({ ...formData, language: lang.id })}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-sm font-mono transition-colors",
                formData.language === lang.id
                  ? "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan"
                  : "bg-void-surface/50 border-white/10 text-white/50 hover:border-white/30"
              )}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div>
        <label className="text-xs text-white/50 font-mono uppercase mb-1 block">Personality</label>
        <div className="grid grid-cols-3 gap-2">
          {PERSONALITY_TRAITS.map((trait) => (
            <button
              key={trait.id}
              onClick={() => setFormData({ ...formData, personalityTrait: trait.id })}
              className={cn(
                "px-3 py-2 rounded-lg border text-xs font-mono transition-colors",
                formData.personalityTrait === trait.id
                  ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple"
                  : "bg-void-surface/50 border-white/10 text-white/50 hover:border-white/30"
              )}
            >
              {trait.icon} {trait.name}
            </button>
          ))}
        </div>
      </div>

      {/* Company Name */}
      <div>
        <label className="text-xs text-white/50 font-mono uppercase mb-1 block">Company Name</label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
          placeholder="Enterprise Universe GmbH"
        />
      </div>

      {/* Company Description */}
      <div>
        <label className="text-xs text-white/50 font-mono uppercase mb-1 block">Company Description</label>
        <textarea
          value={formData.companyDescription}
          onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50 resize-none"
          placeholder="Describe your company for the AI..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <NeonButton
          variant="cyan"
          size="sm"
          className="flex-1"
          onClick={() => onSave(formData)}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Configuration"}
        </NeonButton>
        <NeonButton
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </NeonButton>
      </div>
    </div>
  );
}

function ResponseTester() {
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<{
    suggestion: string | null;
    intent?: string;
    confidence?: number;
    shouldEscalate?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // For testing, we simulate a response since suggestResponse needs a conversationId
  const handleTest = async () => {
    if (!testMessage.trim()) return;

    setIsLoading(true);
    // Simulate AI processing
    setTimeout(() => {
      setTestResult({
        suggestion: `Vielen Dank für Ihre Nachricht! Ich bin MAX, Ihr persönlicher Assistent. Bezüglich "${testMessage}" werde ich gerne weiterhelfen. Wie kann ich Sie am besten unterstützen?`,
        intent: "general_inquiry",
        confidence: 0.85,
        shouldEscalate: false,
      });
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="Type a test message..."
          className="flex-1 px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
          onKeyDown={(e) => e.key === "Enter" && handleTest()}
        />
        <NeonButton
          variant="cyan"
          size="sm"
          onClick={handleTest}
          disabled={isLoading || !testMessage.trim()}
        >
          {isLoading ? "..." : "Test"}
        </NeonButton>
      </div>

      {testResult && (
        <div className="p-3 bg-void-surface/30 rounded-lg border border-neon-cyan/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🤖</span>
            <span className="text-xs font-mono text-neon-cyan">MAX Response</span>
            <span className={cn(
              "ml-auto px-2 py-0.5 text-[10px] font-mono rounded",
              (testResult.confidence ?? 0) > 0.8
                ? "bg-neon-green/20 text-neon-green"
                : "bg-neon-orange/20 text-neon-orange"
            )}>
              {((testResult.confidence ?? 0) * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="text-sm text-white/80">{testResult.suggestion}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 text-[10px] font-mono bg-neon-purple/20 border border-neon-purple/30 rounded text-neon-purple">
              {testResult.intent}
            </span>
            {testResult.shouldEscalate && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-neon-red/20 border border-neon-red/30 rounded text-neon-red">
                ⚠ Would Escalate
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatIntent(intent: string): string {
  return intent
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getIntentColor(index: number): "cyan" | "purple" | "green" | "orange" | "red" | "gold" {
  const colors: ("cyan" | "purple" | "green" | "orange" | "red" | "gold")[] = [
    "cyan", "purple", "green", "orange", "gold", "red"
  ];
  return colors[index % colors.length];
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
