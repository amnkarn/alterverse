# Space Lobby & Real‑time Arena

A lightweight real‑time system that lets users:

1. **Enter a space lobby**  
2. **Choose an avatar and a display name**  
3. **Join an arena** where their presence and movements are broadcast to all other players via WebSocket.

## Architecture

- **Persistent data** – stored in PostgreSQL  
  - `Avatar(id, name, imageUrl)` – Cloudinary URLs for avatar images.  
  - `User(id, avatarId?, name?)` – Optional default avatar and global display name.

- **Temporary arena data** – kept in memory on the WebSocket server  
  ```ts
  type ConnectedPlayer = {
    userId: string;
    socketId: string;
    spaceId: string;
    displayName: string;
    avatarId: string;
    x: number;
    y: number;
  };
  ```

## WebSocket Message Flow

### Join a space
Client sends:
```json
{
  "type": "join-space",
  "spaceId": "space-id",
  "displayName": "Alex",
  "avatarId": "avatar-id"
}
```

Server actions:

1. Validate the user’s session.  
2. Verify the space exists.  
3. Verify the avatar exists.  
4. Add the player to the in‑memory room.  
5. Send the current player list to the newcomer.  
6. Broadcast a `player-joined` event to everyone else.

Broadcast example:
```json
{
  "type": "player-joined",
  "player": {
    "userId": "user-id",
    "displayName": "Alex",
    "avatarId": "avatar-id",
    "x": 200,
    "y": 150
  }
}
```

### Move a player
Client sends:
```json
{
  "type": "player-moved",
  "x": 240,
  "y": 160
}
```

Server validates the movement and broadcasts the updated position to other players.

## Persistence vs. Session Data

- **Persistent** (`Avatar`, `User`) – survives restarts, managed via PostgreSQL.  
- **Session‑only** (`ConnectedPlayer`) – lives only while the socket is open; disappears on disconnect.

Future enhancements may store default avatars/display names in `User.avatarId` and `User.name`, or add a `SpaceMember` table for persistent memberships, saved positions, bans, etc.

---

*This README provides a high‑level overview. Implementation details (database schema, server setup, authentication) are left for the codebase.*```