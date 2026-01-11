#!/bin/bash
# Service Health Monitor with Email Alerts
# Checks all critical services and sends email on failures

LOG_FILE="/home/administrator/logs/service-monitor.log"
ALERT_FILE="/home/administrator/logs/service-alerts.log"
ALERT_SCRIPT="/home/administrator/scripts/send-alert-email.py"
ENV_FILE="/home/administrator/scripts/.monitor-env"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Cooldown file to prevent alert spam (1 alert per issue per hour)
COOLDOWN_DIR="/tmp/monitor-cooldown"
mkdir -p "$COOLDOWN_DIR"

# Ensure log directory exists
mkdir -p /home/administrator/logs

# Load environment
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Function to log
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

# Function to send alert (with cooldown)
alert() {
    local MESSAGE="$1"
    local ALERT_ID=$(echo "$MESSAGE" | md5sum | cut -d' ' -f1)
    local COOLDOWN_FILE="$COOLDOWN_DIR/$ALERT_ID"

    echo "[$TIMESTAMP] ALERT: $MESSAGE" >> "$ALERT_FILE"
    echo "[$TIMESTAMP] ALERT: $MESSAGE" >> "$LOG_FILE"

    # Check cooldown (1 hour = 3600 seconds)
    if [ -f "$COOLDOWN_FILE" ]; then
        local LAST_ALERT=$(cat "$COOLDOWN_FILE")
        local NOW=$(date +%s)
        local DIFF=$((NOW - LAST_ALERT))
        if [ "$DIFF" -lt 3600 ]; then
            log "Alert suppressed (cooldown): $MESSAGE"
            return
        fi
    fi

    # Send email alert
    if [ -f "$ALERT_SCRIPT" ] && [ -n "$SMTP_PASS" ]; then
        python3 "$ALERT_SCRIPT" "Service Alert" "$MESSAGE" >> "$LOG_FILE" 2>&1
        echo $(date +%s) > "$COOLDOWN_FILE"
    fi
}

# Collect all issues
ISSUES=""

# Check system load
LOAD=$(cat /proc/loadavg | awk '{print $1}')
CPUS=$(nproc)
LOAD_THRESHOLD=$(echo "$CPUS * 2" | bc)

if (( $(echo "$LOAD > $LOAD_THRESHOLD" | bc -l) )); then
    ISSUES="${ISSUES}HIGH LOAD: $LOAD (threshold: $LOAD_THRESHOLD)\n"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    ISSUES="${ISSUES}DISK CRITICAL: ${DISK_USAGE}% used\n"
fi

# Check memory
MEM_AVAILABLE=$(free | grep Mem | awk '{printf "%.0f", $7/$2 * 100}')
if [ "$MEM_AVAILABLE" -lt 15 ]; then
    ISSUES="${ISSUES}LOW MEMORY: Only ${MEM_AVAILABLE}% available\n"
fi

# Check systemd services
SERVICES=("nginx" "postgresql" "docker" "hubspot-sync")
for SERVICE in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet "$SERVICE"; then
        ISSUES="${ISSUES}SERVICE DOWN: $SERVICE\n"
    fi
done

# Check user PM2 processes
PM2_STATUS=$(pm2 jlist 2>/dev/null)
if [ -n "$PM2_STATUS" ]; then
    ERRORED=$(echo "$PM2_STATUS" | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
    if [ -n "$ERRORED" ]; then
        ISSUES="${ISSUES}PM2 DOWN: $ERRORED\n"
    fi
fi

# Check root PM2 processes
ROOT_PM2_STATUS=$(sudo pm2 jlist 2>/dev/null)
if [ -n "$ROOT_PM2_STATUS" ]; then
    ROOT_ERRORED=$(echo "$ROOT_PM2_STATUS" | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
    if [ -n "$ROOT_ERRORED" ]; then
        ISSUES="${ISSUES}ROOT PM2 DOWN: $ROOT_ERRORED\n"
    fi
fi

# Check HTTP endpoints
check_http() {
    local URL=$1
    local NAME=$2
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null)
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "307" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
        ISSUES="${ISSUES}HTTP FAIL: $NAME returned $HTTP_CODE\n"
    fi
}

check_http "https://west-money-bau.de" "west-money-bau.de"
check_http "https://enterprise-universe.one" "enterprise-universe.one"
check_http "http://localhost:3015/api/health" "app-server"

# Send combined alert if there are issues
if [ -n "$ISSUES" ]; then
    ALERT_MSG="The following issues were detected:\n\n$ISSUES\nServer: cloud-server-10325133\nTime: $TIMESTAMP"
    alert "$(echo -e "$ALERT_MSG")"
fi

# Log successful check
log "Health check completed - Load: $LOAD, Disk: ${DISK_USAGE}%, Mem available: ${MEM_AVAILABLE}%"

# Rotate logs if too large (>10MB)
for LOGFILE in "$LOG_FILE" "$ALERT_FILE"; do
    if [ -f "$LOGFILE" ]; then
        SIZE=$(stat -c%s "$LOGFILE" 2>/dev/null || stat -f%z "$LOGFILE" 2>/dev/null)
        if [ -n "$SIZE" ] && [ "$SIZE" -gt 10485760 ]; then
            mv "$LOGFILE" "${LOGFILE}.old"
        fi
    fi
done
