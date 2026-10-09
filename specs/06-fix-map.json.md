# Fix the map

* currently two map json files exist, and we are using demo-map.json, we should use map.json, use map.json with same data.

* remove unused json file

# We are using Tiled as the source of truth for the arena map.

Map files:
- Source map: apps/web/public/assets/map/map.json
- Tiled source: apps/web/public/assets/map/map.tmx
- Tileset image: apps/web/public/assets/map/FloorAndGround.png
- Tileset metadata: apps/web/public/assets/map/FloorAndGround.json

Tileset configuration:
- Image size: 2048x1280
- Tile size: 32x32
- Columns: 64
- First GID: 1

Tiled layers:
- Ground: floor tile layer
- Wall: wall/object layer
- Elements: objects placed on the map
- SpawnPoints: player spawn objects

Requirements:
1. Load map.json directly.
2. Render the Ground layer using its tile GIDs.
3. Render the Wall layer using its tile GIDs and object positions.
4. Use Tiled tile properties for collision instead of hardcoded wall GIDs.
5. Render map elements from the Elements object layer.
6. Keep the map coordinate system in 32px tiles.
7. Do not create a second custom map JSON format.
8. Do not guess tile frame coordinates from screenshots.
9. Preserve the original GIDs from Tiled.
10. Add debug mode that draws collision rectangles in red.
