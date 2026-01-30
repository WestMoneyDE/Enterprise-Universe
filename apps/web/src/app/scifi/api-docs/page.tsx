"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton, usePowerMode } from "@/components/scifi";
import { EndpointCard, ApiExplorer } from "@/components/api-docs";
import {
  routerCategories,
  getAllEndpoints,
  searchEndpoints,
  type ApiEndpoint,
  type RouterCategory,
} from "@/data/api-docs";
import {
  Search,
  Book,
  Code,
  Lock,
  Unlock,
  ChevronRight,
  BarChart3,
  Users,
  Briefcase,
  Target,
  Bot,
  Shield,
  Zap,
  ExternalLink,
  Terminal,
} from "lucide-react";

// =============================================================================
// API DOCUMENTATION PAGE
// =============================================================================
// Comprehensive API documentation page with SciFi styling

const ROUTER_ICONS: Record<string, React.ReactNode> = {
  dashboard: <BarChart3 className="w-4 h-4" />,
  contacts: <Users className="w-4 h-4" />,
  deals: <Briefcase className="w-4 h-4" />,
  leadScoring: <Target className="w-4 h-4" />,
  aiAgent: <Bot className="w-4 h-4" />,
};

export default function ApiDocsPage() {
  const { mode } = usePowerMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouter, setSelectedRouter] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [showExplorer, setShowExplorer] = useState(false);
  const [filterAuth, setFilterAuth] = useState<"all" | "public" | "protected">("all");
  const [filterType, setFilterType] = useState<"all" | "query" | "mutation">("all");

  const isGodMode = mode === "god";
  const isUltraMode = mode === "ultra";

  // Filter and search endpoints
  const filteredEndpoints = useMemo(() => {
    let endpoints = selectedRouter
      ? routerCategories.find((c) => c.id === selectedRouter)?.endpoints ?? []
      : getAllEndpoints();

    // Apply search
    if (searchQuery) {
      endpoints = searchEndpoints(searchQuery).filter((e) =>
        selectedRouter ? e.router === selectedRouter : true
      );
    }

    // Apply auth filter
    if (filterAuth === "public") {
      endpoints = endpoints.filter((e) => !e.authRequired);
    } else if (filterAuth === "protected") {
      endpoints = endpoints.filter((e) => e.authRequired);
    }

    // Apply type filter
    if (filterType !== "all") {
      endpoints = endpoints.filter((e) => e.type === filterType);
    }

    return endpoints;
  }, [searchQuery, selectedRouter, filterAuth, filterType]);

  // Stats
  const stats = useMemo(() => {
    const all = getAllEndpoints();
    return {
      total: all.length,
      queries: all.filter((e) => e.type === "query").length,
      mutations: all.filter((e) => e.type === "mutation").length,
      public: all.filter((e) => !e.authRequired).length,
      protected: all.filter((e) => e.authRequired).length,
    };
  }, []);

  const handleTryIt = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setShowExplorer(true);
  };

  const accentColor = isGodMode
    ? "text-god-primary"
    : isUltraMode
    ? "text-ultra-secondary"
    : "text-neon-cyan";

  const accentBg = isGodMode
    ? "bg-god-primary/20"
    : isUltraMode
    ? "bg-ultra-secondary/20"
    : "bg-neon-cyan/20";

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="border-b border-white/10 bg-void-dark/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg", accentBg)}>
                <Book className={cn("w-6 h-6", accentColor)} />
              </div>
              <div>
                <h1 className={cn("text-2xl font-bold tracking-wider", accentColor)}>
                  API DOCUMENTATION
                </h1>
                <p className="text-sm text-white/50">
                  NEXUS Command Center tRPC API Reference
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-white font-bold">{stats.total}</div>
                <div className="text-white/40 text-xs">Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-neon-cyan font-bold">{stats.queries}</div>
                <div className="text-white/40 text-xs">Queries</div>
              </div>
              <div className="text-center">
                <div className="text-neon-purple font-bold">{stats.mutations}</div>
                <div className="text-white/40 text-xs">Mutations</div>
              </div>
              <div className="text-center">
                <div className="text-neon-green font-bold">{stats.public}</div>
                <div className="text-white/40 text-xs">Public</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-white/10 min-h-[calc(100vh-80px)] sticky top-20 self-start">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-lg text-sm",
                  "bg-void-dark/50 border border-white/10",
                  "text-white placeholder:text-white/30",
                  "focus:outline-none focus:border-neon-cyan/50"
                )}
              />
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterAuth("all")}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded transition-colors",
                    filterAuth === "all"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterAuth("public")}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded transition-colors flex items-center justify-center gap-1",
                    filterAuth === "public"
                      ? "bg-neon-green/20 text-neon-green"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  <Unlock className="w-3 h-3" />
                  Public
                </button>
                <button
                  onClick={() => setFilterAuth("protected")}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded transition-colors flex items-center justify-center gap-1",
                    filterAuth === "protected"
                      ? "bg-neon-orange/20 text-neon-orange"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  <Lock className="w-3 h-3" />
                  Auth
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType("all")}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded transition-colors",
                    filterType === "all"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType("query")}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded transition-colors",
                    filterType === "query"
                      ? "bg-neon-cyan/20 text-neon-cyan"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Query
                </button>
                <button
                  onClick={() => setFilterType("mutation")}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded transition-colors",
                    filterType === "mutation"
                      ? "bg-neon-purple/20 text-neon-purple"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Mutation
                </button>
              </div>
            </div>

            {/* Router Categories */}
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedRouter(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedRouter === null
                    ? cn("bg-white/10 text-white", isGodMode && "bg-god-primary/20", isUltraMode && "bg-ultra-secondary/20")
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Code className="w-4 h-4" />
                <span>All Endpoints</span>
                <span className="ml-auto text-xs text-white/40">{stats.total}</span>
              </button>

              {routerCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedRouter(category.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedRouter === category.id
                      ? cn("bg-white/10 text-white", isGodMode && "bg-god-primary/20", isUltraMode && "bg-ultra-secondary/20")
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {ROUTER_ICONS[category.id] ?? <Code className="w-4 h-4" />}
                  <span>{category.name}</span>
                  <span className="ml-auto text-xs text-white/40">
                    {category.endpoints.length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 space-y-6">
          {/* Authentication Section */}
          {!selectedRouter && !searchQuery && (
            <HoloCard
              variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
              glow
              title="AUTHENTICATION"
              subtitle="tRPC Session Requirements"
              icon={<Shield className="w-5 h-5" />}
            >
              <div className="space-y-4">
                <p className="text-white/70 text-sm leading-relaxed">
                  The NEXUS Command Center API uses tRPC with session-based authentication.
                  Protected endpoints require a valid session cookie obtained through the
                  authentication flow.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Public Endpoints */}
                  <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Unlock className="w-4 h-4 text-neon-green" />
                      <span className="text-sm font-semibold text-neon-green">
                        Public Endpoints
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      These endpoints are accessible without authentication. They typically
                      return aggregate statistics and public configuration data.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-neon-green/20 text-neon-green">
                        dashboard.*
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-neon-green/20 text-neon-green">
                        leadScoring.*
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-neon-green/20 text-neon-green">
                        aiAgent.*
                      </span>
                    </div>
                  </div>

                  {/* Protected Endpoints */}
                  <div className="p-4 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-neon-orange" />
                      <span className="text-sm font-semibold text-neon-orange">
                        Protected Endpoints
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      These endpoints require authentication and are scoped to the user's
                      organization. They handle sensitive CRUD operations.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-neon-orange/20 text-neon-orange">
                        contacts.*
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-neon-orange/20 text-neon-orange">
                        deals.*
                      </span>
                    </div>
                  </div>
                </div>

                {/* Usage Example */}
                <div className="p-4 rounded-lg bg-void-dark/50 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-neon-cyan" />
                    <span className="text-sm font-semibold text-white">Usage with tRPC Client</span>
                  </div>
                  <pre className="text-xs font-mono text-white/80 overflow-x-auto">
{`// Import the tRPC hooks
import { api } from "@/trpc";

// Use in a React component
function MyComponent() {
  // Query example (automatic caching & refetching)
  const { data, isLoading } = api.dashboard.getStats.useQuery();

  // Mutation example
  const createContact = api.contacts.create.useMutation({
    onSuccess: () => {
      // Handle success
    }
  });

  // Execute mutation
  createContact.mutate({
    email: "new@example.com",
    firstName: "John",
    type: "lead"
  });
}`}
                  </pre>
                </div>

                {/* Base URL */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Zap className="w-5 h-5 text-neon-purple" />
                  <div>
                    <span className="text-xs text-white/40">Base URL: </span>
                    <code className="text-sm text-neon-purple font-mono">/api/trpc</code>
                  </div>
                  <a
                    href="/api/trpc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-white/40 hover:text-white/60 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </HoloCard>
          )}

          {/* Selected Router Description */}
          {selectedRouter && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                {ROUTER_ICONS[selectedRouter]}
                <h2 className={cn("text-xl font-bold", accentColor)}>
                  {routerCategories.find((c) => c.id === selectedRouter)?.name}
                </h2>
              </div>
              <p className="text-white/60 text-sm">
                {routerCategories.find((c) => c.id === selectedRouter)?.description}
              </p>
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">
              {filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          {/* Endpoint List */}
          <div className="space-y-4">
            {filteredEndpoints.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No endpoints found</p>
                <p className="text-white/30 text-sm mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              filteredEndpoints.map((endpoint) => (
                <EndpointCard
                  key={endpoint.id}
                  endpoint={endpoint}
                  onTryIt={handleTryIt}
                />
              ))
            )}
          </div>
        </main>
      </div>

      {/* API Explorer Modal */}
      {showExplorer && selectedEndpoint && (
        <ApiExplorer
          endpoint={selectedEndpoint}
          onClose={() => {
            setShowExplorer(false);
            setSelectedEndpoint(null);
          }}
        />
      )}
    </div>
  );
}
