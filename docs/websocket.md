# WebSocket API Reference

WebSocket Server URL: `ws://localhost:3001`

The WebSocket server handles real-time multiplayer presence in a space — user join/leave events and avatar movement.

---

## Connection Lifecycle

```
Client                              WS Server
  │                                     │
  │──── connect() ─────────────────────►│  New User object created
  │                                     │
  │──── { type: "join", ... } ─────────►│  Auth + room assignment
  │◄─── { type: "space-joined", ... } ──│  Spawn position + existing users
  │                                     │
  │         [other users in room]       │
  │◄─── { type: "user-joined", ... } ───│  Broadcast to everyone else
  │                                     │
  │──── { type: "move", ... } ─────────►│  Movement request
  │◄─── { type: "movement", ... } ──────│  Broadcast if valid
  │◄─── { type: "movement-rejected" } ──│  Sent to mover only if invalid
  │                                     │
  │──── close() ────────────────────────►│
  │                                     │  user-left broadcast to room
```

---

## Message Format

All messages are JSON-encoded strings.

```
WebSocket.send(JSON.stringify({ type: string, payload: object }))
```

---

## Incoming Messages (Client → Server)

### `join`
Must be the **first message** sent after connecting. Authenticates the user and places them in a space.

```json
{
  "type": "join",
  "payload": {
    "spaceId": "uuid",
    "token": "<jwt from /signin>"
  }
}
```

**Server behaviour:**
1. Verifies the JWT — closes connection if invalid
2. Checks the space exists in DB — closes connection if not found
3. Assigns a random spawn position within the space grid
4. Adds the user to the in-memory room
5. Replies with `space-joined` to the joining client
6. Broadcasts `user-joined` to all other users in the room

---

### `move`
Request a movement to a new position.

```json
{
  "type": "move",
  "payload": {
    "x": 5,
    "y": 10
  }
}
```

**Validation rules:**
- Movement must be exactly **1 step** in a **single axis**
- `|newX - currentX| == 1 && newY == currentY` ✅  
- `newX == currentX && |newY - currentY| == 1` ✅  
- Any other delta → rejected

> [!NOTE]
> No boundary check is performed server-side during movement — bounds are only checked when placing elements via REST.

---

## Outgoing Messages (Server → Client)

### `space-joined`
Sent **only to the joining user** immediately after a successful `join`.

```json
{
  "type": "space-joined",
  "payload": {
    "spawn": {
      "x": 14,
      "y": 7
    },
    "users": [
      { "userId": "uuid", "x": 5, "y": 3 },
      { "userId": "uuid", "x": 12, "y": 9 }
    ]
  }
}
```

| Field | Description |
|---|---|
| `spawn` | The joining user's assigned starting position |
| `users` | All other users currently in the space (excludes the joiner) |

---

### `user-joined`
**Broadcast to all existing users** in the room when a new user joins.

```json
{
  "type": "user-joined",
  "payload": {
    "userId": "uuid",
    "x": 14,
    "y": 7
  }
}
```

---

### `movement`
**Broadcast to all other users** in the room when a valid move is made.

```json
{
  "type": "movement",
  "payload": {
    "userId": "uuid",
    "x": 6,
    "y": 10
  }
}
```

---

### `movement-rejected`
**Sent only to the mover** when a move is invalid (out-of-bounds delta or diagonal).

```json
{
  "type": "movement-rejected",
  "payload": {
    "x": 5,
    "y": 10
  }
}
```

`x` and `y` are the user's **current** (unchanged) position — the client should reset its local position to this.

---

### `user-left`
**Broadcast to all remaining users** in the room when a user disconnects.

```json
{
  "type": "user-left",
  "payload": {
    "userId": "uuid"
  }
}
```

---

## Room Manager

The server maintains one singleton `RoomManager` that holds all active rooms in memory:

```
RoomManager
  └── rooms: Map<spaceId, User[]>
```

- Rooms are created on first `join` for a space
- Users are added/removed from the array on join/disconnect
- There is **no persistence** — restarting the WS server clears all rooms

---

## Error Handling

| Scenario | Server action |
|---|---|
| Invalid JWT in `join` | `ws.close()` |
| Space not found in DB | `ws.close()` |
| Invalid move delta | Send `movement-rejected` |
| User disconnects | Broadcast `user-left`, remove from room |

---

## Example Client (vanilla JS)

```js
const ws = new WebSocket("ws://localhost:3001");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    payload: { spaceId: "your-space-id", token: "your-jwt" }
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "space-joined":
      console.log("Spawned at", msg.payload.spawn);
      console.log("Other users:", msg.payload.users);
      break;
    case "user-joined":
      console.log("User joined:", msg.payload.userId);
      break;
    case "movement":
      console.log("User moved:", msg.payload);
      break;
    case "movement-rejected":
      console.log("Move rejected, reset to:", msg.payload);
      break;
    case "user-left":
      console.log("User left:", msg.payload.userId);
      break;
  }
};

// Move right
ws.send(JSON.stringify({ type: "move", payload: { x: currentX + 1, y: currentY } }));
```
