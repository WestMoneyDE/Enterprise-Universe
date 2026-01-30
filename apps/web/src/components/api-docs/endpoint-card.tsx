"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { HoloCard } from "@/components/scifi";
import { SchemaViewer } from "./schema-viewer";
import {
  ChevronDown,
  ChevronRight,
  Code,
  Lock,
  Unlock,
  Play,
  Copy,
  Check,
} from "lucide-react";
import type { ApiEndpoint } from "@/data/api-docs";

// =============================================================================
// ENDPOINT CARD COMPONENT
// =============================================================================
// Card showing endpoint info with expandable sections

interface EndpointCardProps {
  endpoint: ApiEndpoint;
  onTryIt?: (endpoint: ApiEndpoint) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function EndpointCard({
  endpoint,
  onTryIt,
  className,
  defaultExpanded = false,
}: EndpointCardProps) {
  const [inputExpanded, setInputExpanded] = useState(defaultExpanded);
  const [outputExpanded, setOutputExpanded] = useState(defaultExpanded);
  const [exampleExpanded, setExampleExpanded] = useState(false);
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const isQuery = endpoint.type === "query";

  const handleCopy = async (text: string, type: "request" | "response") => {
    await navigator.clipboard.writeText(text);
    if (type === "request") {
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2000);
    } else {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  return (
    <HoloCard
      variant={isQuery ? "cyan" : "purple"}
      className={cn("group", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Method Badge + Path */}
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge type={endpoint.type} />
            <code className="text-white font-mono text-sm truncate">
              {endpoint.router}.{endpoint.procedure}
            </code>
            {/* Auth Indicator */}
            {endpoint.authRequired ? (
              <span className="flex items-center gap-1 text-xs text-neon-orange">
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Auth</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-neon-green">
                <Unlock className="w-3 h-3" />
                <span className="hidden sm:inline">Public</span>
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-white/70 text-sm leading-relaxed">
            {endpoint.description}
          </p>
        </div>

        {/* Try It Button */}
        {onTryIt && (
          <button
            onClick={() => onTryIt(endpoint)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold",
              "border transition-all duration-200",
              "opacity-0 group-hover:opacity-100",
              isQuery
                ? "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20"
                : "bg-neon-purple/10 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20"
            )}
          >
            <Play className="w-3 h-3" />
            TRY IT
          </button>
        )}
      </div>

      {/* Collapsible Sections */}
      <div className="mt-4 space-y-2">
        {/* Input Schema */}
        <CollapsibleSection
          title="Input Schema"
          icon={<Code className="w-3.5 h-3.5" />}
          expanded={inputExpanded}
          onToggle={() => setInputExpanded(!inputExpanded)}
          count={endpoint.inputSchema.length}
        >
          <SchemaViewer fields={endpoint.inputSchema} />
        </CollapsibleSection>

        {/* Output Schema */}
        <CollapsibleSection
          title="Output Schema"
          icon={<Code className="w-3.5 h-3.5" />}
          expanded={outputExpanded}
          onToggle={() => setOutputExpanded(!outputExpanded)}
          count={endpoint.outputSchema.length}
        >
          <SchemaViewer fields={endpoint.outputSchema} />
        </CollapsibleSection>

        {/* Examples */}
        <CollapsibleSection
          title="Examples"
          icon={<Code className="w-3.5 h-3.5" />}
          expanded={exampleExpanded}
          onToggle={() => setExampleExpanded(!exampleExpanded)}
          variant="gold"
        >
          <div className="space-y-4">
            {/* Request Example */}
            {endpoint.examples.request && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/50 uppercase">
                    Request
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(endpoint.examples.request, null, 2),
                        "request"
                      )
                    }
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    {copiedRequest ? (
                      <Check className="w-3.5 h-3.5 text-neon-green" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <CodeBlock code={endpoint.examples.request} />
              </div>
            )}

            {/* Response Example */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/50 uppercase">
                  Response
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(endpoint.examples.response, null, 2),
                      "response"
                    )
                  }
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  {copiedResponse ? (
                    <Check className="w-3.5 h-3.5 text-neon-green" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <CodeBlock code={endpoint.examples.response} />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </HoloCard>
  );
}

// =============================================================================
// METHOD BADGE
// =============================================================================

interface MethodBadgeProps {
  type: "query" | "mutation";
}

export function MethodBadge({ type }: MethodBadgeProps) {
  const isQuery = type === "query";

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        isQuery
          ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
          : "bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
      )}
    >
      {type}
    </span>
  );
}

// =============================================================================
// COLLAPSIBLE SECTION
// =============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  count?: number;
  variant?: "default" | "gold";
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  count,
  variant = "default",
  children,
}: CollapsibleSectionProps) {
  const variantStyles = {
    default: "border-white/10 hover:border-white/20",
    gold: "border-neon-gold/20 hover:border-neon-gold/40",
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", variantStyles[variant])}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-left",
          "transition-colors hover:bg-white/5"
        )}
      >
        <span className="text-white/50">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        {icon && <span className="text-white/50">{icon}</span>}
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-[10px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5">{children}</div>
      )}
    </div>
  );
}

// =============================================================================
// CODE BLOCK - Safe JSON Syntax Highlighting
// =============================================================================

interface CodeBlockProps {
  code: unknown;
}

interface TokenPart {
  type: "key" | "string" | "number" | "boolean" | "null" | "punctuation" | "text";
  value: string;
}

function CodeBlock({ code }: CodeBlockProps) {
  const formattedCode = JSON.stringify(code, null, 2);

  // Parse and tokenize JSON for syntax highlighting
  const lines = useMemo(() => {
    return formattedCode.split("\n").map((line) => tokenizeLine(line));
  }, [formattedCode]);

  return (
    <pre
      className={cn(
        "p-3 rounded-lg overflow-x-auto text-xs font-mono",
        "bg-void-dark/50 border border-white/5"
      )}
    >
      <code className="text-white/80">
        {lines.map((tokens, lineIndex) => (
          <div key={lineIndex} className="hover:bg-white/5">
            <span className="text-white/20 select-none mr-4">
              {String(lineIndex + 1).padStart(2, " ")}
            </span>
            {tokens.map((token, tokenIndex) => (
              <TokenSpan key={tokenIndex} token={token} />
            ))}
          </div>
        ))}
      </code>
    </pre>
  );
}

function tokenizeLine(line: string): TokenPart[] {
  const tokens: TokenPart[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Match key (property name)
    const keyMatch = remaining.match(/^(\s*)"([^"]+)":/);
    if (keyMatch) {
      if (keyMatch[1]) {
        tokens.push({ type: "text", value: keyMatch[1] });
      }
      tokens.push({ type: "key", value: `"${keyMatch[2]}"` });
      tokens.push({ type: "punctuation", value: ":" });
      remaining = remaining.slice(keyMatch[0].length);
      continue;
    }

    // Match string value
    const stringMatch = remaining.match(/^(\s*)"([^"]*)"(,?)/);
    if (stringMatch) {
      if (stringMatch[1]) {
        tokens.push({ type: "text", value: stringMatch[1] });
      }
      tokens.push({ type: "string", value: `"${stringMatch[2]}"` });
      if (stringMatch[3]) {
        tokens.push({ type: "punctuation", value: stringMatch[3] });
      }
      remaining = remaining.slice(stringMatch[0].length);
      continue;
    }

    // Match number
    const numberMatch = remaining.match(/^(\s*)(-?\d+\.?\d*)(,?)/);
    if (numberMatch) {
      if (numberMatch[1]) {
        tokens.push({ type: "text", value: numberMatch[1] });
      }
      tokens.push({ type: "number", value: numberMatch[2] });
      if (numberMatch[3]) {
        tokens.push({ type: "punctuation", value: numberMatch[3] });
      }
      remaining = remaining.slice(numberMatch[0].length);
      continue;
    }

    // Match boolean
    const boolMatch = remaining.match(/^(\s*)(true|false)(,?)/);
    if (boolMatch) {
      if (boolMatch[1]) {
        tokens.push({ type: "text", value: boolMatch[1] });
      }
      tokens.push({ type: "boolean", value: boolMatch[2] });
      if (boolMatch[3]) {
        tokens.push({ type: "punctuation", value: boolMatch[3] });
      }
      remaining = remaining.slice(boolMatch[0].length);
      continue;
    }

    // Match null
    const nullMatch = remaining.match(/^(\s*)(null)(,?)/);
    if (nullMatch) {
      if (nullMatch[1]) {
        tokens.push({ type: "text", value: nullMatch[1] });
      }
      tokens.push({ type: "null", value: nullMatch[2] });
      if (nullMatch[3]) {
        tokens.push({ type: "punctuation", value: nullMatch[3] });
      }
      remaining = remaining.slice(nullMatch[0].length);
      continue;
    }

    // Match brackets
    const bracketMatch = remaining.match(/^(\s*)([{}\[\],])/);
    if (bracketMatch) {
      if (bracketMatch[1]) {
        tokens.push({ type: "text", value: bracketMatch[1] });
      }
      tokens.push({ type: "punctuation", value: bracketMatch[2] });
      remaining = remaining.slice(bracketMatch[0].length);
      continue;
    }

    // Fallback: take one character
    tokens.push({ type: "text", value: remaining[0] });
    remaining = remaining.slice(1);
  }

  return tokens;
}

function TokenSpan({ token }: { token: TokenPart }) {
  const colorMap: Record<TokenPart["type"], string> = {
    key: "text-neon-cyan",
    string: "text-neon-green",
    number: "text-neon-orange",
    boolean: "text-neon-purple",
    null: "text-white/40",
    punctuation: "text-white/50",
    text: "text-white/80",
  };

  return <span className={colorMap[token.type]}>{token.value}</span>;
}

export default EndpointCard;
