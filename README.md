
```
User opens a space
  ↓
Space lobby
  ↓
Select avatar + enter display name
  ↓
Join arena
  ↓
WebSocket broadcasts presence and position
```

Use two kinds of data:

### Persistent data

Store these in PostgreSQL:

```
Avatar
- id
- name
- imageUrl      ← Cloudinary URL

User
- avatarId      ← optional default avatar
- name          ← optional global display name
```

The admin uploads avatar images to Cloudinary, then saves the Cloudinary URL in the `Avatar` table.

### Temporary arena data

Store these in WebSocket server memory:

```
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

When a user joins:

```
{
  "type": "join-space",
  "spaceId": "space-id",
  "displayName": "Alex",
  "avatarId": "avatar-id"
}
```

The WebSocket server should then:

1. Validate the user’s session.
2. Verify that the space exists.
3. Verify that the avatar exists.
4. Add the player to the in-memory room.
5. Send the current players to the new user.
6. Broadcast the new player to everyone else.

Example broadcast:

```
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

When the player moves:

```
{
  "type": "player-moved",
  "x": 240,
  "y": 160
}
```

The server should validate movement and broadcast the updated position.

For your first version, keeping display name and selected avatar in memory is fine. They disappear when the user disconnects, which is normal for temporary presence data.

Later, if you want each user to have a saved default avatar or display name, update:

```
User.avatarId
User.name
```

A useful distinction:

```
User.avatarId       = user's default avatar
Join payload avatar = avatar chosen for this session
WebSocket memory    = current avatar/display name/position
```

You only need a database table such as `SpaceMember` later if you want persistent membership, saved player positions, private spaces, bans, or space-specific display names.