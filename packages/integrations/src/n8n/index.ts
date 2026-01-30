// =============================================================================
// N8N INTEGRATION
// Trigger n8n workflows and monitor execution status
// =============================================================================

export interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
  webhookPath?: string;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: N8nNode[];
}

export interface N8nNode {
  name: string;
  type: string;
  position: [number, number];
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: "trigger" | "webhook" | "manual" | "retry";
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: "success" | "error" | "running" | "waiting";
  data?: {
    resultData?: {
      runData?: Record<string, unknown>;
    };
  };
}

export interface N8nWebhookResponse {
  success: boolean;
  executionId?: string;
  data?: Record<string, unknown>;
  error?: string;
}

// =============================================================================
// N8N INTEGRATION CLASS
// =============================================================================

export class N8nIntegration {
  private baseUrl: string;
  private apiKey?: string;
  private webhookPath: string;

  constructor(config: N8nConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.webhookPath = config.webhookPath || "/webhook";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Get all workflows
  async getWorkflows(): Promise<N8nWorkflow[]> {
    const response = await this.apiRequest("/workflows");
    return response.data || [];
  }

  // Get single workflow
  async getWorkflow(workflowId: string): Promise<N8nWorkflow | null> {
    try {
      const response = await this.apiRequest(`/workflows/${workflowId}`);
      return response;
    } catch {
      return null;
    }
  }

  // Activate/Deactivate workflow
  async setWorkflowActive(workflowId: string, active: boolean): Promise<boolean> {
    try {
      await this.apiRequest(`/workflows/${workflowId}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      return true;
    } catch {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Trigger workflow via webhook (production)
  async triggerWebhook(
    webhookPath: string,
    data: Record<string, unknown>,
    options?: { test?: boolean; waitForExecution?: boolean }
  ): Promise<N8nWebhookResponse> {
    const isTest = options?.test ?? false;
    const endpoint = isTest ? "/webhook-test" : this.webhookPath;
    const url = `${this.baseUrl}${endpoint}/${webhookPath}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const responseData = await response.json();

      return {
        success: true,
        executionId: responseData.executionId,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Trigger workflow by ID (requires API key)
  async triggerWorkflow(
    workflowId: string,
    data?: Record<string, unknown>
  ): Promise<N8nWebhookResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "API key required for workflow trigger by ID",
      };
    }

    try {
      const response = await this.apiRequest(`/workflows/${workflowId}/run`, {
        method: "POST",
        body: JSON.stringify({ data }),
      });

      return {
        success: true,
        executionId: response.executionId,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTION MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  // Get execution details
  async getExecution(executionId: string): Promise<N8nExecution | null> {
    try {
      const response = await this.apiRequest(`/executions/${executionId}`);
      return response;
    } catch {
      return null;
    }
  }

  // Get recent executions
  async getExecutions(options?: {
    workflowId?: string;
    status?: "success" | "error" | "running" | "waiting";
    limit?: number;
  }): Promise<N8nExecution[]> {
    const params = new URLSearchParams();
    if (options?.workflowId) params.append("workflowId", options.workflowId);
    if (options?.status) params.append("status", options.status);
    if (options?.limit) params.append("limit", String(options.limit));

    const queryString = params.toString();
    const response = await this.apiRequest(`/executions${queryString ? `?${queryString}` : ""}`);
    return response.data || [];
  }

  // Wait for execution to complete
  async waitForExecution(
    executionId: string,
    options?: { timeout?: number; pollInterval?: number }
  ): Promise<N8nExecution | null> {
    const timeout = options?.timeout || 60000;
    const pollInterval = options?.pollInterval || 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const execution = await this.getExecution(executionId);

      if (!execution) return null;

      if (execution.finished) {
        return execution;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  // Make API request to n8n
  private async apiRequest(
    endpoint: string,
    options?: { method?: string; body?: string }
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error("API key required for this operation");
    }

    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const response = await fetch(url, {
      method: options?.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": this.apiKey,
      },
      body: options?.body,
    });

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.apiKey) {
        await this.getWorkflows();
        return { success: true, message: "Connected to n8n API" };
      } else {
        // Test webhook endpoint
        const response = await fetch(`${this.baseUrl}${this.webhookPath}/health`, {
          method: "GET",
        });
        if (response.ok) {
          return { success: true, message: "n8n webhook endpoint reachable" };
        }
        return { success: false, message: "n8n webhook endpoint not reachable" };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

let instance: N8nIntegration | null = null;

export function getN8nIntegration(config?: N8nConfig): N8nIntegration {
  if (!instance && config) {
    instance = new N8nIntegration(config);
  }
  if (!instance) {
    // Try to get from environment
    const baseUrl = process.env.N8N_BASE_URL;
    if (!baseUrl) {
      throw new Error("N8N_BASE_URL not configured");
    }
    instance = new N8nIntegration({
      baseUrl,
      apiKey: process.env.N8N_API_KEY,
    });
  }
  return instance;
}

export function resetN8nIntegration(): void {
  instance = null;
}
