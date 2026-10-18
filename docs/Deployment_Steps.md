# Multi-Service VPS Deployment Guide: Turborepo + Docker + Nginx + Certbot

A complete production deployment guide for deploying a multi-container Turborepo monorepo (**Alterverse**) onto a single cloud VPS (Oracle Cloud / AWS EC2) using path-based routing via Nginx, automated GitHub Actions CI/CD, and Let's Encrypt SSL certificates.

---

## 🏛️ 1. Architecture Overview

All services run inside isolated Docker containers behind an Nginx reverse proxy on a single domain using path-based routing:

```
                          Internet (HTTPS: 443)
                                    │
                                    ▼
                         [ Nginx Reverse Proxy ]
                       (alterverse.amnkarn.com)
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
      Route: /                 Route: /api/               Route: /ws/
         │                          │                          │
         ▼                          ▼                          ▼
[ Frontend Container ]     [ Backend Container ]      [ WebSocket Container ]
  Port: 5173 (Vite SPA)      Port: 8080 (Bun / API)     Port: 3001 (Bun / WS)
```

| Route | Destination Container | Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `alterverse-web` | `5173` | HTTP | Vite React Single Page Application |
| `/api/` | `alterverse-backend` | `8080` | HTTP | Express + Better-Auth REST API |
| `/ws/` | `alterverse-ws` | `3001` | WS / WSS | Real-time game WebSocket server |

---

## 📦 2. Dockerization Setup

### 💡 Crucial Concept: Vite Build-Time Environment Variables
Vite compiles client-side code into static JavaScript bundles (`dist/`). Because client-side JavaScript runs in the end user's browser (not on the server), environment variables prefixed with `VITE_` are **inlined into the static code during build time**. 

In `docker/web/Dockerfile`, `ARG` and `ENV` parameters must be declared **before** running the build command so that GitHub Actions build arguments can be embedded into the bundle:

```dockerfile
# docker/web/Dockerfile
FROM oven/bun:1 AS base

WORKDIR /app

# Copy package manifests and lockfiles for caching
COPY package.json bun.lock ./
COPY turbo.json ./
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json ./apps/web/

RUN bun install

COPY . .

# Accept build arguments from GitHub Actions CI/CD
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build client-side static assets
RUN bun run build:web

EXPOSE 5173

# Serve production preview
CMD [ "bun", "run", "start:web" ]
```

---

### Docker Compose Configuration (`docker-compose.yml`)

The production Compose file defines service dependencies, port mappings, and restarts:

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
    image: amnkarn/alterverse-web:latest
    container_name: alterverse-web
    restart: always
    depends_on:
      - backend
      - websocket
    ports:
      - "5173:5173"

  backend:
    build:
      context: .
      dockerfile: docker/backend/Dockerfile
    image: amnkarn/alterverse-backend:latest
    container_name: alterverse-backend
    restart: always
    env_file: ./.env
    environment:
      - PORT=8080
    ports:
      - "8080:8080"
    command: sh -c "bun run db:push && bun run start:backend"

  websocket:
    build:
      context: .
      dockerfile: docker/ws/Dockerfile
    image: amnkarn/alterverse-ws:latest
    container_name: alterverse-ws
    restart: always
    env_file: ./.env
    ports:
      - "3001:3001"
    command: sh -c "bun run start:ws"
```

---

## 🛠️ 3. CI/CD Automation (GitHub Actions)

Images are built on GitHub's free runners using Buildx caching, pushed to Docker Hub, and deployed to the VPS via SSH.

### Required GitHub Repository Secrets

Configure these in **GitHub Repository → Settings → Secrets and variables → Actions**:

| Secret Name | Value Description |
| :--- | :--- |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub Personal Access Token (PAT) |
| `EC2_HOST` | VPS Public IP address |
| `EC2_USERNAME` | VPS SSH username (e.g., `ubuntu` or `opc`) |
| `EC2_SECRET_KEY` | Private SSH Key (`.pem` format) |
| `VITE_BACKEND_URL` | `https://alterverse.amnkarn.com` |
| `VITE_WS_URL` | `wss://alterverse.amnkarn.com/ws/` |

---

### Frontend Workflow (`.github/workflows/cd_web.yml`)

```yaml
name: Deploy Frontend
on:
  push:
    branches: [ main ]
    paths:
      - 'apps/web/**'
      - 'docker/web/Dockerfile'
      - 'docker-compose.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Docker Login
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and Push Web Image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/web/Dockerfile
          push: true
          tags: |
            amnkarn/alterverse-web:${{ github.sha }}
            amnkarn/alterverse-web:latest
          build-args: |
            VITE_BACKEND_URL=${{ secrets.VITE_BACKEND_URL }}
            VITE_WS_URL=${{ secrets.VITE_WS_URL }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: SSH and Deploy to VPS
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SECRET_KEY }}" > ~/.ssh/vps.pem
          chmod 600 ~/.ssh/vps.pem

          ssh -i ~/.ssh/vps.pem -o StrictHostKeyChecking=no ${{ secrets.EC2_USERNAME }}@${{ secrets.EC2_HOST }} << 'EOF'
            cd projects/alterverse
            git pull origin main
            echo "${{ secrets.DOCKERHUB_TOKEN }}" | sudo docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
            sudo docker compose pull frontend
            sudo docker compose up -d --no-build --remove-orphans frontend
            sudo docker image prune -f --filter "until=24h" || true
          EOF
```

---

### Backend Workflow (`.github/workflows/cd_backend.yml`)

```yaml
name: Deploy Backend
on:
  push:
    branches: [ main ]
    paths:
      - 'apps/backend/**'
      - 'docker/backend/Dockerfile'
      - 'docker-compose.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Docker Login
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and Push Backend Image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/backend/Dockerfile
          push: true
          tags: |
            amnkarn/alterverse-backend:${{ github.sha }}
            amnkarn/alterverse-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: SSH and Deploy to VPS
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SECRET_KEY }}" > ~/.ssh/vps.pem
          chmod 600 ~/.ssh/vps.pem

          ssh -i ~/.ssh/vps.pem -o StrictHostKeyChecking=no ${{ secrets.EC2_USERNAME }}@${{ secrets.EC2_HOST }} << 'EOF'
            cd projects/alterverse
            git pull origin main
            echo "${{ secrets.DOCKERHUB_TOKEN }}" | sudo docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
            sudo docker compose pull backend
            sudo docker compose up -d --no-build --remove-orphans backend
            sudo docker image prune -f --filter "until=24h" || true
          EOF
```

---

### WebSocket Workflow (`.github/workflows/cd_ws.yml`)

```yaml
name: Deploy WebSocket
on:
  push:
    branches: [ main ]
    paths:
      - 'apps/ws/**'
      - 'docker/ws/Dockerfile'
      - 'docker-compose.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Docker Login
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and Push WebSocket Image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/ws/Dockerfile
          push: true
          tags: |
            amnkarn/alterverse-ws:${{ github.sha }}
            amnkarn/alterverse-ws:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: SSH and Deploy to VPS
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SECRET_KEY }}" > ~/.ssh/vps.pem
          chmod 600 ~/.ssh/vps.pem

          ssh -i ~/.ssh/vps.pem -o StrictHostKeyChecking=no ${{ secrets.EC2_USERNAME }}@${{ secrets.EC2_HOST }} << 'EOF'
            cd projects/alterverse
            git pull origin main
            echo "${{ secrets.DOCKERHUB_TOKEN }}" | sudo docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
            sudo docker compose pull websocket
            sudo docker compose up -d --no-build --remove-orphans websocket
            sudo docker image prune -f --filter "until=24h" || true
          EOF
```

---

## ⚡ 4. VPS System Optimizations & Troubleshooting

### Allocate 2GB Virtual Swap Space
Low-tier VPS instances (e.g. 1GB RAM) will freeze during Docker layer decompression or heavy builds due to Out-Of-Memory (OOM) kernel panics. Allocating swap eliminates freezes:

```bash
# 1. Allocate a 2GB file
sudo fallocate -l 2G /swapfile

# 2. Secure file permissions (root only)
sudo chmod 600 /swapfile

# 3. Format as swap space
sudo mkswap /swapfile

# 4. Enable swap
sudo swapon /swapfile

# 5. Persist across server reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 6. Verify swap is active
free -h
```

---

## ☁️ 5. Cloud Network & Security Rules

### Oracle Cloud / AWS Security Group Rules
> [!IMPORTANT]
> A common mistake when configuring Security Lists / Security Groups is reversing the **Source Port** and **Destination Port**.
> - **Source Port**: Any / Ephemeral (`All`)
> - **Destination Port**: `80` (HTTP) and `443` (HTTPS)

In your Cloud Console:
1. Navigate to **Networking → Virtual Cloud Networks → Public Subnet → Security Lists**.
2. Add Ingress Rules:
   - **HTTP**: Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Source Port `All`, Destination Port `80`
   - **HTTPS**: Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Source Port `All`, Destination Port `443`
3. Under **Compute → Instances → VNIC**, enable **Skip Source/Destination Check** if required.

---

## 🔒 6. Host OS Firewall Configuration (Ubuntu)

Oracle Cloud Ubuntu images ship with restrictive default `iptables` and `nftables` rules that block incoming traffic on ports 80 and 443 even if the cloud security list allows it.

Flush and reset the local firewall rules:

```bash
# 1. Flush existing iptables rules
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X

# 2. Set default policies to ACCEPT
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT

# 3. Flush nftables ruleset if installed
sudo nft flush ruleset 2>/dev/null || true

# 4. Save rules persistently across reboots
sudo apt update && sudo apt install -y iptables-persistent
sudo netfilter-persistent save

# 5. Restart Docker to restore Docker bridge iptables routing
sudo systemctl restart docker
```

---

## 🌐 7. Nginx Reverse Proxy Setup

Nginx listens on ports 80 and 443, terminating SSL and routing traffic internally to the Docker containers.

### Create Nginx Site Configuration

```bash
sudo nano /etc/nginx/sites-available/alterverse.amnkarn.com
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name alterverse.amnkarn.com;

    # 1. Frontend Route (Vite React SPA on Port 5173)
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. Backend API Route (Express / Bun API on Port 8080)
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # 3. WebSocket Route (WebSocket Server on Port 3001)
    location /ws/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Enable Site and Verify Syntax

```bash
# Enable the site via symlink
sudo ln -sf /etc/nginx/sites-available/alterverse.amnkarn.com /etc/nginx/sites-enabled/

# Test syntax
sudo nginx -t

# Reload Nginx service
sudo systemctl reload nginx
```

---

## 🔑 8. SSL Certificate Generation (Certbot)

Acquire a free, auto-renewing SSL certificate from Let's Encrypt:

```bash
# Install Certbot via Snap
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Obtain and automatically install certificate into Nginx
sudo certbot --nginx -d alterverse.amnkarn.com
```

Select **Redirect** when prompted so all incoming HTTP traffic is automatically forwarded to HTTPS.

---

## 🛡️ 9. Environment Variables & OAuth Setup

### Production `.env` File (VPS Root)
Location: `/home/ubuntu/projects/alterverse/.env` (or project root):

```env
# Server Port
PORT=8080
NODE_ENV=production

# Database Connection
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Better-Auth Configuration
BETTER_AUTH_SECRET=your_32_byte_secret_here
BETTER_AUTH_URL=https://alterverse.amnkarn.com

# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Client Endpoints (Optional for runtime; injected into Vite at build time)
VITE_BACKEND_URL=https://alterverse.amnkarn.com
VITE_WS_URL=wss://alterverse.amnkarn.com/ws/
```

### GitHub OAuth Application Configuration
In **GitHub → Developer Settings → OAuth Apps**:

- **Application name**: `Alterverse`
- **Homepage URL**: `https://alterverse.amnkarn.com`
- **Authorization callback URL**: `https://alterverse.amnkarn.com/api/auth/callback/github`

> [!NOTE]
> Better-Auth expects the GitHub OAuth callback at `/api/auth/callback/github`. Ensure this matches your Nginx path routing.

---

## 🔍 10. Verification & Diagnostics

Run these commands on your VPS to verify each layer of the stack:

```bash
# 1. Check container health
sudo docker compose ps

# 2. Inspect real-time container logs
sudo docker compose logs -f --tail=100 backend
sudo docker compose logs -f --tail=100 frontend
sudo docker compose logs -f --tail=100 websocket

# 3. Test local Nginx loopback
curl -I http://localhost
curl -I https://alterverse.amnkarn.com/health

# 4. Check active listening ports
sudo ss -tulpn | grep -E ':(80|443|5173|8080|3001)'
```
