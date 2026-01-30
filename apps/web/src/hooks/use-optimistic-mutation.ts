"use client";

import * as React from "react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMISTIC MUTATION HOOK - Handle optimistic updates for tRPC mutations
// ═══════════════════════════════════════════════════════════════════════════════

interface OptimisticMutationOptions<TData, TVariables> {
  // Function to generate optimistic data
  optimisticUpdate?: (variables: TVariables, currentData: TData | undefined) => TData;
  // Callback when mutation succeeds
  onSuccess?: (data: TData, variables: TVariables) => void;
  // Callback when mutation fails
  onError?: (error: Error, variables: TVariables) => void;
  // Toast messages
  toasts?: {
    loading?: string;
    success?: string;
    error?: string;
  };
}

export function useOptimisticMutation<TData, TVariables, TError = Error>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: OptimisticMutationOptions<TData, TVariables> = {}
) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<TError | null>(null);
  const [optimisticData, setOptimisticData] = React.useState<TData | undefined>();
  const previousDataRef = React.useRef<TData | undefined>(undefined);

  const mutate = React.useCallback(
    async (variables: TVariables, currentData?: TData) => {
      setIsLoading(true);
      setError(null);

      // Store previous data for rollback
      previousDataRef.current = currentData;

      // Apply optimistic update
      if (options.optimisticUpdate) {
        const optimistic = options.optimisticUpdate(variables, currentData);
        setOptimisticData(optimistic);
      }

      // Show loading toast if configured
      const toastId = options.toasts?.loading
        ? toast.loading(options.toasts.loading)
        : undefined;

      try {
        const result = await mutationFn(variables);

        // Clear optimistic data and update with real result
        setOptimisticData(undefined);

        // Dismiss loading toast and show success
        if (toastId) toast.dismiss(toastId);
        if (options.toasts?.success) toast.success(options.toasts.success);

        options.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        // Rollback optimistic update
        setOptimisticData(undefined);
        setError(err as TError);

        // Dismiss loading toast and show error
        if (toastId) toast.dismiss(toastId);
        if (options.toasts?.error) toast.error(options.toasts.error);

        options.onError?.(err as Error, variables);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, options]
  );

  const reset = React.useCallback(() => {
    setIsLoading(false);
    setError(null);
    setOptimisticData(undefined);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    optimisticData,
    previousData: previousDataRef.current,
    reset,
  };
}

// Helper for list mutations (add, update, delete)
interface ListMutationHelpers<TItem> {
  addItem: (items: TItem[], newItem: TItem) => TItem[];
  updateItem: (items: TItem[], id: string, updates: Partial<TItem>) => TItem[];
  removeItem: (items: TItem[], id: string) => TItem[];
}

export function createListMutationHelpers<TItem extends { id: string }>(): ListMutationHelpers<TItem> {
  return {
    addItem: (items, newItem) => [newItem, ...items],
    updateItem: (items, id, updates) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    removeItem: (items, id) => items.filter((item) => item.id !== id),
  };
}

// Hook specifically for tRPC-like mutations with utils
export function useTRPCOptimistic<TData, TVariables>({
  mutation,
  utils,
  queryKey,
  optimisticUpdate,
  toasts,
}: {
  mutation: { mutateAsync: (variables: TVariables) => Promise<TData> };
  utils: { invalidate: () => Promise<void> };
  queryKey: unknown[];
  optimisticUpdate?: (variables: TVariables, data: TData | undefined) => TData;
  toasts?: { loading?: string; success?: string; error?: string };
}) {
  return useOptimisticMutation<TData, TVariables>(mutation.mutateAsync, {
    optimisticUpdate,
    toasts,
    onSuccess: async () => {
      await utils.invalidate();
    },
  });
}
