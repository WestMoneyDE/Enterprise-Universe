#!/bin/bash
#
# Security Status Check Script
# Run this to verify security hardening configuration
#
# Usage: sudo bash security-status.sh
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Security Status Report"
echo "  $(date)"
echo "=========================================="
echo ""

# ============================================
# UFW STATUS
# ============================================
echo -e "${GREEN}[UFW FIREWALL]${NC}"
echo "-------------------------------------------"
if command -v ufw &> /dev/null; then
    ufw status verbose
else
    echo -e "${RED}UFW not installed${NC}"
fi
echo ""

# ============================================
# FAIL2BAN STATUS
# ============================================
echo -e "${GREEN}[FAIL2BAN]${NC}"
echo "-------------------------------------------"
if command -v fail2ban-client &> /dev/null; then
    echo "Service Status:"
    systemctl is-active fail2ban && echo -e "${GREEN}Active${NC}" || echo -e "${RED}Inactive${NC}"
    echo ""
    echo "Jail Status:"
    fail2ban-client status 2>/dev/null || echo "Cannot connect to fail2ban server"
    echo ""
    echo "SSH Jail Details:"
    fail2ban-client status sshd 2>/dev/null || echo "SSH jail not available"
else
    echo -e "${RED}Fail2ban not installed${NC}"
fi
echo ""

# ============================================
# UNATTENDED UPGRADES STATUS
# ============================================
echo -e "${GREEN}[UNATTENDED UPGRADES]${NC}"
echo "-------------------------------------------"
if dpkg -l | grep -q unattended-upgrades; then
    echo "Package: Installed"
    echo "Service Status:"
    systemctl is-active unattended-upgrades && echo -e "${GREEN}Active${NC}" || echo -e "${RED}Inactive${NC}"
    echo ""
    echo "Configuration:"
    grep -E "^Unattended-Upgrade::Allowed-Origins|^APT::Periodic" /etc/apt/apt.conf.d/50unattended-upgrades /etc/apt/apt.conf.d/20auto-upgrades 2>/dev/null | head -10
    echo ""
    echo "Last upgrade log (recent entries):"
    if [ -f /var/log/unattended-upgrades/unattended-upgrades.log ]; then
        tail -5 /var/log/unattended-upgrades/unattended-upgrades.log
    else
        echo "No log file yet"
    fi
else
    echo -e "${RED}Unattended-upgrades not installed${NC}"
fi
echo ""

# ============================================
# LISTENING PORTS
# ============================================
echo -e "${GREEN}[LISTENING PORTS]${NC}"
echo "-------------------------------------------"
ss -tlnp 2>/dev/null | grep LISTEN || netstat -tlnp 2>/dev/null | grep LISTEN
echo ""

# ============================================
# RECENT SSH ATTEMPTS
# ============================================
echo -e "${GREEN}[RECENT SSH LOGIN ATTEMPTS]${NC}"
echo "-------------------------------------------"
echo "Failed attempts (last 10):"
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5 || echo "No auth.log access or no failed attempts"
echo ""
echo "Successful logins (last 5):"
grep "Accepted" /var/log/auth.log 2>/dev/null | tail -5 || echo "No auth.log access"
echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "  Quick Health Check"
echo "=========================================="
echo -n "UFW Enabled:              "
ufw status 2>/dev/null | grep -q "Status: active" && echo -e "${GREEN}YES${NC}" || echo -e "${RED}NO${NC}"

echo -n "Fail2ban Running:         "
systemctl is-active fail2ban &>/dev/null && echo -e "${GREEN}YES${NC}" || echo -e "${RED}NO${NC}"

echo -n "Auto-updates Enabled:     "
systemctl is-active unattended-upgrades &>/dev/null && echo -e "${GREEN}YES${NC}" || echo -e "${RED}NO${NC}"

echo -n "SSH Allowed in UFW:       "
ufw status 2>/dev/null | grep -q "22/tcp.*ALLOW" && echo -e "${GREEN}YES${NC}" || echo -e "${YELLOW}CHECK${NC}"

echo ""
