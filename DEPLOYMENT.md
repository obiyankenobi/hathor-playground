# Hathor Playground Deployment Guide

This guide covers deploying the Hathor Playground to a production server running frontend and backend directly on the server with Nginx as a reverse proxy.

## Prerequisites

- Ubuntu/Debian server with root access
- Domain name pointing to your server (playground.hathor.dev)
- Server with sufficient resources (minimum 2GB RAM, 1 CPU core)
- Docker installed for running the Hathor core test image

## Architecture

```
Internet → Nginx (Direct, Port 80/443) → Frontend (systemd, Port 3000)
                                       → Backend (systemd, Port 3001) → Docker Engine
```

## Quick Deployment

### Automated Deployment (Recommended)

1. **Clone the repository** on your server:
```bash
git clone https://github.com/obiyankenobi/hathor-playground.git
cd hathor-playground
```

2. **Run the deployment script**:
```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

The script will automatically:
- Install Node.js 22, Docker, and dependencies
- Create application user and directories
- Build and install frontend and backend
- Configure systemd services
- Set up Nginx reverse proxy
- Start all services

## Manual Deployment

### 1. System Setup

```bash
# Update system
sudo apt-get update
sudo apt-get install -y curl git nginx docker.io nodejs npm

# Install Node.js 22 if needed
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create application user
sudo useradd -r -s /bin/bash -d /opt/hathor-playground -m hathor
sudo usermod -a -G docker hathor
```

### 2. Application Setup

```bash
# Clone repository
sudo git clone https://github.com/obiyankenobi/hathor-playground.git /opt/hathor-playground
cd /opt/hathor-playground
sudo chown -R hathor:hathor /opt/hathor-playground

# Install backend dependencies
cd backend
sudo -u hathor npm ci --only=production

# Build frontend
cd ../frontend
sudo -u hathor npm ci
sudo -u hathor npm run build
sudo npm install -g serve

# Create required directories
sudo mkdir -p /opt/hathor-playground/backend/tmp
sudo chown hathor:hathor /opt/hathor-playground/backend/tmp
```

### 3. Service Configuration

```bash
# Install systemd services
sudo cp hathor-playground-backend.service /etc/systemd/system/
sudo cp hathor-playground-frontend.service /etc/systemd/system/

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable hathor-playground-backend.service
sudo systemctl enable hathor-playground-frontend.service
sudo systemctl start hathor-playground-backend.service
sudo systemctl start hathor-playground-frontend.service
```

### 4. Nginx Configuration

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/hathor-playground
sudo ln -s /etc/nginx/sites-available/hathor-playground /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and start nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### 5. Verify Deployment

```bash
# Check if services are running
curl http://localhost/health

# Test the frontend
curl http://localhost/
```

## SSL/HTTPS Setup (Recommended)

### Using Let's Encrypt with Certbot

1. Install Certbot:
```bash
sudo apt-get update
sudo apt-get install certbot
```

2. Stop Nginx temporarily:
```bash
docker-compose stop nginx
```

3. Obtain SSL certificate:
```bash
sudo certbot certonly --standalone -d playground.hathor.dev
```

4. Update nginx.conf:
   - Uncomment the HTTPS server block
   - Update SSL certificate paths:
     ```nginx
     ssl_certificate /etc/letsencrypt/live/playground.hathor.dev/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/playground.hathor.dev/privkey.pem;
     ```

5. Update docker-compose.yml to mount certificates:
```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

6. Restart services:
```bash
docker-compose up -d
```

## File Structure

```
hathor-remix/
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   └── package.json
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
├── nginx.conf
├── docker-compose.yml
└── DEPLOYMENT.md
```

## Configuration Files

### nginx.conf
- Handles reverse proxy for frontend and backend
- Includes security headers and gzip compression
- Maps `/run-test` to backend `/run` endpoint
- Includes SSL configuration (commented out by default)

### systemd services
- **hathor-playground-backend.service** - Backend Node.js service
- **hathor-playground-frontend.service** - Frontend static file server  
- Both services run with proper security settings and restart policies

## Monitoring and Maintenance

### View Logs
```bash
# Backend service
journalctl -u hathor-playground-backend -f

# Frontend service
journalctl -u hathor-playground-frontend -f

# Nginx service
journalctl -u nginx -f
```

### Update Deployment
```bash
# Pull latest code
cd /opt/hathor-playground
sudo -u hathor git pull

# Rebuild frontend
cd frontend
sudo -u hathor npm run build

# Restart services
sudo systemctl restart hathor-playground-backend
sudo systemctl restart hathor-playground-frontend
sudo systemctl reload nginx
```

### Backup and Recovery
- Application data is stored in localStorage (client-side)
- Backend logs are stored in `backend/tmp/docker_output.log`
- Consider backing up Docker volumes if you add persistent storage

## Troubleshooting

### Common Issues

1. **Backend can't access Docker**
   - Ensure Docker socket is mounted: `/var/run/docker.sock:/var/run/docker.sock`
   - Check if `obiyankenobi/hathor-core-test-image` is available

2. **Frontend can't reach backend**
   - Verify nginx configuration
   - Check if backend service is running on port 3001
   - Review network connectivity between containers

3. **SSL certificate issues**
   - Verify domain DNS points to your server
   - Check certificate paths in nginx.conf
   - Ensure certificates are readable by nginx container

### Health Checks
```bash
# Backend health
curl http://playground.hathor.dev/health

# Frontend accessibility
curl http://playground.hathor.dev/

# Docker operations
curl -X POST http://playground.hathor.dev/run-test \
  -H "Content-Type: application/json" \
  -d '{"contractCode":"...","testCode":"...","entryName":"test"}'
```

## Security Considerations

- The backend container has access to Docker socket (required for code execution)
- User-submitted code runs in isolated Docker containers
- Consider implementing rate limiting and request size limits
- Regular security updates for base images and dependencies
- Monitor logs for unusual activity

## Resource Requirements

- **Minimum**: 2GB RAM, 1 CPU core, 20GB disk space
- **Recommended**: 4GB RAM, 2 CPU cores, 50GB disk space
- **Network**: Sufficient bandwidth for Docker image pulls and user traffic

## Performance Optimization

- Enable gzip compression (included in nginx.conf)
- Implement CDN for static assets
- Consider implementing caching strategies
- Monitor resource usage and scale as needed