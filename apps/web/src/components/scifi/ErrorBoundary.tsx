"use client";

import { Component, type ReactNode } from "react";

// =============================================================================
// ERROR BOUNDARY TYPES
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.componentName ? `:${this.props.componentName}` : ""}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          componentName={this.props.componentName}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// ERROR FALLBACK UI
// =============================================================================

interface ErrorFallbackProps {
  error: Error | null;
  componentName?: string;
  onRetry?: () => void;
}

export function ErrorFallback({ error, componentName, onRetry }: ErrorFallbackProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-red-500/30 bg-black/60 p-6">
      {/* Glitch effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-transparent" />

      {/* Scan line effect */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,0,0,0.03)_2px,rgba(255,0,0,0.03)_4px)]" />

      <div className="relative z-10">
        {/* Error icon */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-red-400">
              System Malfunction
            </h3>
            {componentName && (
              <p className="font-mono text-xs text-red-400/70">
                Module: {componentName}
              </p>
            )}
          </div>
        </div>

        {/* Error message */}
        <div className="mb-4 rounded border border-red-500/20 bg-red-950/30 p-3">
          <code className="font-mono text-xs text-red-300">
            {error?.message || "Unknown error occurred"}
          </code>
        </div>

        {/* Retry button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="group flex items-center gap-2 rounded border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-cyan-400 transition-all hover:border-cyan-400 hover:bg-cyan-500/20"
          >
            <svg className="h-4 w-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reinitialize Module
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CARD ERROR FALLBACK (COMPACT)
// =============================================================================

export function CardErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-lg border border-red-500/30 bg-black/40 p-4">
      <div className="mb-2 text-red-400">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="mb-2 font-mono text-xs text-red-400/80">Module Offline</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="font-mono text-xs text-cyan-400 hover:text-cyan-300"
        >
          [RETRY]
        </button>
      )}
    </div>
  );
}

// =============================================================================
// INLINE ERROR (FOR SMALL SECTIONS)
// =============================================================================

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-red-500/30 bg-red-950/20 px-3 py-2">
      <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span className="font-mono text-xs text-red-400">{message}</span>
    </div>
  );
}

// =============================================================================
// API ERROR DISPLAY
// =============================================================================

interface ApiErrorProps {
  error: unknown;
  retry?: () => void;
}

export function ApiError({ error, retry }: ApiErrorProps) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "An unexpected error occurred";

  return (
    <div className="rounded-lg border border-red-500/30 bg-black/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-red-500/20 text-red-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-mono text-sm font-medium text-red-400">Connection Error</h4>
          <p className="mt-1 font-mono text-xs text-gray-400">{message}</p>
          {retry && (
            <button
              onClick={retry}
              className="mt-3 font-mono text-xs text-cyan-400 hover:text-cyan-300"
            >
              → Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
