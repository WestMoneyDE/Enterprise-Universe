// PM2 Ecosystem Config - Auto Commission Service
// Führt den Deal-Finder und Email-Sender alle 15 Minuten aus

module.exports = {
  apps: [
    {
      name: 'auto-commission-service',
      script: '/home/administrator/nexus-command-center/scripts/auto-commission-service.mjs',
      cwd: '/home/administrator/nexus-command-center',
      interpreter: 'node',

      // Cron: Alle 15 Minuten
      cron_restart: '*/15 * * * *',

      // Sofort ausführen beim Start
      autorestart: false,

      // Environment
      env: {
        NODE_ENV: 'production',
        HUBSPOT_ACCESS_TOKEN: '${HUBSPOT_ACCESS_TOKEN}',
        MAIL_ENGINE_URL: 'http://localhost:3006',
      },

      // Logging
      log_file: '/home/administrator/nexus-command-center/logs/auto-commission-pm2.log',
      error_file: '/home/administrator/nexus-command-center/logs/auto-commission-error.log',
      out_file: '/home/administrator/nexus-command-center/logs/auto-commission-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Memory limit
      max_memory_restart: '256M',
    },
  ],
};
