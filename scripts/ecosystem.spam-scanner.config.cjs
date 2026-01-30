// PM2 Ecosystem Config - HubSpot Spam Scanner
// Einmaliger Hintergrund-Scan aller 15M+ Kontakte
// Start: pm2 start scripts/ecosystem.spam-scanner.config.cjs
// Status: pm2 logs hubspot-spam-scanner

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

if (!HUBSPOT_TOKEN) {
  console.error('HUBSPOT_ACCESS_TOKEN not set in environment');
  console.error('Please set it in ~/.bashrc and source it before starting PM2');
}

module.exports = {
  apps: [
    {
      name: 'hubspot-spam-scanner',
      script: '/home/administrator/nexus-command-center/scripts/hubspot-spam-scanner.mjs',
      cwd: '/home/administrator/nexus-command-center',
      interpreter: 'node',

      // Einmalige Ausführung (kein Restart)
      autorestart: false,
      max_restarts: 0,

      // Environment
      env: {
        NODE_ENV: 'production',
        HUBSPOT_ACCESS_TOKEN: HUBSPOT_TOKEN,
      },

      // Logging
      log_file: '/home/administrator/nexus-command-center/logs/spam-scanner-pm2.log',
      error_file: '/home/administrator/nexus-command-center/logs/spam-scanner-error.log',
      out_file: '/home/administrator/nexus-command-center/logs/spam-scanner-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // High memory limit for large dataset
      max_memory_restart: '1G',

      // Node.js options for large heap
      node_args: '--max-old-space-size=2048',
    },
  ],
};
