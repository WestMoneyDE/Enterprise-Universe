#!/bin/bash
#═══════════════════════════════════════════════════════════════
# ENTERPRISE UNIVERSE v99.999 - DEPLOYMENT
# Server: 81.88.26.204 (one.com Cloud Server L)
# Target: /var/www/html OR /var/www/enterprise-universe.one
#═══════════════════════════════════════════════════════════════

echo "⚡ Enterprise Universe v99.999 Deployment"
echo "=========================================="

# Backup old index
if [ -f /var/www/html/index.html ]; then
    cp /var/www/html/index.html /var/www/html/index.html.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup erstellt"
fi

# Deploy new landing page
cp index.html /var/www/html/index.html
chmod 644 /var/www/html/index.html
chown www-data:www-data /var/www/html/index.html

echo "✅ Landing Page deployed"

# Restart nginx
systemctl restart nginx
echo "✅ Nginx restarted"

echo ""
echo "🚀 DEPLOYMENT COMPLETE!"
echo "   Version: v99.999"
echo "   神 Mode: ACTIVE"
echo ""
