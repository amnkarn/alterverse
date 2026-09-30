# Architecture

> 2D Metaverse platform — a real-time multiplayer space where users can move avatars around tiled rooms and see each other live.

## Monorepo Layout

```
Metaverse/
├── apps/
│   ├── backend/       REST API — Express 5 + Bun, port 8080
│   ├── ws/            WebSocket server — ws library, port 3001
│   ├── web/           Frontend — Next.js 16 + React 19, port 3000
│   └── test/          Integration test suite — bun test
└── packages/
    ├── db/            Shared Prisma client (@repo/db)
    └── typescript-config/  Shared TS config
```

**Toolchain:** Turborepo + Bun workspaces  
**Database:** PostgreSQL (Neon serverless) via `@prisma/adapter-pg`  
**Auth:** JWT (HS256) — issued on signin, verified on every protected route and WS join  

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                    │
│                                                             │
│   ┌──────────────┐         ┌─────────────────────────────┐  │
│   │  HTTP Client │ ──────► │  REST API (Express / Bun)   │  │
│   │   (axios)    │         │  localhost:8080/api/v1/...  │  │
│   └──────────────┘         └─────────────┬───────────────┘  │
│                                           │                 │
│   ┌──────────────┐         ┌─────────────┴───────────────┐  │
│   │  WebSocket   │ ◄─────► │  WS Server (ws / Bun)       │  │
│   │  (Arena.tsx) │         │  localhost:3001             │  │
│   └──────────────┘         └─────────────┬───────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                            │
                             ┌──────────────▼──────────────┐
                             │     PostgreSQL (Neon)       │
                             │  via @prisma/adapter-pg     │
                             └─────────────────────────────┘
```

---

## Service Responsibilities

### `apps/backend` — REST API
- User auth (signup / signin → JWT)
- Space CRUD (create, read, list, delete)
- Space element management (add / remove elements inside a space)
- Admin operations (create elements, avatars, maps)
- Shared data queries (all elements, all avatars, bulk user metadata)

### `apps/ws` — WebSocket Server
- Maintains an in-memory **RoomManager** (singleton) mapping `spaceId → User[]`
- Handles `join`, `move` events from clients
- Broadcasts `user-joined`, `movement`, `user-left` to all other users in the same space
- Enforces movement rules (1-step per message, no diagonal)

### `apps/web` — Frontend
- Auth UI (signup / signin)
- Space creation and join by ID
- Real-time 2D arena rendered with CSS absolute positioning (tile size = 40 px)
- Keyboard input (WASD / Arrow keys) → WS `move` events

### `packages/db` — Shared DB Client
- Wraps Prisma 7 with the PG driver adapter (`@prisma/adapter-pg`)
- Exports `prismaClient` as a named export
- Consumed by both `backend` and `ws`

---

## Data Model

```
User ──────────────── Space (1 user owns many spaces)
 │                      │
 └── Avatar (optional)  └── SpaceElement ── Element
                                              │
Map ── MapElements ─────────────────────────┘
```

See [`docs/database.md`](./database.md) for full schema.

---

## Authentication & Authorization

| Layer | Mechanism |
|---|---|
| REST protected routes | `isUser` middleware — verifies JWT, attaches `userId` to `req` |
| REST admin routes | `isAdmin` middleware — verifies JWT + checks `role === "Admin"` |
| WebSocket | Token sent in `join` payload, verified with `jwt.verify` |

Token payload: `{ userId: string, role: "User" | "Admin" }`

> [!CAUTION]
> `JWT_SECRET` is currently hardcoded in `apps/backend/src/config/config.ts` and `apps/ws/src/config.ts`. Move it to an environment variable before deploying.

---

## WebSocket Room Model

```
RoomManager (singleton)
└── rooms: Map<spaceId, User[]>
    └── User
        ├── id: string          (random 10-char session ID)
        ├── userId: string      (DB user ID, set after join)
        ├── spaceId: string
        ├── x: number
        └── y: number
```

Spawn position is random within the space's `width × height` grid.

Movement is validated server-side: only 1-step moves in a single axis are accepted. Invalid moves return `movement-rejected` to the sender only.

---

## Inter-Service Communication

| From | To | Protocol | Details |
|---|---|---|---|
| `web` → `backend` | HTTP | REST/JSON | axios, `NEXT_PUBLIC_BACKEND_URL` |
| `web` → `ws` | WebSocket | JSON messages | native WS, `NEXT_PUBLIC_WS_URL` |
| `backend` → DB | TCP | Prisma + pg | `DATABASE_URL` in `packages/db/.env` |
| `ws` → DB | TCP | Prisma + pg | Same shared `@repo/db` client |

---

## Development Setup

```bash
# Install all workspace deps
bun install

# Run everything concurrently (turbo handles parallelism)
bun run dev

# Individual services
cd apps/backend && bun run dev   # port 8080
cd apps/ws      && bun run dev   # port 3001
cd apps/web     && bun run dev   # port 3000

# Run integration tests (backend + ws must be running first)
cd apps/test && bun test
```

### Required `.env` files

| File | Key variables |
|---|---|
| `packages/db/.env` | `DATABASE_URL` |
| `apps/backend/.env` | `PORT=8080` |
| `apps/web/.env.local` | `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WS_URL` |
