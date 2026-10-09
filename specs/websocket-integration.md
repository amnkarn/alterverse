## Fix the current WebSocket spawn bug

Your server currently has:

```
this.x = Math.floor(Math.random() * space.height);
this.y = Math.floor(Math.random() * space.width);
```

This is reversed. It should be:

```
this.x = Math.floor(Math.random() * space.width);
this.y = Math.floor(Math.random() * space.height);
```

But ideally, use map spawn points instead of random coordinates:

```
const spawn = map.spawnPoints[index % map.spawnPoints.length];

this.x = spawn.x;
this.y = spawn.y;
```
## Client and server responsibilities

The client should:

- Render the map
- Read the same map collision data
- Predict local movement smoothly
- Render other players
- Send intended position or input

The WebSocket server should:

- Validate the player’s session
- Validate the space
- Store each player’s position
- Reject movement outside the map
- Reject movement through collision rectangles
- Broadcast accepted positions

Do not trust the client’s position blindly.

## Recommended development order

1. Create one clean `demo-map.json`.
2. Render only that map.
3. Add one consistent floor.
4. Add walls from map collision data.
5. Add elements with collision boxes.
6. Add fixed spawn points.
7. Fix local player collision.
8. Add WebSocket join/leave.
9. Add server-side movement validation.
10. Replace `demo-map.json` with database map data later.

The arena should not receive random map pieces from different sources. It should receive one complete map object:

```
{
  map,
  players,
  localPlayer
}
```
