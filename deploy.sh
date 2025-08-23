#!/bin/bash

# Hathor Playground Deployment Script
# This script deploys the frontend and backend directly on the server

set -e  # Exit on any error

# Configuration
APP_DIR="/opt/hathor-playground"
REPO_URL="https://github.com/obiyankenobi/hathor-playground.git"
USER="hathor"
GROUP="hathor"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run this script as root (use sudo)"
fi

log "Starting Hathor Playground deployment..."

# Install dependencies
log "Installing system dependencies..."
apt-get update
apt-get install -y curl git nginx docker.io docker-compose

# Install Node.js 22
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 22 ]; then
    log "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# Create user and group
log "Creating application user..."
if ! id "$USER" &>/dev/null; then
    useradd -r -s /bin/bash -d "$APP_DIR" -m "$USER"
fi

# Add user to docker group
usermod -a -G docker "$USER"

# Create application directory
log "Setting up application directory..."
mkdir -p "$APP_DIR"
chown "$USER:$GROUP" "$APP_DIR"

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    log "Updating existing repository..."
    cd "$APP_DIR"
    sudo -u "$USER" git fetch
    sudo -u "$USER" git reset --hard origin/master
    sudo -u "$USER" git clean -fd
else
    log "Setting up repository..."
    if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR 2>/dev/null)" ]; then
        warn "Directory $APP_DIR exists and is not empty. Backing up and cleaning..."
        mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        mkdir -p "$APP_DIR"
        chown "$USER:$GROUP" "$APP_DIR"
    fi
    log "Cloning repository..."
    sudo -u "$USER" git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Install backend dependencies
log "Installing backend dependencies..."
cd "$APP_DIR/backend"
if [ -f "package-lock.json" ]; then
    log "Trying npm ci first..."
    if ! sudo -u "$USER" npm ci --omit=dev 2>/dev/null; then
        log "npm ci failed, falling back to npm install..."
        sudo -u "$USER" rm -f package-lock.json
        sudo -u "$USER" npm install --omit=dev
    fi
else
    log "package-lock.json not found, running npm install..."
    sudo -u "$USER" npm install --omit=dev
fi

# Build and install frontend
log "Building and installing frontend..."
cd "$APP_DIR/frontend"
if [ -f "package-lock.json" ]; then
    log "Trying npm ci first..."
    if ! sudo -u "$USER" npm ci 2>/dev/null; then
        log "npm ci failed, falling back to npm install..."
        sudo -u "$USER" rm -f package-lock.json
        sudo -u "$USER" npm install
    fi
else
    log "package-lock.json not found, running npm install..."
    sudo -u "$USER" npm install
fi
sudo -u "$USER" npm run build

# Install serve globally if not already installed
if ! command -v serve &> /dev/null; then
    log "Installing serve globally..."
    npm install -g serve
fi

# Create tmp directory for backend
mkdir -p "$APP_DIR/backend/tmp"
chown "$USER:$GROUP" "$APP_DIR/backend/tmp"

# Pull Docker image
log "Pulling Hathor core test image..."
docker pull obiyankenobi/hathor-core-test-image

# Install systemd services
log "Installing systemd services..."
cp "$APP_DIR/hathor-playground-backend.service" /etc/systemd/system/
cp "$APP_DIR/hathor-playground-frontend.service" /etc/systemd/system/

# Reload systemd and enable services
systemctl daemon-reload
systemctl enable hathor-playground-backend.service
systemctl enable hathor-playground-frontend.service

# Start services
log "Starting application services..."
systemctl start hathor-playground-backend.service
systemctl start hathor-playground-frontend.service

# Configure nginx
log "Configuring nginx..."
cp "$APP_DIR/nginx.conf" /etc/nginx/sites-available/hathor-playground
ln -sf /etc/nginx/sites-available/hathor-playground /etc/nginx/sites-enabled/hathor-playground

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Start nginx service
log "Starting nginx..."
systemctl enable nginx
systemctl restart nginx

# Check service status
log "Checking service status..."
sleep 5

if systemctl is-active --quiet hathor-playground-backend.service; then
    log "Backend service is running ✓"
else
    warn "Backend service is not running"
    systemctl status hathor-playground-backend.service
fi

if systemctl is-active --quiet hathor-playground-frontend.service; then
    log "Frontend service is running ✓"
else
    warn "Frontend service is not running"
    systemctl status hathor-playground-frontend.service
fi

# Test endpoints
log "Testing endpoints..."
sleep 10

if curl -s http://localhost:3001/health > /dev/null; then
    log "Backend health check passed ✓"
else
    warn "Backend health check failed"
fi

if curl -s http://localhost:3000 > /dev/null; then
    log "Frontend is responding ✓"
else
    warn "Frontend is not responding"
fi

log "Deployment completed!"
log ""
log "Service management commands:"
log "  Backend:  systemctl [start|stop|restart|status] hathor-playground-backend"
log "  Frontend: systemctl [start|stop|restart|status] hathor-playground-frontend"
log "  Nginx:    systemctl [start|stop|restart|status] nginx"
log ""
log "Log locations:"
log "  Backend:  journalctl -u hathor-playground-backend -f"
log "  Frontend: journalctl -u hathor-playground-frontend -f"
log "  Nginx:    journalctl -u nginx -f"
log ""
log "Application should be available at: http://playground.hathor.dev"
