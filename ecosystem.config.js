// =============================================================================
// PM2 Ecosystem Configuration - Nexus Command Center
// =============================================================================

module.exports = {
  apps: [
    // =========================================================================
    // MAIN WEB APPLICATION
    // =========================================================================
    {
      name: "nexus-web",
      cwd: "/home/administrator/nexus-command-center/apps/web",
      script: "node_modules/.bin/next",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Process management
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      // Logging
      log_file: "/home/administrator/logs/nexus-web.log",
      error_file: "/home/administrator/logs/nexus-web-error.log",
      out_file: "/home/administrator/logs/nexus-web-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
    },

    // =========================================================================
    // QUEUE WORKERS
    // =========================================================================
    {
      name: "nexus-workers",
      cwd: "/home/administrator/nexus-command-center/packages/queue",
      script: "node_modules/.bin/tsx",
      args: "src/workers/index.ts",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        REDIS_URL: "redis://localhost:6379",
      },
      // Process management
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      // Logging
      log_file: "/home/administrator/logs/nexus-workers.log",
      error_file: "/home/administrator/logs/nexus-workers-error.log",
      out_file: "/home/administrator/logs/nexus-workers-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Restart policy
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
    },

    // =========================================================================
    // SCHEDULER SERVICE
    // =========================================================================
    {
      name: "nexus-scheduler",
      cwd: "/home/administrator/nexus-command-center/packages/queue",
      script: "node_modules/.bin/tsx",
      args: "src/scheduler/index.ts",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        REDIS_URL: "redis://localhost:6379",
      },
      // Process management
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",

      // Logging
      log_file: "/home/administrator/logs/nexus-scheduler.log",
      error_file: "/home/administrator/logs/nexus-scheduler-error.log",
      out_file: "/home/administrator/logs/nexus-scheduler-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Restart policy
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
