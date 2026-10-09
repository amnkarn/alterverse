Use one canonical map JSON format and derive rendering and collision from it.

## Recommended map structure

Keep map data separate from live player data:

```
export type MapElement = {
  id: string;
  elementId: string;
  x: number;
  y: number;
  rotation?: number;
  layer?: number;
  collision?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type GameMap = {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;

  floor: {
    image: string;
    tileColumns: number;
    tiles: number[];
  };

  walls: {
    image: string;
    tileColumns: number;
    tiles: number[];
    solidTiles: number[];
  };

  elements: MapElement[];

  spawnPoints: {
    x: number;
    y: number;
  }[];
};
```

Example:

```
{
  "id": "demo-map",
  "name": "Demo Plaza",
  "width": 1200,
  "height": 800,
  "tileSize": 32,
  "floor": {
    "image": "/assets/map/FloorAndGround.png",
    "tileColumns": 64,
    "tiles": []
  },
  "walls": {
    "image": "/assets/map/FloorAndGround.png",
    "tileColumns": 64,
    "tiles": [],
    "solidTiles": [29, 65, 85]
  },
  "elements": [
    {
      "id": "tree-1",
      "elementId": "tree",
      "x": 320,
      "y": 240,
      "collision": {
        "x": 12,
        "y": 28,
        "width": 40,
        "height": 20
      }
    }
  ],
  "spawnPoints": [
    { "x": 160, "y": 160 },
    { "x": 240, "y": 160 }
  ]
}
```

## Use one collision system

Every collision source should become a rectangle:

```
type CollisionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
```

Build collision rectangles from:

- Solid wall tiles
- Element collision boxes
- Map boundary

Then use the same function for movement:

```
function canMoveTo(x: number, y: number, map: GameMap) {
  const playerBox = {
    x: x - 12,
    y: y - 8,
    width: 24,
    height: 16,
  };

  if (
    x < 0 ||
    y < 0 ||
    x > map.width ||
    y > map.height
  ) {
    return false;
  }

  return map.elements.every((element) => {
    if (!element.collision) return true;

    const obstacle = {
      x: element.x + element.collision.x,
      y: element.y + element.collision.y,
      width: element.collision.width,
      height: element.collision.height,
    };

    return !rectsOverlap(playerBox, obstacle);
  });
}
```

Do not separately define walls in multiple files.

## Client responsibilities

The client should:

- Render the map
- Read the same map collision data
- Predict local movement smoothly


## Recommended development order

1. Create one clean `demo-map.json`.
2. Render only that map.
3. Add one consistent floor.
4. Add walls from map collision data.
5. Add elements with collision boxes.
6. Add fixed spawn points.

<!-- in futer, not right now!! -->
7. Fix local player collision.
8. Add WebSocket join/leave.
9. Add server-side movement validation.
10. Replace `demo-map.json` with database map data later.
