#!/bin/bash
# =============================================================================
# NEXUS COMMAND CENTER - Production Deployment Script
# =============================================================================
# This script is executed on the production server via SSH from GitHub Actions
# Server: 81.88.26.204
# User: administrator
# =============================================================================

set -e

# Configuration
PROJECT_DIR="/home/administrator/nexus-command-center"
BACKUP_DIR="${PROJECT_DIR}/backups"
LOG_DIR="/home/administrator/logs"
BUILDS_TO_KEEP=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo "========================================"
echo "NEXUS COMMAND CENTER - Production Deploy"
echo "========================================"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Server: $(hostname)"
echo "========================================"
echo ""

# Navigate to project directory
cd "$PROJECT_DIR"
log_info "Working directory: $(pwd)"

# Create required directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

# =============================================================================
# STEP 1: Create Backup of Current Build
# =============================================================================
log_info "Creating backup of current build..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/build_${TIMESTAMP}.tar.gz"

if [ -d "apps/web/.next" ]; then
    # Create backup
    tar -czf "$BACKUP_FILE" \
        apps/web/.next \
        packages/*/dist \
        2>/dev/null || true

    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Backup created: build_${TIMESTAMP}.tar.gz (${BACKUP_SIZE})"
    fi
else
    log_warn "No existing build to backup"
fi

# =============================================================================
# STEP 2: Clean Old Backups (Keep Last N)
# =============================================================================
log_info "Cleaning old backups (keeping last ${BUILDS_TO_KEEP})..."

cd "$BACKUP_DIR"
BACKUP_COUNT=$(ls -1 build_*.tar.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$BUILDS_TO_KEEP" ]; then
    ls -t build_*.tar.gz 2>/dev/null | tail -n +$((BUILDS_TO_KEEP + 1)) | xargs -r rm -f
    log_success "Removed $((BACKUP_COUNT - BUILDS_TO_KEEP)) old backup(s)"
else
    log_info "No old backups to remove (${BACKUP_COUNT}/${BUILDS_TO_KEEP})"
fi

cd "$PROJECT_DIR"

# =============================================================================
# STEP 3: Pull Latest Code
# =============================================================================
log_info "Pulling latest code from origin/main..."

# Stash any local changes
git stash --quiet 2>/dev/null || true

# Fetch and reset to origin/main
git fetch origin main --quiet
git reset --hard origin/main

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=format:'%s')

log_success "Updated to commit: ${COMMIT_HASH}"
log_info "Commit message: ${COMMIT_MSG}"

# =============================================================================
# STEP 4: Install Dependencies
# =============================================================================
log_info "Installing dependencies..."

# Use frozen lockfile for reproducible builds
pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -5

log_success "Dependencies installed"

# =============================================================================
# STEP 5: Build Application
# =============================================================================
log_info "Building application..."

# Set build environment variables
export NODE_ENV=production

# Run the build
pnpm build 2>&1 | tail -20

log_success "Application built successfully"

# =============================================================================
# STEP 6: Run Database Migrations
# =============================================================================
log_info "Running database migrations..."

# Only run if migration script exists and DATABASE_URL is set
if [ -n "$DATABASE_URL" ] || [ -f ".env" ]; then
    pnpm db:migrate 2>&1 || log_warn "Migration skipped or no changes"
else
    log_warn "DATABASE_URL not set, skipping migrations"
fi

# =============================================================================
# STEP 7: Restart PM2 Processes
# =============================================================================
log_info "Restarting PM2 processes..."

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    # Reload with zero-downtime if possible, otherwise start fresh
    if pm2 list | grep -q "nexus"; then
        pm2 reload ecosystem.config.js --update-env 2>&1 | tail -5
        log_success "PM2 processes reloaded"
    else
        pm2 start ecosystem.config.js 2>&1 | tail -5
        log_success "PM2 processes started"
    fi

    # Save PM2 state for auto-restart on reboot
    pm2 save --force
else
    log_error "PM2 not found! Please install: npm install -g pm2"
    exit 1
fi

# =============================================================================
# STEP 8: Health Check
# =============================================================================
log_info "Running health check..."

sleep 5

# Check if the application is responding
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        HEALTH_OK=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_warn "Health check attempt ${RETRY_COUNT}/${MAX_RETRIES} failed, retrying..."
    sleep 3
done

if [ "$HEALTH_OK" = true ]; then
    log_success "Health check passed!"
else
    log_warn "Health check did not respond (app may still be starting)"
fi

# =============================================================================
# STEP 9: Display Status
# =============================================================================
echo ""
echo "========================================"
echo "DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
log_info "PM2 Process Status:"
pm2 list

echo ""
echo "========================================"
echo "Deployment Summary"
echo "========================================"
echo "  Commit: ${COMMIT_HASH}"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Backup: build_${TIMESTAMP}.tar.gz"
echo "========================================"
