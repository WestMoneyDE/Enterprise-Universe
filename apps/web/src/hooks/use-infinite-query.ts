"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// USE INFINITE QUERY - Wrapper hook for tRPC infinite queries with virtualization
// ═══════════════════════════════════════════════════════════════════════════════

import * as React from "react";
import type { UseTRPCInfiniteQueryResult } from "@trpc/react-query/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard cursor-based pagination response format
 */
export interface InfiniteQueryPage<TItem> {
  items: TItem[];
  nextCursor?: string | number | null;
}

/**
 * Options for useInfiniteQuery hook
 */
export interface UseInfiniteQueryOptions<TItem> {
  /** The tRPC infinite query result */
  query: UseTRPCInfiniteQueryResult<InfiniteQueryPage<TItem>, unknown>;
  /** Automatically fetch next page when enabled */
  autoFetchOnScroll?: boolean;
  /** Threshold in pixels from bottom to trigger fetch (default: 200) */
  fetchThreshold?: number;
}

/**
 * Return type for useInfiniteQuery hook
 */
export interface UseInfiniteQueryResult<TItem> {
  /** Flattened array of all loaded items */
  data: TItem[];
  /** Total number of items loaded */
  totalLoaded: number;
  /** Function to fetch the next page */
  fetchNextPage: () => void;
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Whether currently fetching the next page */
  isFetchingNextPage: boolean;
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether any fetch is in progress */
  isFetching: boolean;
  /** Error if any occurred */
  error: unknown;
  /** Refetch all data */
  refetch: () => void;
  /** Scroll handler for auto-fetch (attach to scroll container) */
  onScroll: (event: React.UIEvent<HTMLElement>) => void;
  /** Callback to attach to VirtualList/VirtualTable onEndReached */
  onEndReached: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper hook for tRPC infinite queries
 *
 * Features:
 * - Flattens paginated data into a single array
 * - Handles cursor-based pagination
 * - Provides auto-fetch on scroll capability
 * - Compatible with VirtualList and VirtualTable components
 *
 * @example
 * ```tsx
 * const contactsQuery = api.contact.list.useInfiniteQuery(
 *   { limit: 50 },
 *   { getNextPageParam: (lastPage) => lastPage.nextCursor }
 * );
 *
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isLoading,
 *   onEndReached
 * } = useInfiniteQuery({ query: contactsQuery });
 *
 * return (
 *   <VirtualList
 *     items={data}
 *     renderItem={(contact) => <ContactCard contact={contact} />}
 *     estimateSize={80}
 *     onEndReached={onEndReached}
 *     loading={isLoading}
 *   />
 * );
 * ```
 */
export function useInfiniteQuery<TItem>({
  query,
  autoFetchOnScroll = true,
  fetchThreshold = 200,
}: UseInfiniteQueryOptions<TItem>): UseInfiniteQueryResult<TItem> {
  // Track if we've already triggered a fetch to prevent duplicates
  const fetchTriggeredRef = React.useRef(false);

  // Flatten all pages into a single array
  const data = React.useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data?.pages]);

  // Reset fetch trigger when data changes
  React.useEffect(() => {
    fetchTriggeredRef.current = false;
  }, [data.length]);

  // Memoized fetch next page handler
  const fetchNextPage = React.useCallback(() => {
    if (
      query.hasNextPage &&
      !query.isFetchingNextPage &&
      !fetchTriggeredRef.current
    ) {
      fetchTriggeredRef.current = true;
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  // Scroll handler for auto-fetch
  const onScroll = React.useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      if (!autoFetchOnScroll) return;

      const target = event.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < fetchThreshold) {
        fetchNextPage();
      }
    },
    [autoFetchOnScroll, fetchThreshold, fetchNextPage]
  );

  // End reached handler (for VirtualList/VirtualTable)
  const onEndReached = React.useCallback(() => {
    if (autoFetchOnScroll) {
      fetchNextPage();
    }
  }, [autoFetchOnScroll, fetchNextPage]);

  // Refetch handler
  const refetch = React.useCallback(() => {
    query.refetch();
  }, [query.refetch]);

  return {
    data,
    totalLoaded: data.length,
    fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
    onScroll,
    onEndReached,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USE INFINITE SCROLL - Simplified hook for scroll-based infinite loading
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Function to load more items */
  loadMore: () => void;
  /** Threshold in pixels from bottom (default: 200) */
  threshold?: number;
  /** Whether auto-fetch is enabled (default: true) */
  enabled?: boolean;
}

export interface UseInfiniteScrollResult {
  /** Scroll handler to attach to container */
  onScroll: (event: React.UIEvent<HTMLElement>) => void;
  /** Callback for VirtualList/VirtualTable onEndReached */
  onEndReached: () => void;
  /** Ref to track scroll container */
  scrollRef: React.RefObject<HTMLDivElement>;
}

/**
 * Simplified hook for scroll-based infinite loading
 *
 * @example
 * ```tsx
 * const { onScroll, onEndReached, scrollRef } = useInfiniteScroll({
 *   hasMore: hasNextPage,
 *   isLoading: isFetchingNextPage,
 *   loadMore: fetchNextPage,
 * });
 *
 * return (
 *   <div ref={scrollRef} onScroll={onScroll}>
 *     {items.map((item) => <Item key={item.id} {...item} />)}
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  loadMore,
  threshold = 200,
  enabled = true,
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const loadTriggeredRef = React.useRef(false);

  // Reset trigger when loading completes
  React.useEffect(() => {
    if (!isLoading) {
      loadTriggeredRef.current = false;
    }
  }, [isLoading]);

  const triggerLoad = React.useCallback(() => {
    if (enabled && hasMore && !isLoading && !loadTriggeredRef.current) {
      loadTriggeredRef.current = true;
      loadMore();
    }
  }, [enabled, hasMore, isLoading, loadMore]);

  const onScroll = React.useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < threshold) {
        triggerLoad();
      }
    },
    [threshold, triggerLoad]
  );

  const onEndReached = React.useCallback(() => {
    triggerLoad();
  }, [triggerLoad]);

  return {
    onScroll,
    onEndReached,
    scrollRef,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USE CURSOR PAGINATION - Helper hook for cursor-based pagination state
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseCursorPaginationOptions<TCursor = string> {
  /** Initial cursor value */
  initialCursor?: TCursor | null;
  /** Page size */
  pageSize?: number;
}

export interface UseCursorPaginationResult<TCursor = string> {
  /** Current cursor */
  cursor: TCursor | null;
  /** Set next cursor */
  setNextCursor: (cursor: TCursor | null | undefined) => void;
  /** Reset pagination */
  reset: () => void;
  /** Current page size */
  pageSize: number;
  /** Set page size */
  setPageSize: (size: number) => void;
}

/**
 * Helper hook for managing cursor-based pagination state
 *
 * @example
 * ```tsx
 * const { cursor, setNextCursor, reset, pageSize } = useCursorPagination({
 *   pageSize: 50
 * });
 *
 * const { data } = api.items.list.useQuery({ cursor, limit: pageSize });
 *
 * // After receiving response:
 * setNextCursor(data.nextCursor);
 * ```
 */
export function useCursorPagination<TCursor = string>({
  initialCursor = null,
  pageSize: initialPageSize = 50,
}: UseCursorPaginationOptions<TCursor> = {}): UseCursorPaginationResult<TCursor> {
  const [cursor, setCursor] = React.useState<TCursor | null>(initialCursor);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const setNextCursor = React.useCallback(
    (nextCursor: TCursor | null | undefined) => {
      setCursor(nextCursor ?? null);
    },
    []
  );

  const reset = React.useCallback(() => {
    setCursor(initialCursor);
  }, [initialCursor]);

  return {
    cursor,
    setNextCursor,
    reset,
    pageSize,
    setPageSize,
  };
}
