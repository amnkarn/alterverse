// ─── Demo Space Data ──────────────────────────────────────────────────────────
// Mirrors the shape of the real DB schema so it can be swapped with live data

export interface DemoElement {
    id: string;
    elementId: string;
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DemoMap {
    id: string;
    name: string;
    /** Total pixel width of the world */
    width: number;
    /** Total pixel height of the world */
    height: number;
    tileSize: number;
    /** Path to the Tiled JSON file */
    tiledJsonUrl: string;
    /** Path to the ground tileset PNG */
    tilesetUrl: string;
    /** Path to the background pattern */
    backgroundUrl: string;
    /** Collision-enabled object layers baked in from the Tiled file */
    collisionLayers: string[];
    elements: DemoElement[];
}

export interface DemoSpace {
    id: string;
    name: string;
    map: DemoMap;
    /** Starting position for a new player (pixel coords) */
    spawnX: number;
    spawnY: number;
}

// ─── Map ──────────────────────────────────────────────────────────────────────

export const demoMap: DemoMap = {
    id: "demo-map",
    name: "Alterverse HQ",
    // 40 tiles × 32 px, 30 tiles × 32 px
    width: 40 * 32,   // 1280
    height: 30 * 32,  // 960
    tileSize: 32,
    tiledJsonUrl: "/assets/map/map.json",
    tilesetUrl: "/assets/map/FloorAndGround.png",
    backgroundUrl: "/assets/background/bg.png",
    // Which Tiled object-group layer names count as solid walls
    collisionLayers: ["Wall", "ObjectsOnCollide", "GenericObjectsOnCollide", "Whiteboard", "VendingMachine"],
    elements: [
        // These are decorative overlays rendered on top of the tile map.
        // Replace imageUrl with real asset paths as your pipeline grows.
        {
            id: "computer-1",
            elementId: "computer",
            imageUrl: "",   // rendered from tile sheet — placeholder
            x: 1152,
            y: 480,
            width: 96,
            height: 64,
        },
        {
            id: "whiteboard-1",
            elementId: "whiteboard",
            imageUrl: "",
            x: 928,
            y: 256,
            width: 64,
            height: 64,
        },
    ],
};

// ─── Space ────────────────────────────────────────────────────────────────────

export const demoSpace: DemoSpace = {
    id: "demo-space",
    name: "Alterverse HQ",
    map: demoMap,
    spawnX: 700,
    spawnY: 600,
};
