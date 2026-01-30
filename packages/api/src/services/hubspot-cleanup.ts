// =============================================================================
// HubSpot Spam Cleanup Service
// =============================================================================
// Scans HubSpot contacts for spam, generates reports, and handles batch deletion
// Uses email-verifier service for validation with Moderate rules

import {
  verifyEmail,
  isDisposableDomain,
  VerificationResult,
} from "./email-verifier";
import {
  HubSpotService,
  HubSpotContact,
  fetchAllContactsFromHubSpot,
} from "./hubspot";

// =============================================================================
// TYPES
// =============================================================================

export interface SpamCandidate {
  contactId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  createdAt?: string;
  spamReasons: string[];
  spamScore: number; // 0-100, higher = more likely spam
  verificationResult?: VerificationResult;
}

export interface SpamScanResult {
  totalScanned: number;
  spamCandidates: SpamCandidate[];
  cleanContacts: number;
  scanDuration: number; // in milliseconds
  scannedAt: Date;
}

export interface CleanupReport {
  reportId: string;
  generatedAt: Date;
  totalContacts: number;
  spamCount: number;
  spamPercentage: number;
  categorizedSpam: {
    randomPatterns: SpamCandidate[];
    disposableDomains: SpamCandidate[];
    invalidMx: SpamCandidate[];
    testPatterns: SpamCandidate[];
  };
  estimatedDeletionTime: number; // in seconds
  recommendations: string[];
}

export interface BatchDeleteResult {
  totalRequested: number;
  successfulDeletes: number;
  failedDeletes: number;
  errors: Array<{ contactId: string; error: string }>;
  duration: number; // in milliseconds
}

export interface ScanProgressCallback {
  (progress: {
    current: number;
    total: number;
    currentEmail?: string;
    phase: "fetching" | "scanning" | "complete";
  }): void;
}

export interface DeleteProgressCallback {
  (progress: {
    current: number;
    total: number;
    currentContactId?: string;
    successCount: number;
    failCount: number;
  }): void;
}

// =============================================================================
// MODERATE SPAM DETECTION PATTERNS
// =============================================================================

// Random number patterns (6+ consecutive digits)
const RANDOM_NUMBER_PATTERN = /[0-9]{6,}/;

// Test/fake email patterns
const TEST_PATTERNS = [
  /^test[@._]/i,
  /^fake[@._]/i,
  /^spam[@._]/i,
  /^dummy[@._]/i,
  /^sample[@._]/i,
  /^example[@._]/i,
  /^demo[@._]/i,
  /^testing[@._]/i,
  /^noreply[@._]/i,
  /^no-reply[@._]/i,
  /^donotreply[@._]/i,
  /^null[@._]/i,
  /^void[@._]/i,
  /^none[@._]/i,
  /^asdf[@._]/i,
  /^qwerty[@._]/i,
  /^admin[@._]test/i,
  /^user[@._]test/i,
  /[@._]test\.com$/i,
  /[@._]example\.com$/i,
  /[@._]fake\.com$/i,
  /[@._]spam\.com$/i,
];

// Random character sequences (letters + numbers in suspicious patterns)
const RANDOM_CHAR_PATTERNS = [
  /^[a-z]{2,3}[0-9]{6,}$/i, // ab123456
  /^[0-9]{6,}[a-z]{2,3}$/i, // 123456ab
  /^[a-z]{2,4}[0-9]{4,}[a-z]{2,4}$/i, // ab1234cd
  /^[a-z0-9]{20,}$/i, // very long random strings
  /^[0-9]+$/i, // numbers only
];

// =============================================================================
// SPAM DETECTION FUNCTIONS
// =============================================================================

function detectRandomNumberPattern(email: string): boolean {
  const localPart = email.split("@")[0];
  return RANDOM_NUMBER_PATTERN.test(localPart);
}

function detectTestPattern(email: string): boolean {
  const normalizedEmail = email.toLowerCase();
  return TEST_PATTERNS.some((pattern) => pattern.test(normalizedEmail));
}

function detectRandomCharPattern(email: string): boolean {
  const localPart = email.split("@")[0];
  return RANDOM_CHAR_PATTERNS.some((pattern) => pattern.test(localPart));
}

function calculateSpamScore(reasons: string[]): number {
  const weights: Record<string, number> = {
    "Disposable email domain": 40,
    "Invalid MX records": 35,
    "Test/fake email pattern": 30,
    "Random number pattern": 25,
    "Random character pattern": 20,
    "Low verification score": 15,
    "Spam pattern in email": 25,
  };

  let score = 0;
  for (const reason of reasons) {
    score += weights[reason] || 10;
  }

  return Math.min(score, 100);
}

// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================

export class HubSpotCleanupService {
  private hubspotService: HubSpotService;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.hubspotService = new HubSpotService({ accessToken });
  }

  // ---------------------------------------------------------------------------
  // SCAN FOR SPAM
  // ---------------------------------------------------------------------------

  /**
   * Scan HubSpot contacts and identify spam using Moderate rules:
   * - Random number patterns
   * - Disposable domains
   * - Invalid MX records
   * - Test patterns (test@, fake@, etc.)
   */
  async scanForSpam(
    onProgress?: ScanProgressCallback
  ): Promise<SpamScanResult> {
    const startTime = Date.now();
    const spamCandidates: SpamCandidate[] = [];

    // Phase 1: Fetch all contacts
    onProgress?.({
      current: 0,
      total: 0,
      phase: "fetching",
    });

    const { contacts, total } = await fetchAllContactsFromHubSpot(
      this.accessToken
    );

    console.log(`[HubSpot Cleanup] Fetched ${total} contacts for spam scan`);

    // Phase 2: Scan each contact
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const email = contact.properties.email;

      onProgress?.({
        current: i + 1,
        total: contacts.length,
        currentEmail: email,
        phase: "scanning",
      });

      if (!email) {
        // Contacts without email are suspicious but not necessarily spam
        continue;
      }

      const spamReasons: string[] = [];

      // Check 1: Disposable domain
      const domain = email.split("@")[1];
      if (domain && isDisposableDomain(domain)) {
        spamReasons.push("Disposable email domain");
      }

      // Check 2: Test/fake patterns
      if (detectTestPattern(email)) {
        spamReasons.push("Test/fake email pattern");
      }

      // Check 3: Random number patterns
      if (detectRandomNumberPattern(email)) {
        spamReasons.push("Random number pattern");
      }

      // Check 4: Random character patterns
      if (detectRandomCharPattern(email)) {
        spamReasons.push("Random character pattern");
      }

      // Check 5: Full email verification (includes MX check)
      let verificationResult: VerificationResult | undefined;
      try {
        verificationResult = await verifyEmail(email, {
          checkMx: true,
          checkSmtp: false, // Skip SMTP to speed up scanning
          timeout: 3000,
        });

        if (!verificationResult.checks.mxRecord) {
          spamReasons.push("Invalid MX records");
        }

        if (!verificationResult.checks.pattern) {
          spamReasons.push("Spam pattern in email");
        }

        if (verificationResult.score < 40) {
          spamReasons.push("Low verification score");
        }
      } catch (error) {
        console.warn(
          `[HubSpot Cleanup] Verification failed for ${email}:`,
          error
        );
      }

      // If any spam indicators found, add to candidates
      if (spamReasons.length > 0) {
        const spamScore = calculateSpamScore(spamReasons);

        spamCandidates.push({
          contactId: contact.id,
          email,
          firstName: contact.properties.firstname,
          lastName: contact.properties.lastname,
          company: contact.properties.company,
          createdAt: contact.createdAt,
          spamReasons,
          spamScore,
          verificationResult,
        });
      }

      // Small delay to avoid rate limiting on email verification
      if (i < contacts.length - 1 && i % 10 === 0) {
        await this.delay(50);
      }
    }

    // Sort by spam score (highest first)
    spamCandidates.sort((a, b) => b.spamScore - a.spamScore);

    onProgress?.({
      current: contacts.length,
      total: contacts.length,
      phase: "complete",
    });

    const scanDuration = Date.now() - startTime;

    console.log(
      `[HubSpot Cleanup] Scan complete: ${spamCandidates.length} spam candidates found in ${scanDuration}ms`
    );

    return {
      totalScanned: contacts.length,
      spamCandidates,
      cleanContacts: contacts.length - spamCandidates.length,
      scanDuration,
      scannedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // GENERATE CLEANUP REPORT
  // ---------------------------------------------------------------------------

  /**
   * Generate a detailed report of spam candidates for review (without deleting)
   */
  generateCleanupReport(scanResult: SpamScanResult): CleanupReport {
    const reportId = `cleanup-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Categorize spam by type
    const categorizedSpam = {
      randomPatterns: [] as SpamCandidate[],
      disposableDomains: [] as SpamCandidate[],
      invalidMx: [] as SpamCandidate[],
      testPatterns: [] as SpamCandidate[],
    };

    for (const candidate of scanResult.spamCandidates) {
      if (
        candidate.spamReasons.includes("Random number pattern") ||
        candidate.spamReasons.includes("Random character pattern")
      ) {
        categorizedSpam.randomPatterns.push(candidate);
      }

      if (candidate.spamReasons.includes("Disposable email domain")) {
        categorizedSpam.disposableDomains.push(candidate);
      }

      if (candidate.spamReasons.includes("Invalid MX records")) {
        categorizedSpam.invalidMx.push(candidate);
      }

      if (candidate.spamReasons.includes("Test/fake email pattern")) {
        categorizedSpam.testPatterns.push(candidate);
      }
    }

    // Calculate estimated deletion time (100 per batch, 300ms delay)
    const batchCount = Math.ceil(scanResult.spamCandidates.length / 100);
    const estimatedDeletionTime = batchCount * 0.3 + scanResult.spamCandidates.length * 0.05;

    // Generate recommendations
    const recommendations: string[] = [];

    if (categorizedSpam.disposableDomains.length > 10) {
      recommendations.push(
        `Consider blocking disposable email domains at signup. Found ${categorizedSpam.disposableDomains.length} contacts with disposable domains.`
      );
    }

    if (categorizedSpam.testPatterns.length > 5) {
      recommendations.push(
        `Review form validation to prevent test/fake emails. Found ${categorizedSpam.testPatterns.length} test email patterns.`
      );
    }

    if (categorizedSpam.invalidMx.length > 20) {
      recommendations.push(
        `Implement MX validation on email capture forms. Found ${categorizedSpam.invalidMx.length} contacts with invalid MX records.`
      );
    }

    const spamPercentage =
      scanResult.totalScanned > 0
        ? (scanResult.spamCandidates.length / scanResult.totalScanned) * 100
        : 0;

    if (spamPercentage > 20) {
      recommendations.push(
        `High spam rate detected (${spamPercentage.toFixed(1)}%). Consider implementing CAPTCHA or honeypot fields on forms.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Spam levels appear manageable. Continue monitoring regularly."
      );
    }

    const report: CleanupReport = {
      reportId,
      generatedAt: new Date(),
      totalContacts: scanResult.totalScanned,
      spamCount: scanResult.spamCandidates.length,
      spamPercentage,
      categorizedSpam,
      estimatedDeletionTime,
      recommendations,
    };

    console.log(
      `[HubSpot Cleanup] Report generated: ${report.reportId} - ${report.spamCount} spam candidates (${report.spamPercentage.toFixed(1)}%)`
    );

    return report;
  }

  // ---------------------------------------------------------------------------
  // BATCH DELETE CONTACTS
  // ---------------------------------------------------------------------------

  /**
   * Delete confirmed spam contacts with rate limiting
   * Processes 100 contacts per batch with 300ms delay between batches
   */
  async batchDeleteContacts(
    contactIds: string[],
    onProgress?: DeleteProgressCallback
  ): Promise<BatchDeleteResult> {
    const startTime = Date.now();
    const BATCH_SIZE = 100;
    const BATCH_DELAY_MS = 300;

    let successfulDeletes = 0;
    let failedDeletes = 0;
    const errors: Array<{ contactId: string; error: string }> = [];

    console.log(
      `[HubSpot Cleanup] Starting batch delete of ${contactIds.length} contacts`
    );

    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];

      onProgress?.({
        current: i + 1,
        total: contactIds.length,
        currentContactId: contactId,
        successCount: successfulDeletes,
        failCount: failedDeletes,
      });

      try {
        await this.hubspotService.deleteContact(contactId);
        successfulDeletes++;
      } catch (error) {
        failedDeletes++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ contactId, error: errorMessage });
        console.warn(
          `[HubSpot Cleanup] Failed to delete contact ${contactId}: ${errorMessage}`
        );
      }

      // Apply rate limiting: delay after each batch
      if ((i + 1) % BATCH_SIZE === 0 && i < contactIds.length - 1) {
        console.log(
          `[HubSpot Cleanup] Batch ${Math.floor(i / BATCH_SIZE) + 1} complete, waiting ${BATCH_DELAY_MS}ms...`
        );
        await this.delay(BATCH_DELAY_MS);
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `[HubSpot Cleanup] Batch delete complete: ${successfulDeletes} success, ${failedDeletes} failed in ${duration}ms`
    );

    return {
      totalRequested: contactIds.length,
      successfulDeletes,
      failedDeletes,
      errors,
      duration,
    };
  }

  // ---------------------------------------------------------------------------
  // CONVENIENCE METHODS
  // ---------------------------------------------------------------------------

  /**
   * Get contacts by spam score threshold
   */
  filterBySpamScore(
    candidates: SpamCandidate[],
    minScore: number
  ): SpamCandidate[] {
    return candidates.filter((c) => c.spamScore >= minScore);
  }

  /**
   * Get contacts by specific spam reason
   */
  filterByReason(
    candidates: SpamCandidate[],
    reason: string
  ): SpamCandidate[] {
    return candidates.filter((c) => c.spamReasons.includes(reason));
  }

  /**
   * Get contact IDs from spam candidates for deletion
   */
  getContactIds(candidates: SpamCandidate[]): string[] {
    return candidates.map((c) => c.contactId);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a HubSpot cleanup service instance
 */
export function createHubSpotCleanupService(
  accessToken?: string
): HubSpotCleanupService {
  const token = accessToken || process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "HubSpot access token is required. Set HUBSPOT_ACCESS_TOKEN environment variable or pass token directly."
    );
  }

  return new HubSpotCleanupService(token);
}

// =============================================================================
// STANDALONE FUNCTIONS
// =============================================================================

/**
 * Quick scan and report generation
 */
export async function quickSpamScan(
  accessToken?: string,
  onProgress?: ScanProgressCallback
): Promise<{ scanResult: SpamScanResult; report: CleanupReport }> {
  const service = createHubSpotCleanupService(accessToken);
  const scanResult = await service.scanForSpam(onProgress);
  const report = service.generateCleanupReport(scanResult);

  return { scanResult, report };
}

/**
 * Full cleanup workflow: scan, report, and optionally delete
 */
export async function runCleanupWorkflow(
  options: {
    accessToken?: string;
    minSpamScore?: number;
    autoDelete?: boolean;
    onScanProgress?: ScanProgressCallback;
    onDeleteProgress?: DeleteProgressCallback;
  } = {}
): Promise<{
  scanResult: SpamScanResult;
  report: CleanupReport;
  deleteResult?: BatchDeleteResult;
}> {
  const {
    accessToken,
    minSpamScore = 50,
    autoDelete = false,
    onScanProgress,
    onDeleteProgress,
  } = options;

  const service = createHubSpotCleanupService(accessToken);

  // Step 1: Scan
  console.log("[HubSpot Cleanup] Starting spam scan...");
  const scanResult = await service.scanForSpam(onScanProgress);

  // Step 2: Generate report
  console.log("[HubSpot Cleanup] Generating cleanup report...");
  const report = service.generateCleanupReport(scanResult);

  // Step 3: Optionally delete high-confidence spam
  let deleteResult: BatchDeleteResult | undefined;

  if (autoDelete) {
    const toDelete = service.filterBySpamScore(
      scanResult.spamCandidates,
      minSpamScore
    );

    if (toDelete.length > 0) {
      console.log(
        `[HubSpot Cleanup] Auto-deleting ${toDelete.length} contacts with spam score >= ${minSpamScore}...`
      );
      const contactIds = service.getContactIds(toDelete);
      deleteResult = await service.batchDeleteContacts(
        contactIds,
        onDeleteProgress
      );
    } else {
      console.log(
        `[HubSpot Cleanup] No contacts meet the minimum spam score threshold of ${minSpamScore}`
      );
    }
  }

  return { scanResult, report, deleteResult };
}
