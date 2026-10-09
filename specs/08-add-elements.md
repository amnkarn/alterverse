## Add elements on map

For your current demo:

1. Use `Interiors_free_32x32.png` as one main tileset.
2. Create a tileset in Tiled from that image.
3. Build a small clean demo map with it.
4. Add a collision property to solid tiles.
5. Add elements through Tiled object/tile layers.
6. Export the map.
7. Make the frontend render that exported map.


# instruction:

```
Use this single tileset for the demo map:

Image:
apps/web/public/assets/modern_tiles/Interiors_free/32x32/Interiors_free_32x32.png

Image dimensions:
512x2848

Tile dimensions:
32x32

Columns:
16

Rows:
89

Use tileId to calculate the source rectangle:
sourceX = (tileId % 16) * 32
sourceY = floor(tileId / 16) * 32

Do not search for separate chair, tree, table, or computer PNG files.
All objects must be rendered from this atlas.

Use Tiled map coordinates in world pixels.
Use tile properties named `collides` for collision.
Add a debug mode showing tile IDs and collision rectangles.
```

So no, separate image files are not required. The only requirement is that the atlas tile positions are known and the map uses the same tileset metadata consistently.



# For your image:

```
Image: 512x2848
Tile size: 32x32

Columns = 512 / 32 = 16
Rows = 2848 / 32 = 89
```

So the atlas configuration is always:

```
const tileSize = 32;
const columns = 16;
const rows = 89;
```

For a tile ID:

```
const sourceX = (tileId % columns) * tileSize;
const sourceY = Math.floor(tileId / columns) * tileSize;
```

These are the coordinates inside the image.

There are two different positions:

```
sourceX/sourceY
  = where the image is located inside the atlas

destinationX/destinationY
  = where the element is placed inside the game map
```

Example:

```
ctx.drawImage(
  atlas,
  sourceX,
  sourceY,
  32,
  32,
  destinationX,
  destinationY,
  32,
  32,
);
```

If a tree is tile ID `25`:

```
sourceX = (25 % 16) * 32; // 288
sourceY = Math.floor(25 / 16) * 32; // 32
```

If you want to place it at map position `(320, 192)`:

```
destinationX = 320;
destinationY = 192;
```

So:

```
source rectangle:      (288, 32, 32, 32)
destination rectangle: (320, 192, 32, 32)
```

To find columns and rows:

```
columns = image width / tile width
rows = image height / tile height
```

For the available variants:

```
16x16 image: 256 / 16 = 16 columns
32x32 image: 512 / 32 = 16 columns
48x48 image: 768 / 48 = 16 columns
```
