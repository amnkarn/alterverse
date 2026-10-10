# We need to make the avtar si on the chair, tabls, computer tables - 

Use a seated interaction state:

```
type PlayerState = "idle" | "walking" | "sitting";
```

When the user sits:

1. Snap the player to a chair’s `sitPoint`.
2. Stop movement.
3. Use the first idle frame of the correct direction.
4. Render the avatar behind the chair.
5. Render the chair’s front/seat layer over the avatar’s lower body.

Example chair data:

```
{
  "id": "chair-1",
  "x": 320,
  "y": 192,
  "width": 32,
  "height": 64,
  "sitPoint": {
    "x": 336,
    "y": 232,
    "direction": "down"
  }
}
```

Rendering order:

```
floor
chair back
avatar
chair seat/front
other foreground objects
```

This hides the avatar’s legs and makes it look seated.

You can also crop the avatar while sitting:

```
ctx.drawImage(
  sprite,
  sourceX,
  sourceY,
  SPRITE_FRAME_W,
  42,              // only upper body
  drawX,
  drawY,
  PLAYER_RENDER_W,
  126
);
```

But layering the chair over the lower body usually looks better.

The sitting interaction should work like this:

```
Player presses E near chair
  ↓
Find chair sitPoint
  ↓
Move player to sitPoint
  ↓
Set state = "sitting"
  ↓
Disable movement
  ↓
Broadcast sitting state through WebSocket
```

WebSocket payload:

```
{
  "type": "player-state",
  "playerId": "user-123",
  "state": "sitting",
  "x": 336,
  "y": 232,
  "direction": "down"
}
```

When the user presses movement keys or leaves:

```
state = "walking"
```

Do not use a random walking frame as a seated pose. Use one stable idle frame and let the chair hide the lower part of the avatar.


use sitting frame based on(chair's direction, like if chair is on the direction of top to bottom then use the avtar/Down).