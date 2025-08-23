#!/bin/bash

# Quick fix for deployment directory issue
set -e

APP_DIR="/opt/hathor-playground"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (use sudo)"
    exit 1
fi

log "Cleaning up existing deployment directory..."

# Stop services if they exist
systemctl stop hathor-playground-backend.service 2>/dev/null || true
systemctl stop hathor-playground-frontend.service 2>/dev/null || true

# Backup existing directory if it contains important data
if [ -d "$APP_DIR" ]; then
    BACKUP_DIR="${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    warn "Backing up existing directory to $BACKUP_DIR"
    mv "$APP_DIR" "$BACKUP_DIR"
fi

log "Directory cleaned. You can now run the deployment script:"
log "sudo ./deploy.sh"