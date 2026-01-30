import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// =============================================================================
// SECURITY ROUTER
// System security monitoring - SSH status, auth events, active sessions
// =============================================================================

export interface SSHSession {
  user: string;
  ip: string;
  loginTime: string;
  tty: string;
}

export interface SecurityEvent {
  id: string;
  type: "success" | "failure" | "blocked" | "warning";
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  severity: "critical" | "high" | "medium" | "low";
}

async function runCommand(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 5000 });
    return stdout.trim();
  } catch (error) {
    console.error(`Command failed: ${cmd}`, error);
    return "";
  }
}

export const securityRouter = createTRPCRouter({
  // ===========================================================================
  // SSH SERVICE STATUS
  // ===========================================================================

  getSSHStatus: publicProcedure.query(async () => {
    try {
      // Check if SSH service is running
      const serviceStatus = await runCommand("systemctl is-active sshd 2>/dev/null || systemctl is-active ssh 2>/dev/null");
      const isRunning = serviceStatus === "active";

      // Get SSH port
      const sshPort = await runCommand("grep -E '^Port' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}'");
      const port = sshPort || "22";

      // Get SSH config info
      const passwordAuth = await runCommand("grep -E '^PasswordAuthentication' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}'");
      const rootLogin = await runCommand("grep -E '^PermitRootLogin' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}'");
      const pubkeyAuth = await runCommand("grep -E '^PubkeyAuthentication' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}'");

      // Get uptime of SSH service
      const uptimeOutput = await runCommand("systemctl show sshd --property=ActiveEnterTimestamp 2>/dev/null || systemctl show ssh --property=ActiveEnterTimestamp 2>/dev/null");
      const uptimeMatch = uptimeOutput.match(/ActiveEnterTimestamp=(.+)/);
      const uptimeSince = uptimeMatch ? new Date(uptimeMatch[1]) : null;

      return {
        success: true,
        data: {
          isRunning,
          port,
          config: {
            passwordAuth: passwordAuth?.toLowerCase() !== "no",
            rootLogin: rootLogin?.toLowerCase() !== "no" && rootLogin?.toLowerCase() !== "prohibit-password",
            pubkeyAuth: pubkeyAuth?.toLowerCase() !== "no",
          },
          uptimeSince,
          uptime: uptimeSince ? Math.floor((Date.now() - uptimeSince.getTime()) / 1000) : null,
        },
      };
    } catch (error) {
      console.error("[Security] SSH status error:", error);
      return {
        success: false,
        error: String(error),
        data: null,
      };
    }
  }),

  // ===========================================================================
  // ACTIVE SSH SESSIONS
  // ===========================================================================

  getActiveSessions: publicProcedure.query(async () => {
    try {
      // Get active SSH sessions using 'who' command
      const whoOutput = await runCommand("who 2>/dev/null");

      const sessions: SSHSession[] = [];

      if (whoOutput) {
        const lines = whoOutput.split("\n").filter(Boolean);
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const user = parts[0];
            const tty = parts[1];
            const loginTime = `${parts[2]} ${parts[3]}`;
            // IP is in parentheses at the end
            const ipMatch = line.match(/\(([^)]+)\)/);
            const ip = ipMatch ? ipMatch[1] : "local";

            sessions.push({ user, ip, loginTime, tty });
          }
        }
      }

      // Get additional info from 'ss' for SSH connections
      const ssOutput = await runCommand("ss -tn state established '( dport = :22 or sport = :22 )' 2>/dev/null");
      const connectionCount = ssOutput ? ssOutput.split("\n").filter(l => l.includes(":22")).length : 0;

      return {
        success: true,
        data: {
          sessions,
          totalConnections: connectionCount,
          activeUsers: [...new Set(sessions.map(s => s.user))].length,
        },
      };
    } catch (error) {
      console.error("[Security] Active sessions error:", error);
      return {
        success: false,
        error: String(error),
        data: { sessions: [], totalConnections: 0, activeUsers: 0 },
      };
    }
  }),

  // ===========================================================================
  // FAILED LOGIN ATTEMPTS
  // ===========================================================================

  getFailedLogins: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      try {
        // Get failed SSH login attempts from journalctl
        const failedLogins = await runCommand(
          `journalctl -u sshd -u ssh --since "24 hours ago" --no-pager 2>/dev/null | grep -i "failed\\|invalid\\|refused" | tail -${input.limit}`
        );

        const events: SecurityEvent[] = [];

        if (failedLogins) {
          const lines = failedLogins.split("\n").filter(Boolean);

          lines.forEach((line, index) => {
            const ipMatch = line.match(/from\s+(\d+\.\d+\.\d+\.\d+)/i);
            const userMatch = line.match(/user\s+(\S+)/i) || line.match(/for\s+(\S+)/i);
            const dateMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);

            const ip = ipMatch ? ipMatch[1] : "unknown";
            const user = userMatch ? userMatch[1] : "unknown";
            const timestamp = dateMatch ? new Date(dateMatch[1] + " " + new Date().getFullYear()) : new Date();

            const isInvalid = line.toLowerCase().includes("invalid");

            events.push({
              id: `fail-${index}`,
              type: "failure",
              title: isInvalid ? "Invalid User Attempt" : "Failed Login",
              description: `${user}@${ip}`,
              source: "SSH-AUTH",
              timestamp,
              severity: isInvalid ? "medium" : "high",
            });
          });
        }

        // Count total failed attempts in last 24h
        const countOutput = await runCommand(
          `journalctl -u sshd -u ssh --since "24 hours ago" --no-pager 2>/dev/null | grep -ci "failed\\|invalid\\|refused" || echo 0`
        );
        const totalCount = parseInt(countOutput) || 0;

        // Get unique blocked IPs (if fail2ban is installed)
        const fail2banOutput = await runCommand("fail2ban-client status sshd 2>/dev/null | grep 'Banned IP' || echo ''");
        const bannedIPs = fail2banOutput.match(/\d+\.\d+\.\d+\.\d+/g) || [];

        return {
          success: true,
          data: {
            events: events.reverse(),
            totalFailedLast24h: totalCount,
            bannedIPs,
            bannedCount: bannedIPs.length,
          },
        };
      } catch (error) {
        console.error("[Security] Failed logins error:", error);
        return {
          success: false,
          error: String(error),
          data: { events: [], totalFailedLast24h: 0, bannedIPs: [], bannedCount: 0 },
        };
      }
    }),

  // ===========================================================================
  // SUCCESSFUL LOGINS
  // ===========================================================================

  getSuccessfulLogins: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      try {
        // Get successful SSH logins
        const successfulLogins = await runCommand(
          `journalctl -u sshd -u ssh --since "7 days ago" --no-pager 2>/dev/null | grep -i "accepted" | tail -${input.limit}`
        );

        const events: SecurityEvent[] = [];

        if (successfulLogins) {
          const lines = successfulLogins.split("\n").filter(Boolean);

          lines.forEach((line, index) => {
            const ipMatch = line.match(/from\s+(\d+\.\d+\.\d+\.\d+)/i);
            const userMatch = line.match(/for\s+(\S+)/i);
            const methodMatch = line.match(/Accepted\s+(\w+)/i);
            const dateMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);

            const ip = ipMatch ? ipMatch[1] : "unknown";
            const user = userMatch ? userMatch[1] : "unknown";
            const method = methodMatch ? methodMatch[1] : "unknown";
            const timestamp = dateMatch ? new Date(dateMatch[1] + " " + new Date().getFullYear()) : new Date();

            events.push({
              id: `success-${index}`,
              type: "success",
              title: `${method.toUpperCase()} Login`,
              description: `${user}@${ip}`,
              source: "SSH-AUTH",
              timestamp,
              severity: "low",
            });
          });
        }

        return {
          success: true,
          data: {
            events: events.reverse(),
          },
        };
      } catch (error) {
        console.error("[Security] Successful logins error:", error);
        return {
          success: false,
          error: String(error),
          data: { events: [] },
        };
      }
    }),

  // ===========================================================================
  // SECURITY OVERVIEW
  // ===========================================================================

  getSecurityOverview: publicProcedure.query(async () => {
    try {
      // SSH service status
      const sshStatus = await runCommand("systemctl is-active sshd 2>/dev/null || systemctl is-active ssh 2>/dev/null");

      // Failed logins last 24h
      const failedCount = await runCommand(
        `journalctl -u sshd -u ssh --since "24 hours ago" --no-pager 2>/dev/null | grep -ci "failed\\|invalid" || echo 0`
      );

      // Successful logins last 24h
      const successCount = await runCommand(
        `journalctl -u sshd -u ssh --since "24 hours ago" --no-pager 2>/dev/null | grep -ci "accepted" || echo 0`
      );

      // Active connections
      const activeConns = await runCommand("ss -tn state established '( dport = :22 or sport = :22 )' 2>/dev/null | wc -l");

      // System uptime
      const uptime = await runCommand("uptime -p 2>/dev/null || uptime");

      // Last system boot
      const lastBoot = await runCommand("who -b 2>/dev/null | awk '{print $3, $4}'");

      // Check if firewall is active
      const ufwStatus = await runCommand("ufw status 2>/dev/null | head -1");
      const firewallActive = ufwStatus.includes("active");

      // Calculate security score
      const sshRunning = sshStatus === "active";
      const lowFailures = parseInt(failedCount) < 50;
      const hasSuccessfulLogins = parseInt(successCount) > 0;

      let securityScore = 100;
      if (!sshRunning) securityScore -= 30;
      if (!lowFailures) securityScore -= 20;
      if (!firewallActive) securityScore -= 15;
      if (parseInt(failedCount) > 100) securityScore -= 15;

      return {
        success: true,
        data: {
          sshStatus: sshRunning ? "online" : "offline",
          failedLoginsLast24h: parseInt(failedCount) || 0,
          successfulLoginsLast24h: parseInt(successCount) || 0,
          activeConnections: Math.max(0, (parseInt(activeConns) || 1) - 1), // Subtract header line
          systemUptime: uptime,
          lastBoot,
          firewallActive,
          securityScore: Math.max(0, securityScore),
        },
      };
    } catch (error) {
      console.error("[Security] Overview error:", error);
      return {
        success: false,
        error: String(error),
        data: null,
      };
    }
  }),
});
