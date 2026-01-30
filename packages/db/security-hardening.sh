#!/bin/bash
#
# Security Hardening Script for Nexus Command Center
# This script configures UFW, Fail2ban, and Unattended Upgrades
#
# Usage: sudo bash security-hardening.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

echo "=========================================="
echo "  Security Hardening Setup"
echo "=========================================="
echo ""

# ============================================
# 1. UFW FIREWALL CONFIGURATION
# ============================================
log_info "Configuring UFW Firewall..."

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
    log_info "Installing UFW..."
    apt-get update -qq
    apt-get install -y ufw
fi

# Check current status
UFW_STATUS=$(ufw status | head -1)
log_info "Current UFW status: $UFW_STATUS"

# Reset UFW rules if you want a clean slate (commented out for safety)
# ufw --force reset

# Set default policies
log_info "Setting default policies..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (port 22) - CRITICAL: Do this first to avoid lockout
log_info "Allowing SSH (port 22)..."
ufw allow 22/tcp comment 'SSH'

# Allow HTTP (port 80) for Traefik
log_info "Allowing HTTP (port 80)..."
ufw allow 80/tcp comment 'HTTP - Traefik'

# Allow HTTPS (port 443) for Traefik
log_info "Allowing HTTPS (port 443)..."
ufw allow 443/tcp comment 'HTTPS - Traefik'

# Allow Docker networks (172.16.0.0/12) to port 8080 (Nginx)
log_info "Allowing Docker networks to Nginx (port 8080)..."
ufw allow from 172.16.0.0/12 to any port 8080 comment 'Docker to Nginx'

# Enable UFW (non-interactive)
log_info "Enabling UFW..."
ufw --force enable

# Show final status
log_info "UFW Configuration Complete. Current rules:"
ufw status verbose

echo ""

# ============================================
# 2. FAIL2BAN CONFIGURATION
# ============================================
log_info "Configuring Fail2ban..."

# Install fail2ban
if ! command -v fail2ban-client &> /dev/null; then
    log_info "Installing Fail2ban..."
    apt-get update -qq
    apt-get install -y fail2ban
else
    log_info "Fail2ban already installed"
fi

# Create local jail configuration
log_info "Creating Fail2ban jail configuration..."

cat > /etc/fail2ban/jail.local << 'EOF'
# Fail2ban Local Configuration
# Created by security hardening script
#
# This file overrides settings in jail.conf
# Do not modify jail.conf directly

[DEFAULT]
# Ban duration (1 hour)
bantime = 1h

# Time window for counting failures
findtime = 10m

# Number of failures before ban
maxretry = 5

# Action to take (uses UFW)
banaction = ufw

# Email notifications (optional - configure if needed)
# destemail = admin@example.com
# sender = fail2ban@example.com
# action = %(action_mwl)s

# Ignore local addresses
ignoreip = 127.0.0.1/8 ::1

# ============================================
# SSH JAIL
# ============================================
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 1h
findtime = 10m

# ============================================
# NGINX JAILS
# ============================================

# Nginx Bad Requests (400 errors)
[nginx-http-auth]
enabled = true
port = http,https,8080
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 1h

# Nginx Botsearch (scanners looking for vulnerabilities)
[nginx-botsearch]
enabled = true
port = http,https,8080
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 1h

# Nginx Bad Request filter (custom)
[nginx-badbots]
enabled = true
port = http,https,8080
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 1d

# Nginx Limit Request (rate limiting)
[nginx-limit-req]
enabled = true
port = http,https,8080
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 1h
EOF

# Create custom nginx-badbots filter if it doesn't exist
log_info "Creating custom Nginx filters..."

cat > /etc/fail2ban/filter.d/nginx-badbots.local << 'EOF'
# Fail2ban filter for nginx bad bots and scanners

[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*HTTP.*" (400|403|404|405|444) .*$
            ^<HOST> -.*".*(?:sqlmap|nikto|nmap|masscan|zgrab).*".*$

ignoreregex =
EOF

# Ensure nginx error log exists (create directory if needed)
if [ ! -d /var/log/nginx ]; then
    log_warn "Nginx log directory not found. Creating placeholder..."
    mkdir -p /var/log/nginx
    touch /var/log/nginx/access.log
    touch /var/log/nginx/error.log
fi

# Test fail2ban configuration
log_info "Testing Fail2ban configuration..."
if fail2ban-client -t; then
    log_info "Fail2ban configuration is valid"
else
    log_error "Fail2ban configuration has errors!"
    exit 1
fi

# Enable and restart fail2ban
log_info "Enabling and starting Fail2ban..."
systemctl enable fail2ban
systemctl restart fail2ban

# Show fail2ban status
sleep 2
log_info "Fail2ban Status:"
fail2ban-client status

echo ""

# ============================================
# 3. UNATTENDED UPGRADES (AUTO-UPDATES)
# ============================================
log_info "Configuring Unattended Upgrades..."

# Install unattended-upgrades
if ! dpkg -l | grep -q unattended-upgrades; then
    log_info "Installing unattended-upgrades..."
    apt-get update -qq
    apt-get install -y unattended-upgrades apt-listchanges
else
    log_info "unattended-upgrades already installed"
fi

# Configure unattended-upgrades for security updates only
log_info "Configuring for security updates only..."

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
// Unattended Upgrades Configuration
// Security updates only

Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    // "${distro_id}:${distro_codename}-updates";     // Disabled - security only
    // "${distro_id}:${distro_codename}-proposed";    // Disabled
    // "${distro_id}:${distro_codename}-backports";   // Disabled
};

// Package blacklist (packages that should never be auto-updated)
Unattended-Upgrade::Package-Blacklist {
    // "linux-image*";
    // "linux-headers*";
};

// Auto-fix interrupted dpkg
Unattended-Upgrade::AutoFixInterruptedDpkg "true";

// Do minimal steps to keep system running during upgrade
Unattended-Upgrade::MinimalSteps "true";

// Reboot if required (at 3:00 AM)
Unattended-Upgrade::Automatic-Reboot "false";
// Unattended-Upgrade::Automatic-Reboot-Time "03:00";

// Remove unused automatically installed kernel-related packages
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Remove unused dependencies after upgrade
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Remove new unused dependencies after upgrade
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";

// Log syslog
Unattended-Upgrade::SyslogEnable "true";

// Only on AC power (for laptops)
Unattended-Upgrade::OnlyOnACPower "true";

// Skip updates requiring restart during active hours
// Unattended-Upgrade::Skip-Updates-On-Metered-Connections "true";
EOF

# Enable automatic updates
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

# Enable the unattended-upgrades service
log_info "Enabling unattended-upgrades service..."
systemctl enable unattended-upgrades
systemctl restart unattended-upgrades

# Verify configuration
log_info "Verifying unattended-upgrades configuration..."
unattended-upgrades --dry-run --debug 2>&1 | head -20

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "  Security Hardening Complete!"
echo "=========================================="
echo ""
log_info "UFW Firewall:"
echo "  - Default deny incoming"
echo "  - SSH (22), HTTP (80), HTTPS (443) allowed"
echo "  - Docker networks (172.16.0.0/12) -> port 8080 allowed"
echo ""
log_info "Fail2ban:"
echo "  - SSH jail: maxretry=5, bantime=1h"
echo "  - Nginx jails configured for bad requests"
echo "  - Service enabled and running"
echo ""
log_info "Auto-updates:"
echo "  - Security updates only"
echo "  - Daily package list updates"
echo "  - Automatic security upgrades enabled"
echo ""
log_info "Useful commands:"
echo "  - Check UFW status:     sudo ufw status verbose"
echo "  - Check banned IPs:     sudo fail2ban-client status sshd"
echo "  - Unban an IP:          sudo fail2ban-client set sshd unbanip <IP>"
echo "  - Check upgrade logs:   sudo cat /var/log/unattended-upgrades/unattended-upgrades.log"
echo ""
log_warn "IMPORTANT: Verify you can still SSH to this server before closing your current session!"
