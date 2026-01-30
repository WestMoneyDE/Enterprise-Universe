"use client";

// =============================================================================
// LOADING SKELETON COMPONENTS
// SciFi-themed loading states for dashboard components
// =============================================================================

import { cn } from "@/lib/utils";

// =============================================================================
// BASE SKELETON
// =============================================================================

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded bg-cyan-500/10",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-cyan-500/10 before:to-transparent",
        className
      )}
      style={style}
    />
  );
}

// =============================================================================
// STAT CARD SKELETON
// =============================================================================

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

// =============================================================================
// HOLO CARD SKELETON
// =============================================================================

export function HoloCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-cyan-500/20 bg-black/40 p-6", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// =============================================================================
// ACTIVITY FEED SKELETON
// =============================================================================

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-cyan-500/10 last:border-0">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TABLE SKELETON
// =============================================================================

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-cyan-500/10">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-black/40 overflow-hidden">
      {/* Header */}
      <div className="border-b border-cyan-500/20 bg-cyan-950/30">
        <div className="flex">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 py-3 px-4">
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
      {/* Body */}
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// NOTIFICATION SKELETON
// =============================================================================

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-cyan-500/10 last:border-0">
      <Skeleton className="h-6 w-6 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function NotificationsPanelSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-black/40">
      <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// CHART SKELETON
// =============================================================================

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("rounded-lg border border-cyan-500/20 bg-black/40 p-4", height)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <div className="flex h-full items-end gap-2 pt-4 pb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SYSTEM HEALTH SKELETON
// =============================================================================

export function SystemHealthSkeleton() {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TERMINAL SKELETON
// =============================================================================

export function TerminalSkeleton() {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-black/80 p-4 font-mono">
      <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/20 pb-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32 ml-4" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4" style={{ width: `${Math.random() * 40 + 30}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// QUICK ACTIONS SKELETON
// =============================================================================

export function QuickActionsSkeleton() {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-4">
      <Skeleton className="h-5 w-28 mb-4" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// FULL PAGE SKELETON
// =============================================================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartSkeleton />
          <TableSkeleton rows={5} columns={4} />
        </div>
        <div className="space-y-6">
          <ActivityFeedSkeleton count={4} />
          <NotificationsPanelSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LOADING SPINNER
// =============================================================================

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={cn(
          "animate-spin rounded-full border-cyan-500/30 border-t-cyan-400",
          sizeClasses[size]
        )}
      />
    </div>
  );
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

export function LoadingOverlay({ message = "Initializing..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-cyan-500/20" />
          </div>
        </div>
        <p className="font-mono text-sm uppercase tracking-wider text-cyan-400 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
