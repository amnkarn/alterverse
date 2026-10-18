# 🪐 Alterverse

<p align="center">
  <strong>Real-time 2D Multiplayer Metaverse & Virtual Space Platform</strong><br />
  Created by <a href="https://amnkarn.com"><strong>amnkarn</strong></a> • Official Website: <a href="https://amnkarn.com"><strong>amnkarn.com</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bun-1.3+-FBF0DF?style=for-the-badge&logo=bun&logoColor=black" alt="Bun" />
  <img src="https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/React_19-Vite_8-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/WebSocket-Realtime-4EAA25?style=for-the-badge&logo=socketdotio&logoColor=white" alt="WebSocket" />
  <img src="https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center">
  <img src="docs/ARENA.gif" alt="Alterverse Arena Gameplay & Multiplayer Demo" width="90%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

---

## 🌟 Overview

**Alterverse** is a full-stack, real-time multiplayer 2D virtual space platform built with a high-performance **Turborepo + Bun** monorepo architecture. 

Users can create and join interactive virtual spaces, select custom avatars, move seamlessly on a 2D tile canvas with collision detection, sit on chairs, interact with spatial elements, and synchronize movement in real-time with other players across the globe.

---

## ✨ Features

- 🎮 **Real-time 2D Multiplayer Arena**: Smooth 2D spatial movement synchronized via low-latency WebSockets.
- 🪑 **Interactive Map Elements**: Seating mechanics, element interaction, dynamic maps, and collision-aware movement.
- 👤 **Custom Avatars & Identities**: Choose pixel-art avatars, set display names, and navigate virtual spaces.
- 🔐 **Modern Authentication**: Powered by [Better-Auth](https://www.better-auth.com/) supporting GitHub OAuth and Email/Password authentication.
- 🛠️ **Admin Management Suite**: Full control for admins to manage spaces, elements, custom avatars, and map configurations.
- ⚡ **Turborepo + Bun Monorepo**: Blazing-fast package management, TypeScript compilation, and unified build pipelines.
- 🐳 **Production-Ready Docker**: Containerized microservices orchestrated via Docker Compose and deployed automatically via GitHub Actions CI/CD.

---

## 🏗️ Architecture & Tech Stack

```
                          Internet (HTTPS: 443 / WSS)
                                     │
                                     ▼
                          [ Nginx Reverse Proxy ]
                        (alterverse.amnkarn.com)
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
      Route: /                  Route: /api/                Route: /ws/
         │                           │                           │
         ▼                           ▼                           ▼
 [ Frontend Service ]        [ Backend Service ]        [ WebSocket Server ]
   Port: 5173 (Vite SPA)       Port: 8080 (REST API)      Port: 3001 (WS Server)
```

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Monorepo** | [Turborepo](https://turbo.build/) + [Bun](https://bun.sh/) | Multi-package workspace with smart caching |
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, GSAP | Single Page Application with Canvas 2D engine |
| **Backend API** | Express, Bun, Better-Auth, Prisma | REST API handling auth, spaces, and avatars |
| **WebSocket** | Bun WebSocket Server | Real-time spatial event broadcasting and sync |
| **Database** | PostgreSQL (Neon Serverless) + Prisma ORM | Relational schema for users, spaces, and elements |
| **DevOps** | Docker, Nginx, Certbot SSL, GitHub Actions | Path-based routing and automated CI/CD deployment |

---

## 📁 Repository Structure

```
Alterverse/
├── apps/
│   ├── web/               # React 19 + Vite frontend (SPA)
│   ├── backend/           # Express + Better-Auth REST API server
│   ├── ws/                # Real-time WebSocket server
│   └── test/              # Integration and load tests
├── packages/
│   ├── db/                # Prisma ORM schema, migrations & database client
│   └── typescript-config/ # Shared TypeScript configurations
├── docker/
│   ├── web/Dockerfile     # Web container build
│   ├── backend/Dockerfile # Backend container build
│   └── ws/Dockerfile      # WebSocket container build
├── docs/                  # Architecture, API, and deployment documentation
│   ├── ARENA.gif          # Arena demonstration preview
│   ├── Deployment_Steps.md# VPS deployment & Nginx guide
│   ├── architecture.md    # System architecture deep-dive
│   ├── api.md             # REST API specifications
│   ├── websocket.md       # WebSocket protocol & events
│   └── database.md        # Database schema & ER diagram
└── docker-compose.yml     # Multi-container orchestration
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.2+) installed on your machine
- [Docker](https://www.docker.com/) & Docker Compose (optional, for containerized run)
- PostgreSQL database (or [Neon](https://neon.tech/) connection URL)

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/amnkarn/Alterverse.git
cd Alterverse

# Install dependencies across all workspaces
bun install
```

---

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=8080
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/alterverse?sslmode=require"

# Better-Auth
BETTER_AUTH_SECRET="your-super-secret-random-key"
BETTER_AUTH_URL="http://localhost:8080"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_oauth_client_id"
GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"

# Frontend Envs (Vite)
VITE_BACKEND_URL="http://localhost:8080"
VITE_WS_URL="ws://localhost:3001"
```

---

### 3. Initialize the Database

Push the Prisma schema to your database and generate the Prisma Client:

```bash
bun run db:generate
bun run db:push
```

---

### 4. Run the Development Environment

Start all applications (Frontend, Backend, and WebSocket) concurrently with Turborepo:

```bash
bun run dev
```

The services will start on:

| Service | Local URL |
| :--- | :--- |
| **Frontend** | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | [http://localhost:8080](http://localhost:8080) |
| **WebSocket Server** | `ws://localhost:3001` |

---

## 🐳 Running with Docker Compose

You can build and run the entire stack locally with Docker Compose:

```bash
# Build and run containers in detached mode
docker compose up --build -d

# Check running containers
docker compose ps

# View container logs
docker compose logs -f
```

---

## 📚 Documentation Index

For in-depth guides and technical specifications, explore the [`docs/`](./docs) folder:

- 📖 [System Architecture & Design](./docs/architecture.md)
- 🔌 [REST API Endpoints & Schemas](./docs/api.md)
- ⚡ [WebSocket Protocol & Message Formats](./docs/websocket.md)
- 🗄️ [Database Models & Schema](./docs/database.md)
- 🚀 [VPS Deployment, Nginx & SSL Guide](./docs/Deployment_Steps.md)

---

## 👤 Author

- **Author:** [amnkarn](https://github.com/amnkarn)
- **Official Website:** [amnkarn.com](https://amnkarn.com)
- **Live Platform:** [alterverse.amnkarn.com](https://alterverse.amnkarn.com)
