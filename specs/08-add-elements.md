# Add elements to the arena map

## Objective

Add chairs, tables, trees, computers, whiteboards, vending machines, and other objects to the arena map while preserving the map’s Tiled coordinates, tileset GIDs, render order, and collision behavior.

## Source of truth

Use Tiled as the map editor and source of truth.

```text
Editable map: apps/web/public/assets/map/map.tmx
Runtime export: apps/web/public/assets/map/map.json
```

Do not edit the large exported `map.json` tile arrays manually. Do not create another custom map format.

After changing the map:

1. Open `map.tmx` in Tiled.
2. Add or move the element in the correct layer.
3. Configure collision properties or collision objects.
4. Save the `.tmx` file.
5. Export the map to `map.json`.
6. Confirm all referenced images load from `apps/web/public`.

## Map coordinate system

The current map uses:

```text
Map size: 40 columns x 30 rows
Base tile size: 32x32 pixels
World size: 1280x960 pixels
```

Tiled object positions are world-pixel coordinates:

```text
worldX = tileColumn * 32
worldY = tileRow * 32
```

For example, tile column `8`, row `6` means:

```text
x = 256
y = 192
```

## Tilesets

The map uses multiple tilesets. Never render every GID using `FloorAndGround.png`.

| Tileset | First GID | Image | Tile size | Columns |
|---|---:|---|---:|---:|
| FloorAndGround | 1 | `FloorAndGround.png` | 32x32 | 64 |
| chair | 2561 | `chair.png` | 32x64 | 1 |
| Modern Office | 2584 | `Modern_Office_Black_Shadow.png` | 32x32 | 16 |
| Generic | 3432 | `Generic.png` | 32x32 | 16 |
| computer | 4680 | `computer.png` | 96x64 | 5 |
| whiteboard | 4685 | `whiteboard.png` | 64x64 | 1 |
| Basement | 4688 | `Basement.png` | 32x32 | 16 |
| vending machine | 5488 | `vendingmachine.png` | 48x72 | 1 |

For every tile GID:

```ts
const tileset = tilesets
  .slice()
  .sort((a, b) => b.firstgid - a.firstgid)
  .find((item) => gid >= item.firstgid);

const localTileId = gid - tileset.firstgid;
const sourceX = (localTileId % tileset.columns) * tileset.tilewidth;
const sourceY = Math.floor(localTileId / tileset.columns) * tileset.tileheight;
```

Use the selected tileset’s own image, tile size, and columns. Do not use one global tile size for every tileset.

## Element placement

Place elements on the appropriate Tiled object/tile layer, for example:

```text
Chair
Objects
ObjectsOnCollide
GenericObjects
GenericObjectsOnCollide
Computer
Whiteboard
Basement
VendingMachine
```

The element’s source frame comes from its GID and tileset. Its destination position comes from the Tiled object’s `x` and `y` values.

These are different values:

```text
sourceX/sourceY       = position inside the tileset image
destinationX/y        = position inside the game map
```

Example:

```json
{
  "gid": 2561,
  "x": 320,
  "y": 192,
  "width": 32,
  "height": 64
}
```

This means: resolve GID `2561` using the `chair` tileset and draw it at world position `(320, 192)`.

## Rendering order

Render elements in their Tiled layer order:

1. Ground
2. Walls and background objects
3. Objects behind players
4. Players
5. `ObjectsOnCollide` and foreground objects
6. HUD

Do not flatten all elements into the floor layer. Layer order determines whether the player appears in front of or behind an object.

## Collision

Use Tiled collision properties and object collision rectangles. Do not maintain a hardcoded list of wall GIDs.

For an element that blocks movement, define a collision rectangle over its physical footprint, not its entire visual image.

Example:

```json
{
  "x": 320,
  "y": 192,
  "width": 64,
  "height": 96,
  "properties": {
    "collides": true
  },
  "collision": {
    "x": 16,
    "y": 64,
    "width": 32,
    "height": 24
  }
}
```

The collision box should normally cover the element’s base or footprint, not its transparent upper pixels.

## Example AI instruction

```text
Add a chair to the arena map.

Use the existing chair tileset declared in map.json. Do not use FloorAndGround for this object and do not create a new PNG.

Place the chair at world position x=320, y=192 on the Chair layer.
Preserve the chair tileset's firstgid, tilewidth, tileheight, columns, and local tile ID.
Render the object using its resolved tileset source rectangle.
Add a collision rectangle only over the chair's physical base.
Export the edited map.tmx to map.json.
Do not edit the exported tile arrays manually.
```

## Debug mode

Add a development-only debug mode that displays:

- Layer name
- Object ID
- GID and local tile ID
- Tileset name
- Object bounds
- Collision rectangles

Collision rectangles should be red. Object bounds should be yellow. This debug mode must be used to verify that visual elements and collision boundaries align.

## Acceptance criteria

- Elements are loaded from the Tiled map rather than hardcoded in `ArenaPage.tsx`.
- Every GID resolves against the correct tileset.
- Elements render at their Tiled world positions.
- Elements preserve their correct dimensions and layer order.
- Missing asset paths produce a clear error instead of silently rendering the wrong image.
- Collision matches the visible physical footprint.
- The same map data can later be converted into `Map` and `MapElements` database records.
