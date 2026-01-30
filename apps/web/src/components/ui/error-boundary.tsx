"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

// =============================================================================
// ERROR BOUNDARY - Catch and display React errors gracefully
// =============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPathChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Report to error tracking service
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production with Sentry:
    // const eventId = Sentry.captureException(error, {
    //   extra: { componentStack: errorInfo.componentStack }
    // });
    // this.setState({ eventId });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          eventId={this.state.eventId}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// DEFAULT ERROR FALLBACK
// =============================================================================

interface DefaultErrorFallbackProps {
  error: Error | null;
  eventId?: string | null;
  onReset: () => void;
}

function DefaultErrorFallback({
  error,
  eventId,
  onReset,
}: DefaultErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card variant="holo" className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-neon-red/20 p-4">
            <AlertTriangle className="h-8 w-8 text-neon-red" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display text-gray-100">
              Etwas ist schiefgelaufen
            </h2>
            <p className="text-sm text-gray-400">
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es
              erneut.
            </p>
          </div>

          {error && process.env.NODE_ENV === "development" && (
            <div className="w-full rounded-lg bg-gray-900/50 p-3 text-left">
              <p className="text-xs font-mono text-neon-red break-all">
                {error.message}
              </p>
              {error.stack && (
                <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32">
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          {eventId && (
            <p className="text-xs text-gray-500">
              Fehler-ID: <code className="text-neon-cyan">{eventId}</code>
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Seite neu laden
            </Button>
            <Button variant="cyan" onClick={onReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Erneut versuchen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// HOOK FOR FUNCTIONAL ERROR HANDLING
// =============================================================================

interface UseErrorBoundaryReturn {
  error: Error | null;
  resetError: () => void;
  showError: (error: Error) => void;
}

export function useErrorBoundary(): UseErrorBoundaryReturn {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const showError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Re-throw to be caught by nearest ErrorBoundary
  if (error) {
    throw error;
  }

  return { error, resetError, showError };
}

// =============================================================================
// SUSPENSE ERROR BOUNDARY
// =============================================================================

interface SuspenseErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function SuspenseErrorBoundary({
  children,
  fallback,
  loadingFallback,
  onError,
}: SuspenseErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <React.Suspense fallback={loadingFallback || <DefaultLoadingFallback />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

function DefaultLoadingFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
        <p className="text-sm text-gray-400">Laden...</p>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ErrorBoundary;
