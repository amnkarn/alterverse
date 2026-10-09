# Arena map and element renderer specification

## Goal

Render the Tiled map with its floor, walls, and object layers exactly as authored. The renderer must support multiple tilesets and must use the same map data for rendering and collision.

The Tiled map is the source of truth. Do not maintain a second hand-written map format for the arena.

## Source files

- Map JSON: `apps/web/public/assets/map/map.json`
- Tiled source: `apps/web/public/assets/map/map.tmx`
- Main tileset: `apps/web/public/assets/map/FloorAndGround.png`
- Main tileset metadata: `apps/web/public/assets/map/FloorAndGround.json`
- Additional tilesets: `apps/web/public/assets/modern_tiles/`

The old `demo-map.json` is only a temporary fixture. The final renderer must load `map.json` and should not use `demo-map.json`.

## Map coordinate system

The map is orthogonal and uses:

```text
Map grid:       40 columns x 30 rows
Base tile size: 32 x 32 pixels
World size:     1280 x 960 pixels
```

Tiled object `x`, `y`, `width`, and `height` values are world-pixel values. Do not convert them to CSS coordinates or invent a second coordinate system.

## Tilesets

Every tileset has its own image, `firstgid`, tile dimensions, and column count. Never use one global image, tile size, or column count for all GIDs.

Known tilesets in `map.json`:

| Tileset | First GID | Image size | Tile size | Columns |
|---|---:|---:|---:|---:|
| FloorAndGround | 1 | 2048x1280 | 32x32 | 64 |
| chair | 2561 | 32x1472 | 32x64 | 1 |
| Modern_Office_Black_Shadow | 2584 | 512x1696 | 32x32 | 16 |
| Generic | 3432 | 512x2496 | 32x32 | 16 |
| computer | 4680 | 480x64 | 96x64 | 5 |
| whiteboard | 4685 | 64x192 | 64x64 | 1 |
| Basement | 4688 | 512x1600 | 32x32 | 16 |
| vendingmachine | 5488 | 48x72 | 48x72 | 1 |

The asset paths in `map.json` must resolve to files under `apps/web/public`. If a Tiled path such as `../items/chair.png` does not exist, either copy the matching asset to the expected public path or update the tileset path. Do not silently substitute a different tileset.

## GID resolution

For every non-zero GID, select the tileset with the greatest `firstgid` that is less than or equal to the GID:

```ts
const tileset = tilesets
  .slice()
  .sort((a, b) => b.firstgid - a.firstgid)
  .find((candidate) => gid >= candidate.firstgid);

const localTileId = gid - tileset.firstgid;
const sourceX = (localTileId % tileset.columns) * tileset.tilewidth;
const sourceY = Math.floor(localTileId / tileset.columns) * tileset.tileheight;
```

Render with the selected tileset's own source and destination dimensions:

```ts
ctx.drawImage(
  tileset.image,
  sourceX,
  sourceY,
  tileset.tilewidth,
  tileset.tileheight,
  worldX - camera.x,
  worldY - camera.y,
  tileset.tilewidth,
  tileset.tileheight,
);
```

If a tile has a Tiled offset or an object has a custom width/height, preserve that metadata instead of forcing it into a 32x32 rectangle.

## Layer order

Render layers in the order stored by Tiled. The current map contains layers including:

```text
Ground
Wall
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

Do not flatten all layers into one floor layer. The layer order controls whether an object appears behind or in front of a player.

Recommended frame order:

1. Ground tile layer
2. Wall and lower object layers
3. Objects behind players
4. Players
5. Objects-on-collide / foreground objects
6. HUD

Use each layer's Tiled `id`, `name`, `type`, `visible`, and `objects`/`data` fields. Hidden layers must not render.

## Elements and objects

An element is an object placed on the map using a tileset GID. It is not a new image file. The renderer must:

1. Read the object's GID.
2. Resolve the GID to the correct tileset.
3. Calculate the local tile ID and source rectangle.
4. Use the object's Tiled `x`, `y`, `width`, and `height` as world coordinates.
5. Render it in its original Tiled layer.

Do not guess an element's source frame from a screenshot.

## Collision

Collision must come from Tiled data, not a manually maintained list of wall GIDs.

Use tile properties such as:

```text
collides: true
```

Also use collision rectangles from object layers where present. Build a single list of world-space collision rectangles from:

- Solid tiles
- Wall objects
- Element collision objects
- Map boundaries

The client may use this list for responsive movement, but the WebSocket server must validate movement against the same map collision data.

Add a development-only collision overlay that draws collision rectangles in red and labels the layer/object that created each rectangle.

## Adding an element in Tiled

To add an element, edit the map in Tiled rather than editing the exported JSON manually:

1. Open `map.tmx` in Tiled.
2. Select the correct tileset.
3. Select the object/tile to place.
4. Place it on the appropriate layer.
5. Add or verify its collision property/object.
6. Save the `.tmx` file.
7. Export it to `map.json`.
8. Verify the asset path resolves under `public`.

Example instruction for an AI:

```text
Add a chair to the Tiled map.

Use the chair tileset declared in map.json, not FloorAndGround.
Resolve its frame from the chair tileset's firstgid and local tile ID.
Place it at world position x=320, y=192 on the Chair layer.
Preserve the object's Tiled width and height.
Add a collision rectangle only over the chair's occupied footprint.
Do not hardcode a global 32x32 source rectangle.
Do not create a new custom map JSON format.
```

## Debug requirements

Add development toggles for:

- Tile GID and local tile ID labels
- Tileset name labels
- Layer names
- Object bounds
- Collision rectangles
- Player collision box
- Map boundaries

These overlays are required before changing asset coordinates or collision behavior.

## Acceptance criteria

- `map.json` is the only runtime map source.
- All declared tilesets load without 404 errors.
- A tile from each tileset renders from the correct image and GID range.
- Floors and walls use the exact Tiled layer data.
- Chairs, tables, computers, whiteboards, basement objects, and vending machines render from their object layers.
- Visual collision boundaries align with rendered walls and objects.
- Players cannot leave the map or pass through solid objects.
- No hardcoded `WALL_GIDS` list is required.
