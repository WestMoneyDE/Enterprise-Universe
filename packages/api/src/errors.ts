// =============================================================================
// API ERROR UTILITIES
// Standardized error handling for tRPC procedures
// =============================================================================

import { TRPCError } from "@trpc/server";

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TWO_FACTOR_REQUIRED: "TWO_FACTOR_REQUIRED",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const ErrorMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "You do not have permission to perform this action",
  SESSION_EXPIRED: "Your session has expired. Please log in again",
  INVALID_CREDENTIALS: "Invalid email or password",
  TWO_FACTOR_REQUIRED: "Two-factor authentication is required",

  VALIDATION_ERROR: "Invalid input data",
  INVALID_INPUT: "The provided input is invalid",
  MISSING_REQUIRED_FIELD: "A required field is missing",

  NOT_FOUND: "The requested resource was not found",
  ALREADY_EXISTS: "A resource with this identifier already exists",
  CONFLICT: "The operation conflicts with the current state",

  RATE_LIMITED: "Too many requests. Please wait before trying again",
  TOO_MANY_REQUESTS: "Rate limit exceeded",

  INTERNAL_ERROR: "An internal server error occurred",
  SERVICE_UNAVAILABLE: "The service is temporarily unavailable",
  DATABASE_ERROR: "A database error occurred",
  EXTERNAL_SERVICE_ERROR: "An external service is unavailable",
};

// =============================================================================
// ERROR FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a standardized TRPCError
 */
export function createError(
  code: ErrorCode,
  message?: string,
  cause?: unknown
): TRPCError {
  const trpcCode = mapToTRPCCode(code);
  return new TRPCError({
    code: trpcCode,
    message: message || ErrorMessages[code],
    cause,
  });
}

/**
 * Map custom error codes to tRPC error codes
 */
function mapToTRPCCode(code: ErrorCode): TRPCError["code"] {
  switch (code) {
    case "UNAUTHORIZED":
    case "SESSION_EXPIRED":
    case "INVALID_CREDENTIALS":
    case "TWO_FACTOR_REQUIRED":
      return "UNAUTHORIZED";

    case "FORBIDDEN":
      return "FORBIDDEN";

    case "NOT_FOUND":
      return "NOT_FOUND";

    case "VALIDATION_ERROR":
    case "INVALID_INPUT":
    case "MISSING_REQUIRED_FIELD":
      return "BAD_REQUEST";

    case "ALREADY_EXISTS":
    case "CONFLICT":
      return "CONFLICT";

    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return "TOO_MANY_REQUESTS";

    case "SERVICE_UNAVAILABLE":
      return "PRECONDITION_FAILED";

    case "INTERNAL_ERROR":
    case "DATABASE_ERROR":
    case "EXTERNAL_SERVICE_ERROR":
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

// =============================================================================
// CONVENIENCE ERROR FUNCTIONS
// =============================================================================

export function notFound(resource: string, id?: string): TRPCError {
  const message = id
    ? `${resource} with ID "${id}" not found`
    : `${resource} not found`;
  return createError("NOT_FOUND", message);
}

export function alreadyExists(resource: string, field?: string): TRPCError {
  const message = field
    ? `${resource} with this ${field} already exists`
    : `${resource} already exists`;
  return createError("ALREADY_EXISTS", message);
}

export function unauthorized(message?: string): TRPCError {
  return createError("UNAUTHORIZED", message);
}

export function forbidden(message?: string): TRPCError {
  return createError("FORBIDDEN", message);
}

export function validationError(message: string): TRPCError {
  return createError("VALIDATION_ERROR", message);
}

export function internalError(message?: string, cause?: unknown): TRPCError {
  return createError("INTERNAL_ERROR", message, cause);
}

export function databaseError(operation: string, cause?: unknown): TRPCError {
  return createError("DATABASE_ERROR", `Database error during ${operation}`, cause);
}

export function externalServiceError(service: string, cause?: unknown): TRPCError {
  return createError("EXTERNAL_SERVICE_ERROR", `Error communicating with ${service}`, cause);
}

// =============================================================================
// SAFE EXECUTION WRAPPER
// =============================================================================

/**
 * Wrap an async operation with standardized error handling
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorContext: { operation: string; resource?: string }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Re-throw TRPCErrors as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log and wrap other errors
    console.error(`[SAFE_EXECUTE] ${errorContext.operation} failed:`, error);

    throw internalError(
      `Failed to ${errorContext.operation}${errorContext.resource ? ` ${errorContext.resource}` : ""}`,
      error
    );
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Assert a condition or throw an error
 */
export function assertOrThrow(
  condition: unknown,
  error: TRPCError | (() => TRPCError)
): asserts condition {
  if (!condition) {
    throw typeof error === "function" ? error() : error;
  }
}

/**
 * Assert a value exists (not null or undefined)
 */
export function assertExists<T>(
  value: T | null | undefined,
  resource: string,
  id?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw notFound(resource, id);
  }
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  if (error instanceof TRPCError) {
    return error.message.includes(code) || error.code === mapToTRPCCode(code);
  }
  return false;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TRPCError) {
    const retryableCodes: TRPCError["code"][] = [
      "INTERNAL_SERVER_ERROR",
      "TOO_MANY_REQUESTS",
      "TIMEOUT",
      "PRECONDITION_FAILED",
    ];
    return retryableCodes.includes(error.code);
  }
  return false;
}
