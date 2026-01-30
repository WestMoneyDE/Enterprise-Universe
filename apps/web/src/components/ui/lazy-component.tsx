"use client";

import * as React from "react";
import { Skeleton } from "./skeleton";

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY COMPONENT - Wrapper for lazy-loaded components with loading states
// ═══════════════════════════════════════════════════════════════════════════════

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string | number;
}

export function LazyComponent({
  children,
  fallback,
  minHeight = "200px",
}: LazyComponentProps) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      fallback || (
        <div
          className="flex items-center justify-center"
          style={{ minHeight }}
        >
          <Skeleton className="h-full w-full" />
        </div>
      )
    );
  }

  return <React.Suspense fallback={fallback}>{children}</React.Suspense>;
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const LazyWrappedComponent = React.lazy(
    () =>
      new Promise<{ default: React.ComponentType<P> }>((resolve) => {
        resolve({ default: Component });
      })
  );

  return function LazyLoadedComponent(props: P) {
    return (
      <React.Suspense fallback={fallback || <Skeleton className="h-40 w-full" />}>
        <LazyWrappedComponent {...props} />
      </React.Suspense>
    );
  };
}

// Intersection Observer based lazy loading
interface LazyLoadProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

export function LazyLoad({
  children,
  placeholder,
  rootMargin = "100px",
  threshold = 0,
  className,
}: LazyLoadProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : placeholder || <Skeleton className="h-40 w-full" />}
    </div>
  );
}
