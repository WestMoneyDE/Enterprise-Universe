import { TRPCError } from "@trpc/server";

/**
 * Stub for WhatsApp service - full implementation disabled pending schema updates.
 * This stub allows the messaging router to compile while WhatsApp features are unavailable.
 */

export async function sendAndRecordMessage(
  messageId: string,
  conversationId: string
): Promise<{ success: boolean; messageId: string; error?: string }> {
  throw new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "WhatsApp messaging is temporarily disabled. Please contact support.",
  });
}
