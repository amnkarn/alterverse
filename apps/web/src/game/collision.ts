import type { GameMap, CollisionRect } from "../types/map";

export function rectsOverlap(a: CollisionRect, b: CollisionRect): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/**
 * Builds unified collision rectangles from:
 * 1. Solid wall tiles and void (outside-boundary) tiles
 * 2. Element collision boxes
 */
export function buildCollisionRectangles(map: GameMap): CollisionRect[] {
    const solidSet = new Set(map.walls.solidTiles);
    const cols = Math.floor(map.width / map.tileSize);
    const rows = Math.floor(map.height / map.tileSize);
    const rects: CollisionRect[] = [];

    // 1. Solid wall tiles & void tiles (merged horizontally for efficiency)
    for (let r = 0; r < rows; r++) {
        let startC = -1;
        for (let c = 0; c <= cols; c++) {
            const isSolid =
                c < cols &&
                (solidSet.has(map.walls.tiles[r * cols + c]) ||
                    (map.floor.tiles[r * cols + c] === 0 && map.walls.tiles[r * cols + c] === 0));

            if (isSolid) {
                if (startC === -1) startC = c;
            } else {
                if (startC !== -1) {
                    rects.push({
                        x: startC * map.tileSize,
                        y: r * map.tileSize,
                        width: (c - startC) * map.tileSize,
                        height: map.tileSize,
                    });
                    startC = -1;
                }
            }
        }
    }

    // 2. Element collision boxes
    for (const element of map.elements) {
        if (element.collision) {
            rects.push({
                x: element.x + element.collision.x,
                y: element.y + element.collision.y,
                width: element.collision.width,
                height: element.collision.height,
            });
        }
    }

    return rects;
}

/**
 * Checks whether the player can move to the target foot position (footX, footY).
 * Player foot box: 24px wide × 16px high centered at (footX, footY).
 */
export function canMoveTo(
    footX: number,
    footY: number,
    map: GameMap,
    collisionRects: CollisionRect[]
): boolean {
    const playerBox: CollisionRect = {
        x: footX - 12,
        y: footY - 8,
        width: 24,
        height: 16,
    };

    // Map bounds check
    if (
        playerBox.x < 0 ||
        playerBox.y < 0 ||
        playerBox.x + playerBox.width > map.width ||
        playerBox.y + playerBox.height > map.height
    ) {
        return false;
    }

    // Obstacle rectangles check
    for (const obstacle of collisionRects) {
        if (rectsOverlap(playerBox, obstacle)) {
            return false;
        }
    }

    return true;
}

/**
 * Scales a GameMap's tileSize, width, height, elements, and spawn points by a scale factor.
 */
export function scaleGameMap(rawMap: GameMap, scale: number): GameMap {
    if (scale === 1) return rawMap;
    const scaledTileSize = Math.round(rawMap.tileSize * scale);
    const tileScale = scaledTileSize / rawMap.tileSize;
    const cols = Math.floor(rawMap.width / rawMap.tileSize);
    const rows = Math.floor(rawMap.height / rawMap.tileSize);

    return {
        ...rawMap,
        width: cols * scaledTileSize,
        height: rows * scaledTileSize,
        tileSize: scaledTileSize,
        elements: rawMap.elements.map((el) => ({
            ...el,
            x: Math.round(el.x * tileScale),
            y: Math.round(el.y * tileScale),
            collision: el.collision
                ? {
                      x: Math.round(el.collision.x * tileScale),
                      y: Math.round(el.collision.y * tileScale),
                      width: Math.round(el.collision.width * tileScale),
                      height: Math.round(el.collision.height * tileScale),
                  }
                : undefined,
        })),
        spawnPoints: rawMap.spawnPoints.map((sp) => ({
            x: Math.round(sp.x * tileScale),
            y: Math.round(sp.y * tileScale),
        })),
    };
}
