// =============================================================================
// Email Validator Service
// =============================================================================
// Prüft E-Mail-Adressen auf Spam-Muster und Legitimität
// Verhindert das Versenden von Won Deal E-Mails an Spam-Adressen

// Known spam patterns
const SPAM_PATTERNS = [
  // Random character sequences
  /^[a-z0-9]{20,}@/i,
  // Numbers only local part
  /^[0-9]+@/,
  // Excessive numbers mixed with letters (like auto-generated)
  /^[a-z]+[0-9]{5,}@/i,
  // Test/dummy patterns
  /^(test|dummy|fake|spam|noreply|no-reply|donotreply)[\d]*@/i,
  // Disposable email domains
  /@(tempmail|guerrillamail|10minutemail|throwaway|mailinator|yopmail|sharklasers|guerrillamail|fakeinbox)/i,
  // Generic placeholder patterns
  /^(user|customer|client|contact)[0-9]+@/i,
  // Bot-like patterns
  /^[a-z]{2,3}[0-9]{6,}[a-z]{2,3}@/i,
];

// Suspicious domain patterns (low-quality or free email for business)
const SUSPICIOUS_DOMAINS = [
  // Free email providers (not necessarily spam, but flag for review)
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'mail.com', 'gmx.de', 'web.de', 't-online.de', 'freenet.de',
];

// Known spam/disposable domains
const BLOCKED_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email',
  'mailinator.com', 'yopmail.com', 'sharklasers.com', 'fakeinbox.com',
  'temp-mail.org', 'tempail.com', 'dispostable.com', 'mailnesia.com',
  'getnada.com', 'mohmal.com', 'emailondeck.com',
];

// Business domain patterns (likely legitimate)
const BUSINESS_PATTERNS = [
  /\.(de|at|ch|com|net|org|eu|biz|info)$/i,
  /^[a-z]+\.[a-z]+@[a-z]+\.(de|at|ch|com)$/i, // firstname.lastname@company.tld
];

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  isSpam: boolean;
  isSuspicious: boolean;
  isBusinessEmail: boolean;
  spamScore: number; // 0-100, higher = more likely spam
  issues: string[];
  recommendation: 'send' | 'review' | 'block';
}

/**
 * Validates an email address for spam patterns
 */
export function validateEmail(email: string): EmailValidationResult {
  const normalizedEmail = email.toLowerCase().trim();
  const issues: string[] = [];
  let spamScore = 0;

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      email: normalizedEmail,
      isValid: false,
      isSpam: true,
      isSuspicious: true,
      isBusinessEmail: false,
      spamScore: 100,
      issues: ['Ungültiges E-Mail-Format'],
      recommendation: 'block',
    };
  }

  const [localPart, domain] = normalizedEmail.split('@');

  // Check blocked domains
  if (BLOCKED_DOMAINS.some(d => domain.includes(d))) {
    issues.push(`Einweg-E-Mail-Domain: ${domain}`);
    spamScore += 80;
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(normalizedEmail)) {
      issues.push('Spam-Muster erkannt');
      spamScore += 40;
      break;
    }
  }

  // Check local part length (very long = suspicious)
  if (localPart.length > 30) {
    issues.push('Ungewöhnlich langer Benutzername');
    spamScore += 20;
  }

  // Check for excessive numbers
  const numberCount = (localPart.match(/\d/g) || []).length;
  if (numberCount > 5) {
    issues.push('Viele Zahlen im Benutzernamen');
    spamScore += 15;
  }

  // Check for suspicious free email domains
  const isFreeEmail = SUSPICIOUS_DOMAINS.includes(domain);
  if (isFreeEmail) {
    issues.push(`Kostenlose E-Mail-Domain: ${domain}`);
    spamScore += 10;
  }

  // Check if it looks like a business email
  const hasBusinessPattern = /^[a-z]+(\.[a-z]+)?@[a-z0-9-]+\.[a-z]{2,}$/i.test(normalizedEmail);
  const isBusinessEmail = !isFreeEmail && hasBusinessPattern;

  if (isBusinessEmail) {
    spamScore = Math.max(0, spamScore - 20);
  }

  // Determine recommendation
  let recommendation: 'send' | 'review' | 'block';
  if (spamScore >= 60) {
    recommendation = 'block';
  } else if (spamScore >= 30 || issues.length > 0) {
    recommendation = 'review';
  } else {
    recommendation = 'send';
  }

  return {
    email: normalizedEmail,
    isValid: true,
    isSpam: spamScore >= 60,
    isSuspicious: spamScore >= 30,
    isBusinessEmail,
    spamScore: Math.min(100, spamScore),
    issues,
    recommendation,
  };
}

/**
 * Batch validate multiple emails
 */
export function validateEmails(emails: string[]): {
  results: EmailValidationResult[];
  summary: {
    total: number;
    valid: number;
    spam: number;
    suspicious: number;
    safe: number;
  };
} {
  const results = emails.map(validateEmail);

  const summary = {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    spam: results.filter(r => r.isSpam).length,
    suspicious: results.filter(r => r.isSuspicious && !r.isSpam).length,
    safe: results.filter(r => r.recommendation === 'send').length,
  };

  return { results, summary };
}

/**
 * Quick check if email should be blocked
 */
export function shouldBlockEmail(email: string): boolean {
  const result = validateEmail(email);
  return result.recommendation === 'block';
}

/**
 * Get spam indicators for display
 */
export function getSpamIndicators(email: string): {
  icon: '🟢' | '🟡' | '🔴';
  label: string;
  color: 'green' | 'yellow' | 'red';
} {
  const result = validateEmail(email);

  if (result.recommendation === 'send') {
    return { icon: '🟢', label: 'Sicher', color: 'green' };
  } else if (result.recommendation === 'review') {
    return { icon: '🟡', label: 'Prüfen', color: 'yellow' };
  } else {
    return { icon: '🔴', label: 'Spam', color: 'red' };
  }
}
