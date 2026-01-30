// PM2 Ecosystem Config - Auto Commission Service
// Führt den Deal-Finder und Email-Sender alle 15 Minuten aus

// Load environment variables from shell
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!HUBSPOT_TOKEN || !STRIPE_KEY) {
  console.error('Required environment variables not set:');
  if (!HUBSPOT_TOKEN) console.error('  - HUBSPOT_ACCESS_TOKEN');
  if (!STRIPE_KEY) console.error('  - STRIPE_SECRET_KEY');
  console.error('Please set them in ~/.bashrc and source it before starting PM2');
}

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

      // Environment - pass actual values from shell env
      env: {
        NODE_ENV: 'production',
        HUBSPOT_ACCESS_TOKEN: HUBSPOT_TOKEN,
        STRIPE_SECRET_KEY: STRIPE_KEY,
        MAIL_ENGINE_URL: process.env.MAIL_ENGINE_URL || 'http://localhost:3006',
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
