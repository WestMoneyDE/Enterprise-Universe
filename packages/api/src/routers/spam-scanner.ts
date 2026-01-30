// =============================================================================
// SPAM SCANNER ROUTER
// =============================================================================
// API endpoints for spam scanning HubSpot contacts

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { verifyEmail, VerificationResult } from "../services/email-verifier";
import { TRPCError } from "@trpc/server";

// =============================================================================
// TYPES
// =============================================================================

interface SpamCandidate {
  contactId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  reasons: string[];
  score: number;
  verificationResult?: VerificationResult;
}

interface ScanProgress {
  phase: "fetching" | "scanning" | "complete";
  current: number;
  total: number;
  spamFound: number;
  lastEmail?: string;
}

// Store scan progress in memory (for real-time updates)
const scanProgress: Map<string, ScanProgress> = new Map();

// =============================================================================
// SPAM DETECTION PATTERNS
// =============================================================================

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "guerrillamail.com", "10minutemail.com", "mailinator.com",
  "throwaway.email", "temp-mail.org", "fakeinbox.com", "trash-mail.com",
  "wegwerfmail.de", "einwegmail.de", "spamfree24.de", "muellmail.de",
  "temp.email", "tempmailo.com", "tempmail.ninja", "burnermail.io",
  "maildrop.cc", "mailsac.com", "mintemail.com", "mytemp.email",
  "trashmail.com", "trashmail.me", "trashmail.net", "yopmail.com",
]);

const SPAM_PATTERNS = [
  /^[a-z0-9]{20,}$/i,           // Very long random strings
  /^[0-9]{8,}$/,                 // Numbers only
  /^(test|dummy|fake|spam|noreply|no-reply|asdf|qwerty)[0-9]*$/i,
  /^[a-z]{2,3}[0-9]{6,}[a-z]{2,3}$/i, // Bot-like patterns
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function analyzeEmail(email: string): { isSpam: boolean; reasons: string[]; score: number } {
  const normalized = email.toLowerCase().trim();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return { isSpam: true, reasons: ["Invalid email format"], score: 100 };
  }

  const reasons: string[] = [];
  let score = 0;

  // Check disposable domain
  if (DISPOSABLE_DOMAINS.has(domain)) {
    reasons.push("Disposable domain");
    score += 50;
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(localPart)) {
      reasons.push("Spam pattern detected");
      score += 40;
      break;
    }
  }

  // Check test/demo patterns
  if (/test|demo|fake|sample/i.test(normalized)) {
    reasons.push("Test/demo email");
    score += 35;
  }

  // Check for excessive numbers
  const digits = (localPart.match(/\d/g) || []).length;
  if (localPart.length > 5 && digits > localPart.length * 0.5) {
    reasons.push("Too many numbers");
    score += 25;
  }

  // Check for random-looking strings
  if (/^[a-z0-9]{15,}$/.test(localPart) && !/[aeiou]{2}/i.test(localPart)) {
    reasons.push("Random character sequence");
    score += 30;
  }

  return {
    isSpam: reasons.length > 0,
    reasons,
    score: Math.min(score, 100),
  };
}

async function fetchHubSpotContacts(
  token: string,
  limit: number = 100,
  after?: string
): Promise<{ contacts: any[]; nextAfter?: string }> {
  const url = new URL("https://api.hubapi.com/crm/v3/objects/contacts");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("properties", "email,firstname,lastname,company,createdate");
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`HubSpot API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    contacts: data.results || [],
    nextAfter: data.paging?.next?.after,
  };
}

// =============================================================================
// ROUTER
// =============================================================================

export const spamScannerRouter = router({
  // Quick scan - sample of contacts
  quickScan: protectedProcedure
    .input(z.object({
      sampleSize: z.number().min(10).max(1000).default(100),
    }))
    .mutation(async ({ input }) => {
      const token = process.env.HUBSPOT_ACCESS_TOKEN;
      if (!token) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "HUBSPOT_ACCESS_TOKEN not configured" });
      }

      const { sampleSize } = input;
      const spamCandidates: SpamCandidate[] = [];
      let scanned = 0;
      let after: string | undefined;

      // Fetch and scan contacts
      while (scanned < sampleSize) {
        const batchSize = Math.min(100, sampleSize - scanned);
        const { contacts, nextAfter } = await fetchHubSpotContacts(token, batchSize, after);

        for (const contact of contacts) {
          const email = contact.properties?.email;
          if (!email) continue;

          const analysis = analyzeEmail(email);
          if (analysis.isSpam) {
            spamCandidates.push({
              contactId: contact.id,
              email,
              firstName: contact.properties?.firstname,
              lastName: contact.properties?.lastname,
              company: contact.properties?.company,
              reasons: analysis.reasons,
              score: analysis.score,
            });
          }
          scanned++;
        }

        after = nextAfter;
        if (!after || contacts.length === 0) break;
      }

      // Sort by spam score
      spamCandidates.sort((a, b) => b.score - a.score);

      return {
        scanned,
        spamCount: spamCandidates.length,
        cleanCount: scanned - spamCandidates.length,
        spamRate: ((spamCandidates.length / scanned) * 100).toFixed(1) + "%",
        topSpam: spamCandidates.slice(0, 20),
        allSpam: spamCandidates,
      };
    }),

  // Verify single email with full checks
  verifyEmail: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      fullCheck: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const quickAnalysis = analyzeEmail(input.email);

      let fullResult: VerificationResult | undefined;
      if (input.fullCheck) {
        fullResult = await verifyEmail(input.email, {
          checkMx: true,
          checkSmtp: false, // Skip SMTP for speed
        });
      }

      return {
        email: input.email,
        quickAnalysis,
        fullVerification: fullResult,
        recommendation: quickAnalysis.score >= 50 ? "reject" :
                        quickAnalysis.score >= 25 ? "review" : "accept",
      };
    }),

  // Start background full scan
  startFullScan: protectedProcedure
    .mutation(async () => {
      const scanId = `scan_${Date.now()}`;

      // Initialize progress
      scanProgress.set(scanId, {
        phase: "fetching",
        current: 0,
        total: 0,
        spamFound: 0,
      });

      // Start background scan (non-blocking)
      // In production, this would be a queue job
      setImmediate(async () => {
        try {
          const token = process.env.HUBSPOT_ACCESS_TOKEN;
          if (!token) return;

          // This is a placeholder - actual implementation would use
          // a proper job queue (BullMQ) for millions of contacts
          console.log(`[SpamScanner] Started full scan: ${scanId}`);

        } catch (error) {
          console.error(`[SpamScanner] Scan failed: ${scanId}`, error);
        }
      });

      return { scanId, message: "Full scan started in background" };
    }),

  // Get scan progress
  getScanProgress: protectedProcedure
    .input(z.object({ scanId: z.string() }))
    .query(({ input }) => {
      const progress = scanProgress.get(input.scanId);
      if (!progress) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scan not found" });
      }
      return progress;
    }),

  // Get spam statistics
  getStats: protectedProcedure.query(async () => {
    // This would query from database in production
    return {
      lastScanAt: null,
      totalScanned: 0,
      totalSpamFound: 0,
      spamRate: "0%",
      topSpamDomains: [],
      topSpamPatterns: [],
    };
  }),
});

// =============================================================================
// EXPORTS
// =============================================================================

export { analyzeEmail, DISPOSABLE_DOMAINS, SPAM_PATTERNS };
