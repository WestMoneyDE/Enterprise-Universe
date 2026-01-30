// =============================================================================
// Mail Controller Service
// =============================================================================
// Prüft und kontrolliert das Mail-System vor dem Versenden von Won Deals
// und Bauherren-Pass E-Mails.

const MAIL_ENGINE_URL = process.env.MAIL_ENGINE_URL || "http://localhost:3006";

export interface MailTestResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  timestamp: Date;
  latencyMs: number;
}

export interface MailSystemStatus {
  isOnline: boolean;
  lastCheck: Date;
  lastSuccessfulSend?: Date;
  consecutiveFailures: number;
  averageLatencyMs: number;
  recentTests: MailTestResult[];
}

// In-memory status tracking
let mailStatus: MailSystemStatus = {
  isOnline: false,
  lastCheck: new Date(0),
  consecutiveFailures: 0,
  averageLatencyMs: 0,
  recentTests: [],
};

/**
 * Prüft ob die Mail-Engine erreichbar ist
 */
export async function checkMailEngineHealth(): Promise<{
  online: boolean;
  endpoint: string;
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    const response = await fetch(`${MAIL_ENGINE_URL}/api/send`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const latencyMs = Date.now() - start;
    const online = response.ok;

    return {
      online,
      endpoint: `${MAIL_ENGINE_URL}/api/send`,
      latencyMs,
    };
  } catch (error) {
    return {
      online: false,
      endpoint: `${MAIL_ENGINE_URL}/api/send`,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Sendet eine Test-E-Mail um das System zu verifizieren
 */
export async function sendTestEmail(
  to: string,
  source: string = "mail_controller_test"
): Promise<MailTestResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${MAIL_ENGINE_URL}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject: `[Mail-Kontrolleur] System-Test ${new Date().toLocaleString("de-DE")}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #00ff88;">Mail-System Test</h2>
            <p>Diese E-Mail bestätigt, dass das Mail-System funktioniert.</p>
            <p><strong>Zeitstempel:</strong> ${new Date().toLocaleString("de-DE")}</p>
            <p><strong>Quelle:</strong> ${source}</p>
            <hr style="border-color: #333;">
            <p style="color: #666; font-size: 12px;">Enterprise Universe - Mail Controller</p>
          </div>
        `,
        text: `Mail-System Test - ${new Date().toLocaleString("de-DE")}`,
        source,
      }),
    });

    const latencyMs = Date.now() - start;
    const data = await response.json();

    const result: MailTestResult = {
      success: data.success === true,
      messageId: data.messageId,
      provider: data.provider,
      error: data.error,
      timestamp: new Date(),
      latencyMs,
    };

    // Update status
    updateStatus(result);

    return result;
  } catch (error) {
    const latencyMs = Date.now() - start;
    const result: MailTestResult = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
      latencyMs,
    };

    updateStatus(result);
    return result;
  }
}

/**
 * Sendet eine Won Deal E-Mail mit vorheriger Systemprüfung
 */
export async function sendWonDealEmail(params: {
  to: string;
  dealName: string;
  dealValue: number;
  commission: number;
  contactName: string;
  tierName: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  systemCheckPassed: boolean;
}> {
  // Erst System prüfen
  const health = await checkMailEngineHealth();
  if (!health.online) {
    return {
      success: false,
      error: "Mail-System ist offline",
      systemCheckPassed: false,
    };
  }

  try {
    const response = await fetch(`${MAIL_ENGINE_URL}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.to,
        subject: `Herzlichen Glückwunsch! Deal gewonnen: ${params.dealName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); color: #fff;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h1 style="color: #00ff88; text-align: center;">DEAL GEWONNEN!</h1>

              <div style="background: rgba(0,255,136,0.1); border: 1px solid #00ff88; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #fff; margin-top: 0;">${params.dealName}</h2>
                <p><strong>Kontakt:</strong> ${params.contactName}</p>
                <p><strong>Deal-Wert:</strong> €${params.dealValue.toLocaleString("de-DE")}</p>
                <p style="color: #00ff88; font-size: 24px;"><strong>Ihre Provision:</strong> €${params.commission.toLocaleString("de-DE")}</p>
              </div>

              <div style="text-align: center; padding: 20px;">
                <span style="background: linear-gradient(90deg, #FFD700, #FFA500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 18px; font-weight: bold;">
                  ${params.tierName}
                </span>
              </div>

              <hr style="border-color: #333;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                Bauherren-Pass | Enterprise Universe
              </p>
            </div>
          </div>
        `,
        text: `Deal gewonnen: ${params.dealName}\nWert: €${params.dealValue}\nProvision: €${params.commission}`,
        source: "bauherren_pass_won_deal",
        external_id: `won_deal_${Date.now()}`,
      }),
    });

    const data = await response.json();

    return {
      success: data.success === true,
      messageId: data.messageId,
      error: data.error,
      systemCheckPassed: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      systemCheckPassed: true,
    };
  }
}

/**
 * Holt den aktuellen Mail-System Status
 */
export function getMailSystemStatus(): MailSystemStatus {
  return { ...mailStatus };
}

/**
 * Aktualisiert den internen Status nach einem Test
 */
function updateStatus(result: MailTestResult) {
  mailStatus.lastCheck = new Date();

  if (result.success) {
    mailStatus.isOnline = true;
    mailStatus.lastSuccessfulSend = new Date();
    mailStatus.consecutiveFailures = 0;
  } else {
    mailStatus.consecutiveFailures++;
    if (mailStatus.consecutiveFailures >= 3) {
      mailStatus.isOnline = false;
    }
  }

  // Keep last 10 tests
  mailStatus.recentTests = [result, ...mailStatus.recentTests].slice(0, 10);

  // Calculate average latency from successful tests
  const successfulTests = mailStatus.recentTests.filter(t => t.success);
  if (successfulTests.length > 0) {
    mailStatus.averageLatencyMs = Math.round(
      successfulTests.reduce((sum, t) => sum + t.latencyMs, 0) / successfulTests.length
    );
  }
}
