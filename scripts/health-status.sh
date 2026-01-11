#!/bin/bash
# Quick Health Status Display

echo "═══════════════════════════════════════════════════════════"
echo "           SERVER HEALTH STATUS - $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════"
echo ""

# System metrics
echo "SYSTEM"
echo "-------"
LOAD=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
CPUS=$(nproc)
echo "  Load Average: $LOAD ($CPUS CPUs)"
echo "  Memory: $(free -h | grep Mem | awk '{print $3 " / " $2 " (" int($3/$2*100) "%)"}')"
echo "  Disk: $(df -h / | tail -1 | awk '{print $3 " / " $2 " (" $5 ")"}')"
echo "  Uptime: $(uptime -p)"
echo ""

# Systemd services
echo "SYSTEMD SERVICES"
echo "-----------------"
for SERVICE in nginx postgresql docker hubspot-sync; do
    STATUS=$(systemctl is-active $SERVICE 2>/dev/null)
    if [ "$STATUS" = "active" ]; then
        echo "  $SERVICE: ✓ active"
    else
        echo "  $SERVICE: ✗ $STATUS"
    fi
done
echo ""

# PM2 User
echo "PM2 (User)"
echo "----------"
pm2 list --no-color 2>/dev/null | grep -E "│.*│.*│" | grep -v "^│ id" | while read line; do
    NAME=$(echo "$line" | awk -F'│' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
    STATUS=$(echo "$line" | awk -F'│' '{gsub(/^[ \t]+|[ \t]+$/, "", $10); print $10}')
    if [ -n "$NAME" ] && [ "$NAME" != "name" ]; then
        if [ "$STATUS" = "online" ]; then
            echo "  $NAME: ✓ online"
        else
            echo "  $NAME: ✗ $STATUS"
        fi
    fi
done
echo ""

# PM2 Root
echo "PM2 (Root)"
echo "----------"
sudo pm2 list --no-color 2>/dev/null | grep -E "│.*│.*│" | grep -v "^│ id" | while read line; do
    NAME=$(echo "$line" | awk -F'│' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
    STATUS=$(echo "$line" | awk -F'│' '{gsub(/^[ \t]+|[ \t]+$/, "", $10); print $10}')
    if [ -n "$NAME" ] && [ "$NAME" != "name" ]; then
        if [ "$STATUS" = "online" ]; then
            echo "  $NAME: ✓ online"
        else
            echo "  $NAME: ✗ $STATUS"
        fi
    fi
done
echo ""

# Recent alerts
echo "RECENT ALERTS (last 10)"
echo "-----------------------"
if [ -f /home/administrator/logs/service-alerts.log ]; then
    tail -10 /home/administrator/logs/service-alerts.log 2>/dev/null || echo "  No alerts"
else
    echo "  No alerts"
fi
echo ""
echo "═══════════════════════════════════════════════════════════"
