import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createError,
  notFound,
  alreadyExists,
  unauthorized,
  forbidden,
  validationError,
  internalError,
  databaseError,
  externalServiceError,
  safeExecute,
  assertOrThrow,
  assertExists,
  isRetryable,
  ErrorCodes,
} from "./errors";

describe("Error Factory Functions", () => {
  describe("createError", () => {
    it("should create a TRPCError with default message", () => {
      const error = createError("NOT_FOUND");

      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("The requested resource was not found");
    });

    it("should create a TRPCError with custom message", () => {
      const error = createError("NOT_FOUND", "User not found");

      expect(error.message).toBe("User not found");
    });

    it("should include cause when provided", () => {
      const originalError = new Error("Original error");
      const error = createError("INTERNAL_ERROR", "Failed", originalError);

      expect(error.cause).toBe(originalError);
    });
  });

  describe("Convenience Functions", () => {
    it("notFound should create NOT_FOUND error", () => {
      const error = notFound("User", "123");

      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe('User with ID "123" not found');
    });

    it("notFound without ID should work", () => {
      const error = notFound("Configuration");

      expect(error.message).toBe("Configuration not found");
    });

    it("alreadyExists should create CONFLICT error", () => {
      const error = alreadyExists("User", "email");

      expect(error.code).toBe("CONFLICT");
      expect(error.message).toBe("User with this email already exists");
    });

    it("unauthorized should create UNAUTHORIZED error", () => {
      const error = unauthorized("Session expired");

      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe("Session expired");
    });

    it("forbidden should create FORBIDDEN error", () => {
      const error = forbidden();

      expect(error.code).toBe("FORBIDDEN");
    });

    it("validationError should create BAD_REQUEST error", () => {
      const error = validationError("Invalid email format");

      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toBe("Invalid email format");
    });

    it("internalError should create INTERNAL_SERVER_ERROR", () => {
      const error = internalError();

      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("databaseError should include operation context", () => {
      const cause = new Error("Connection refused");
      const error = databaseError("insert", cause);

      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(error.message).toBe("Database error during insert");
      expect(error.cause).toBe(cause);
    });

    it("externalServiceError should include service name", () => {
      const error = externalServiceError("Stripe");

      expect(error.message).toBe("Error communicating with Stripe");
    });
  });

  describe("safeExecute", () => {
    it("should return result on success", async () => {
      const result = await safeExecute(
        async () => ({ data: "test" }),
        { operation: "fetch", resource: "user" }
      );

      expect(result).toEqual({ data: "test" });
    });

    it("should re-throw TRPCErrors unchanged", async () => {
      const trpcError = new TRPCError({ code: "NOT_FOUND", message: "Not found" });

      await expect(
        safeExecute(async () => {
          throw trpcError;
        }, { operation: "fetch" })
      ).rejects.toBe(trpcError);
    });

    it("should wrap other errors as internal errors", async () => {
      const originalError = new Error("Database connection failed");

      await expect(
        safeExecute(async () => {
          throw originalError;
        }, { operation: "save", resource: "user" })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save user",
      });
    });
  });

  describe("assertOrThrow", () => {
    it("should not throw when condition is truthy", () => {
      expect(() => {
        assertOrThrow(true, notFound("test"));
      }).not.toThrow();

      expect(() => {
        assertOrThrow("string", notFound("test"));
      }).not.toThrow();

      expect(() => {
        assertOrThrow(1, notFound("test"));
      }).not.toThrow();
    });

    it("should throw when condition is falsy", () => {
      expect(() => {
        assertOrThrow(false, notFound("test"));
      }).toThrow(TRPCError);

      expect(() => {
        assertOrThrow(null, notFound("test"));
      }).toThrow(TRPCError);

      expect(() => {
        assertOrThrow(undefined, notFound("test"));
      }).toThrow(TRPCError);
    });

    it("should support error factory function", () => {
      expect(() => {
        assertOrThrow(false, () => notFound("User", "123"));
      }).toThrow('User with ID "123" not found');
    });
  });

  describe("assertExists", () => {
    it("should not throw when value exists", () => {
      const value = { id: "123" };

      expect(() => {
        assertExists(value, "User");
      }).not.toThrow();
    });

    it("should throw NOT_FOUND when value is null", () => {
      expect(() => {
        assertExists(null, "User", "123");
      }).toThrow('User with ID "123" not found');
    });

    it("should throw NOT_FOUND when value is undefined", () => {
      expect(() => {
        assertExists(undefined, "Configuration");
      }).toThrow("Configuration not found");
    });
  });

  describe("isRetryable", () => {
    it("should return true for server errors", () => {
      const error = new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error" });
      expect(isRetryable(error)).toBe(true);
    });

    it("should return true for rate limit errors", () => {
      const error = new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Error" });
      expect(isRetryable(error)).toBe(true);
    });

    it("should return true for timeout errors", () => {
      const error = new TRPCError({ code: "TIMEOUT", message: "Error" });
      expect(isRetryable(error)).toBe(true);
    });

    it("should return false for client errors", () => {
      expect(isRetryable(new TRPCError({ code: "NOT_FOUND", message: "Error" }))).toBe(false);
      expect(isRetryable(new TRPCError({ code: "UNAUTHORIZED", message: "Error" }))).toBe(false);
      expect(isRetryable(new TRPCError({ code: "BAD_REQUEST", message: "Error" }))).toBe(false);
    });

    it("should return false for non-TRPC errors", () => {
      expect(isRetryable(new Error("Regular error"))).toBe(false);
      expect(isRetryable("string error")).toBe(false);
    });
  });
});
