# Database Schema

**Provider:** PostgreSQL (via Neon serverless)  
**ORM:** Prisma 7 with `@prisma/adapter-pg` driver adapter  
**Schema file:** [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)

---

## Entity Relationship Diagram

```
┌──────────┐         ┌────────────┐
│  Avatar  │         │    Map     │
│──────────│         │────────────│
│ id (PK)  │         │ id (PK)    │
│ imageUrl │         │ name       │
│ name     │         │ width      │
└────┬─────┘         │ height     │
     │ 0..1          │ thumbnail  │
     │               └─────┬──────┘
┌────▼─────┐               │ 1
│   User   │         ┌─────▼──────┐
│──────────│         │MapElements │
│ id (PK)  │         │────────────│
│ username │         │ id (PK)    │
│ password │         │ x          │
│ role     │    ┌────► elementsId │
│ avatarId │    │    │ mapId      │
└────┬─────┘    │    └────────────┘
     │ 1        │
     │          │    ┌─────────────┐
┌────▼──────┐   │    │   Element   │
│   Space   │   │    │─────────────│
│───────────│   └────┤ id (PK)     │
│ id (PK)   │        │ imageUrl    │
│ name      │        │ width       │
│ width     │        │ height      │
│ height    │        │ static      │
│ thumbnail │   ┌────┤             │
│ createrId │   │    └─────────────┘
└─────┬─────┘   │
      │ 1       │
┌─────▼──────┐  │
│SpaceElement│  │
│────────────│  │
│ id (PK)    │  │
│ x          │  │
│ y          │  │
│ spaceId    │  │
│ elementId  ├──┘
└────────────┘
```

---

## Models

### `User`

| Column | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | PK, unique, auto-generated |
| `username` | String | unique |
| `password` | String | bcrypt hashed |
| `role` | Role enum | default `User` |
| `avatarId` | String? | FK → Avatar.id (optional) |

**Relations:**
- `avatar` → `Avatar` (optional, many-to-one)
- `spaces` → `Space[]` (one-to-many)

---

### `Role` (enum)

```
Admin
User
```

---

### `Space`

| Column | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | PK, unique, auto-generated |
| `name` | String | — |
| `width` | Int | — |
| `height` | Int | — |
| `thumbnnail` | String? | optional *(note: typo in schema — double 'n')* |
| `createrId` | String | FK → User.id |

**Relations:**
- `creater` → `User`
- `elements` → `SpaceElement[]`

---

### `Avatar`

| Column | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | PK, unique, auto-generated |
| `imageUrl` | String? | optional |
| `name` | String? | optional |

**Relations:**
- `users` → `User[]`

---

### `Element`

Reusable world object (tile, furniture, decoration).

| Column | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | PK, unique, auto-generated |
| `width` | Int | — |
| `height` | Int | — |
| `static` | Boolean | true = can't be walked through |
| `imageUrl` | String | — |

**Relations:**
- `spaces` → `SpaceElement[]`
- `mapElements` → `MapElements[]`

---

### `SpaceElement`

Junction table — a specific placement of an Element inside a Space.

| Column | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | PK, unique, auto-generated |
| `elementId` | String | FK → Element.id |
| `spaceId` | String | FK → Space.id |
| `x` | Int | Grid X coordinate |
| `y` | Int | Grid Y coordinate |

---

### `Map`

A reusable map template with preset element positions. When a space is created from a map, its `MapElements` are copied into `SpaceElement` rows.

| Column | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | PK, unique, auto-generated |
| `width` | Int | — |
| `height` | Int | — |
| `name` | String | — |
| `thumbnail` | String | — |

**Relations:**
- `mapElements` → `MapElements[]`

---

### `MapElements`

Junction table — preset element positions within a Map template.

| Column | Type | Constraints |
|---|---|---|
| `id` | String (UUID) | PK, unique, auto-generated |
| `elementsId` | String | FK → Element.id |
| `mapId` | String | FK → Map.id |
| `x` | Int? | optional grid X |
| `y` | Int? | optional grid Y |

---

## Coordinate System

- Spaces are defined as `width × height` grids
- Origin `(0, 0)` is the top-left
- `x` increases rightward, `y` increases downward
- `dimensions` string format used in API: `"HEIGHTxWIDTH"` *(note: height comes first)*

---

## Migrations

Migration files are in `packages/db/prisma/migrations/`:

| Migration | Description |
|---|---|
| `20260614054850_schema_init` | Initial schema |
| `20260614133604_space_and_user_model_added` | Space + User models |
| `20260614172443_db_schema_completed` | Full schema with elements, avatars, maps |
| `20260930123830_map_schema_update` | Map schema update |
| `20260930123934_map_schema_update` | Map schema update (follow-up) |

---

## Connection Setup

The `@repo/db` package initialises Prisma with the PG driver adapter:

```ts
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prismaClient = new PrismaClient({ adapter });
```

The `DATABASE_URL` is loaded from `packages/db/.env`.

---

## Running Migrations

```bash
cd packages/db
bunx prisma migrate dev    # create + apply new migration
bunx prisma migrate deploy # apply to production
bunx prisma generate       # regenerate the Prisma client
bunx prisma studio         # open Prisma Studio GUI
```
