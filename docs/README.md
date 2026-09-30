# Metaverse 2D — Documentation

Real-time multiplayer 2D metaverse platform built with a Turborepo + Bun monorepo.

---

## Docs

| Doc | Description |
|---|---|
| [Architecture](./architecture.md) | System overview, service responsibilities, auth model, dev setup |
| [REST API](./api.md) | All HTTP endpoints — request/response schemas, auth requirements, error codes |
| [WebSocket API](./websocket.md) | Real-time message protocol — connection lifecycle, all event types |
| [Database](./database.md) | Prisma schema, ER diagram, all models, migrations |

---

## Quick Reference

### Ports (local dev)

| Service | Port |
|---|---|
| Backend (REST) | 8080 |
| WebSocket server | 3001 |
| Frontend (Next.js) | 3000 |

### Auth
- Sign up → `POST /api/v1/signup`
- Sign in → `POST /api/v1/signin` → get `token`
- All protected routes: `Authorization: Bearer <token>`

### WebSocket flow
1. Connect to `ws://localhost:3001`
2. Send `{ type: "join", payload: { spaceId, token } }`
3. Receive `space-joined` with spawn position and current users
4. Send `{ type: "move", payload: { x, y } }` to move (1 step at a time)

### Run everything
```bash
bun install
bun run dev
```
