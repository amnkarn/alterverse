import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { demoSpace } from "../data/demo-data";
import type { GameMap, CollisionRect, RemotePlayer, MapElement, TilesetDef, PlayerState, CharacterId } from "../types/map";
import { buildCollisionRectangles, canMoveTo, scaleGameMap } from "../game/collision";

// ─── Scale & Zoom Config ──────────────────────────────────────────────────────
// Zooms map tiles, walls, and background without changing avatar size
const MAP_SCALE = 1.8;

// ─── Character Options & Config (specs/11-change-character.md) ─────────────────
interface CharacterOption {
    id: CharacterId;
    label: string;
    fullName: string;
    house: string;
    description: string;
    preview: string;
}

function resolveCharacterId(avatarName?: string | null): CharacterId {
    if (!avatarName) return "Harry";
    const lower = avatarName.toLowerCase();
    if (lower.includes("herm")) return "Hermoine";
    if (lower.includes("ron")) return "Ron";
    if (lower.includes("ginny")) return "Ginny";
    return "Harry";
}

const CHARACTER_OPTIONS: CharacterOption[] = [
    {
        id: "Harry",
        label: "Harry",
        fullName: "Harry Potter",
        house: "Gryffindor",
        description: "The Boy Who Lived",
        preview: "/assets/character/single/Harry_idle_anim_1.png",
    },
    {
        id: "Hermoine",
        label: "Hermione",
        fullName: "Hermione Granger",
        house: "Gryffindor",
        description: "Brightest Witch of Her Age",
        preview: "/assets/character/single/Hermoine_idle_anim_1.png",
    },
    {
        id: "Ron",
        label: "Ron",
        fullName: "Ron Weasley",
        house: "Gryffindor",
        description: "Loyal Strategist & Keeper",
        preview: "/assets/character/single/Ron_idle_anim_1.png",
    },
    {
        id: "Ginny",
        label: "Ginny",
        fullName: "Ginny Weasley",
        house: "Gryffindor",
        description: "Fierce Chaser & Duellist",
        preview: "/assets/character/single/Ginny_idle_anim_1.png",
    },
];

// Single frame dimensions: 32×48 px per spec
const CHAR_FRAME_W = 32;
const CHAR_FRAME_H = 48;
const CHAR_SCALE   = 2.2;
const CHAR_RENDER_W = Math.round(CHAR_FRAME_W * CHAR_SCALE); // ~70 px
const CHAR_RENDER_H = Math.round(CHAR_FRAME_H * CHAR_SCALE); // ~106 px

// Foot-level collision box offset (centered at player shoes for natural RPG movement)
const FEET_OFFSET_Y = Math.round(CHAR_RENDER_H / 2 - 8); // ~45 px
const PLAYER_SPEED  = 7;

// Animation timing and directional spritesheet layout (4 directions x 6 frames each)
const TOTAL_ANIM_FRAMES = 24;
const FRAMES_PER_DIR = 6;
const DIRECTION_FRAME_OFFSET: Record<"right" | "up" | "left" | "down", number> = {
    right: 0,   // frames 1..6
    up: 6,      // frames 7..12
    left: 12,   // frames 13..18
    down: 18,   // frames 19..24
};
const RUN_FPS  = 12; // 12 FPS: smooth walking stride (6 frames per cycle = 0.5s)
const IDLE_FPS = 4;  // 4 FPS: gentle idle breathing cycle within current facing direction

interface CharacterFrameSet {
    idle: HTMLImageElement[];
    run: HTMLImageElement[];
    sit: {
        down: HTMLImageElement;
        up: HTMLImageElement;
        left: HTMLImageElement;
        right: HTMLImageElement;
    };
}

async function loadCharacterFrames(charId: CharacterId): Promise<CharacterFrameSet> {
    const idlePromises = Array.from({ length: TOTAL_ANIM_FRAMES }, (_, i) =>
        loadImage(`/assets/character/single/${charId}_idle_anim_${i + 1}.png`)
    );
    const runPromises = Array.from({ length: TOTAL_ANIM_FRAMES }, (_, i) =>
        loadImage(`/assets/character/single/${charId}_run_${i + 1}.png`)
    );
    const sitDownP  = loadImage(`/assets/character/single/${charId}_sit_down.png`);
    const sitUpP    = loadImage(`/assets/character/single/${charId}_sit_up.png`);
    const sitLeftP  = loadImage(`/assets/character/single/${charId}_sit_left.png`);
    const sitRightP = loadImage(`/assets/character/single/${charId}_sit_right.png`);

    const [idle, run, sitDown, sitUp, sitLeft, sitRight] = await Promise.all([
        Promise.all(idlePromises),
        Promise.all(runPromises),
        sitDownP,
        sitUpP,
        sitLeftP,
        sitRightP,
    ]);

    return {
        idle,
        run,
        sit: {
            down: sitDown,
            up: sitUp,
            left: sitLeft,
            right: sitRight,
        },
    };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

// ─── Render Helpers ──────────────────────────────────────────────────────────

function drawGround(
    ctx: CanvasRenderingContext2D,
    tileset: HTMLImageElement,
    map: GameMap,
    camX: number,
    camY: number,
    vw: number,
    vh: number
) {
    const tileSize = map.tileSize; // 48px at 1.5× scale
    const srcTileSize = 32;        // original tileset tile dimension
    const tileCols = map.floor.tileColumns;
    const mapCols = Math.floor(map.width / tileSize);
    const mapRows = Math.floor(map.height / tileSize);

    const c0 = Math.max(0, Math.floor(camX / tileSize));
    const c1 = Math.min(mapCols, Math.ceil((camX + vw) / tileSize) + 1);
    const r0 = Math.max(0, Math.floor(camY / tileSize));
    const r1 = Math.min(mapRows, Math.ceil((camY + vh) / tileSize) + 1);

    for (let row = r0; row < r1; row++) {
        for (let col = c0; col < c1; col++) {
            const idx = row * mapCols + col;
            const floorGid = map.floor.tiles[idx];
            const wallGid = map.walls.tiles[idx];
            const destX = col * tileSize - camX;
            const destY = row * tileSize - camY;

            // Render floor tile
            if (floorGid && floorGid > 0) {
                const tid = floorGid - 1;
                const sx = (tid % tileCols) * srcTileSize;
                const sy = Math.floor(tid / tileCols) * srcTileSize;
                ctx.drawImage(tileset, sx, sy, srcTileSize, srcTileSize, destX, destY, tileSize, tileSize);
            }

            // Render wall tile
            if (wallGid && wallGid > 0) {
                const tid = wallGid - 1;
                const sx = (tid % tileCols) * srcTileSize;
                const sy = Math.floor(tid / tileCols) * srcTileSize;
                ctx.drawImage(tileset, sx, sy, srcTileSize, srcTileSize, destX, destY, tileSize, tileSize);
            }
        }
    }
}

const LAYER_PRIORITY: Record<string, number> = {
    wall: 100,
    chair: 20,
    objects: 30,
    objectsoncollide: 40,
    genericobjects: 50,
    genericobjectsoncollide: 60,
    basement: 65,
    computer: 70,
    whiteboard: 75,
    vendingmachine: 80,
};

function findNearestSittable(
    footX: number,
    footY: number,
    elements: MapElement[]
): MapElement | null {
    const PROXIMITY_THRESHOLD = 58;
    let closest: MapElement | null = null;
    let minDist = Infinity;

    for (const el of elements) {
        const layer = (el.layerName ?? "").toLowerCase();
        const elementId = (el.elementId ?? "").toLowerCase();
        const id = (el.id ?? "").toLowerCase();

        // Only allow actual chairs and sofas (strictly excluding tables, desks, computers, etc.)
        const isChairOrSofa =
            layer === "chair" ||
            layer === "sofa" ||
            layer === "couch" ||
            elementId === "chair" ||
            elementId === "sofa" ||
            elementId === "couch" ||
            id.startsWith("chair") ||
            id.startsWith("sofa") ||
            id.startsWith("couch") ||
            Boolean(el.properties?.some((p) => p.name === "isSittable" && p.value === true));

        if (!isChairOrSofa) continue;

        const w = el.width ?? 32;
        const h = el.height ?? 32;
        const dx = Math.max(el.x - footX, 0, footX - (el.x + w));
        const dy = Math.max(el.y - footY, 0, footY - (el.y + h));
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= PROXIMITY_THRESHOLD && dist < minDist) {
            minDist = dist;
            closest = el;
        }
    }
    return closest;
}

function getElementSitPoint(
    el: MapElement,
    _currentFootX?: number,
    currentFootY?: number
): { x: number; y: number; direction: "down" | "left" | "right" | "up" } {
    if (el.sitPoint) {
        return {
            x: el.sitPoint.x,
            y: el.sitPoint.y,
            direction: el.sitPoint.direction ?? "down",
        };
    }

    const w = el.width ?? 32;
    const h = el.height ?? 32;
    const dirProp = el.properties?.find((p) => p.name === "direction")?.value as
        | "down"
        | "left"
        | "right"
        | "up"
        | undefined;

    let dir: "down" | "left" | "right" | "up" = dirProp ?? "down";
    let sitX = el.x + w / 2;
    let sitY: number;

    if (dir === "down") {
        sitY = el.y + h * 0.625;
    } else if (dir === "up") {
        sitY = el.y + h * 0.38;
    } else if (dir === "left") {
        sitX = el.x + w * 0.45;
        sitY = el.y + h * 0.5;
    } else if (dir === "right") {
        sitX = el.x + w * 0.55;
        sitY = el.y + h * 0.5;
    } else {
        if (currentFootY !== undefined && currentFootY > el.y + h / 2) {
            dir = "up";
            sitY = el.y + h * 0.38;
        } else {
            dir = "down";
            sitY = el.y + h * 0.625;
        }
    }

    return { x: Math.round(sitX), y: Math.round(sitY), direction: dir };
}

function resolveTilesetUrl(imagePath: string): string {
    if (imagePath.startsWith("/assets/")) return imagePath;
    if (imagePath === "FloorAndGround.png" || imagePath.endsWith("/FloorAndGround.png")) {
        return "/assets/map/FloorAndGround.png";
    }
    if (imagePath.startsWith("../items/")) {
        return "/assets/modern_tiles/" + imagePath.slice("../items/".length);
    }
    if (imagePath.startsWith("../tileset/")) {
        return "/assets/modern_tiles/" + imagePath.slice("../tileset/".length);
    }
    if (imagePath.includes("/")) {
        const basename = imagePath.split("/").pop();
        return `/assets/modern_tiles/${basename}`;
    }
    return `/assets/modern_tiles/${imagePath}`;
}

function resolveTile(gid: number, tilesets: TilesetDef[]) {
    const ts = tilesets
        .slice()
        .sort((a, b) => b.firstgid - a.firstgid)
        .find((item) => gid >= item.firstgid);
    if (!ts) return null;

    const localTileId = gid - ts.firstgid;
    const sourceX = (localTileId % ts.columns) * ts.tilewidth;
    const sourceY = Math.floor(localTileId / ts.columns) * ts.tileheight;
    return {
        tileset: ts,
        localTileId,
        sourceX,
        sourceY,
        tilewidth: ts.tilewidth,
        tileheight: ts.tileheight,
    };
}

function drawElement(
    ctx: CanvasRenderingContext2D,
    el: MapElement,
    tilesets: TilesetDef[],
    tilesetImages: Map<string, HTMLImageElement>,
    camX: number,
    camY: number,
    vw: number,
    vh: number
) {
    if (!el.gid) return;
    const resolved = resolveTile(el.gid, tilesets);
    if (!resolved) return;
    const img = tilesetImages.get(resolved.tileset.name);
    if (!img) return;

    const destX = el.x - camX;
    const destY = el.y - camY;
    const destW = el.width ?? resolved.tilewidth;
    const destH = el.height ?? resolved.tileheight;

    // Viewport frustum culling
    if (destX + destW < 0 || destX > vw || destY + destH < 0 || destY > vh) {
        return;
    }

    ctx.drawImage(
        img,
        resolved.sourceX,
        resolved.sourceY,
        resolved.tilewidth,
        resolved.tileheight,
        destX,
        destY,
        destW,
        destH
    );
}

function isForegroundElement(element: MapElement) {
    const layer = (element.layerName ?? "").toLowerCase();
    return layer === "wall" || layer.includes("oncollide");
}

function drawPlayer(
    ctx: CanvasRenderingContext2D,
    charactersMap: Map<CharacterId, CharacterFrameSet>,
    sx: number,
    sy: number,
    charId: CharacterId,
    state: "idle" | "walking" | "sitting",
    dir: "down" | "left" | "right" | "up",
    currentFrame: number,
    username: string,
    isLocal: boolean,
    chatMessage?: string
) {
    const charSet = charactersMap.get(charId) || charactersMap.get("Harry");
    const dw = CHAR_RENDER_W;
    const dh = CHAR_RENDER_H;
    const dx = sx - dw / 2;
    const dy = sy - dh / 2;

    if (charSet) {
        let frameImg: HTMLImageElement | undefined;

        if (state === "sitting") {
            // Sitting: exact static sitting sprite for direction
            frameImg = charSet.sit[dir] || charSet.sit.down;
        } else {
            // Map direction + anim frame (1..6) to correct spritesheet slice
            const dirOffset = DIRECTION_FRAME_OFFSET[dir] ?? 18;
            const animIndex = ((Math.max(1, currentFrame) - 1) % FRAMES_PER_DIR);
            const frameIdx = dirOffset + animIndex;

            if (state === "walking") {
                frameImg = charSet.run[frameIdx] || charSet.run[dirOffset];
            } else {
                frameImg = charSet.idle[frameIdx] || charSet.idle[dirOffset];
            }
        }

        if (frameImg) {
            ctx.drawImage(frameImg, dx, dy, dw, dh);
        }
    } else {
        ctx.fillStyle = isLocal ? "#8b5cf6" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(sx, sy, 22, 0, Math.PI * 2);
        ctx.fill();
    }

    // Comic speech bubble if active chat message
    let bubbleTopY = dy - 6;
    if (chatMessage && chatMessage.trim()) {
        ctx.save();
        ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
        const msgText = chatMessage.trim();
        const textW = ctx.measureText(msgText).width;
        const bubbleW = Math.max(60, textW + 24);
        const bubbleH = 28;
        const bubbleX = sx - bubbleW / 2;
        const bubbleY = dy - bubbleH - 12;
        bubbleTopY = bubbleY - 4;

        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
        ctx.fill();

        // Little speech pointer
        ctx.beginPath();
        ctx.moveTo(sx - 5, bubbleY + bubbleH);
        ctx.lineTo(sx + 5, bubbleY + bubbleH);
        ctx.lineTo(sx, bubbleY + bubbleH + 6);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = "#0f172a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(msgText, sx, bubbleY + bubbleH / 2);
        ctx.restore();
    }

    // Name tag above avatar head
    ctx.save();
    ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const nameLabel = username || "Player";
    const tw = ctx.measureText(nameLabel).width;
    const tagY = Math.min(dy - 4, bubbleTopY);
    const px = 8;
    const py = 4;

    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.beginPath();
    ctx.roundRect(sx - tw / 2 - px, tagY - 15 - py, tw + px * 2, 15 + py * 2, 6);
    ctx.fill();

    ctx.fillStyle = isLocal ? "#c4b5fd" : "#7dd3fc";
    ctx.fillText(nameLabel, sx, tagY);
    ctx.restore();
}



export default function ArenaPage() {
    const navigate          = useNavigate();
    const location          = useLocation();
    const { data: session } = useSession();

    // Navigation state passed from SpacePage
    const navState = location.state as {
        spaceId?: string;
        avatarId?: string;
        avatar?: { id: string; imageUrl: string; name: string };
        displayName?: string;
    } | null;
    const displayName = navState?.displayName || session?.user?.name || "Player";

    // ── Canonical GameMap state & collision (scaled) ──────────────────────
    const initialScaledMap = scaleGameMap(demoSpace.map, MAP_SCALE);
    const [map, setMap] = useState<GameMap>(initialScaledMap);
    const mapRef = useRef<GameMap>(initialScaledMap);
    const collisionRectsRef = useRef<CollisionRect[]>(buildCollisionRectangles(initialScaledMap));

    // ── Collision debug mode (Requirement 10: Toggle with 'C' key or ?debug=true) ──
    const [debugMode, setDebugMode] = useState<boolean>(() => {
        return typeof window !== "undefined" && window.location.search.includes("debug");
    });
    const debugModeRef = useRef<boolean>(debugMode);
    useEffect(() => {
        debugModeRef.current = debugMode;
    }, [debugMode]);

    useEffect(() => {
        mapRef.current = map;
        collisionRectsRef.current = buildCollisionRectangles(map);
    }, [map]);

    // ── Canvas ref ────────────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ── Mutable game state & Extended State Matrix (specs/11-change-character.md) ──
    const defaultSpawn = initialScaledMap.spawnPoints[0] ?? { x: 1050, y: 900 };
    const initialDprRef     = useRef<number>(window.devicePixelRatio || 1);
    const keysRef           = useRef<Set<string>>(new Set());

    const initialCharacter = resolveCharacterId(
        navState?.avatar?.name ||
            (typeof window !== "undefined" ? localStorage.getItem("alterverse_avatar_name") : null)
    );
    const currentUsername = displayName;
    const currentSpaceId = navState?.spaceId || "demo-space";

    const playerRef = useRef<{
        name: CharacterId;
        username: string;
        state: "idle" | "walking" | "sitting";
        direction: "down" | "left" | "right" | "up";
        currentFrame: number;
        globalX: number;
        globalY: number;
        get x(): number;
        set x(val: number);
        get y(): number;
        set y(val: number);
        get frame(): number;
        set frame(val: number);
    }>({
        name: initialCharacter,
        username: displayName,
        state: "idle",
        direction: "down",
        currentFrame: 1,
        globalX: defaultSpawn.x,
        globalY: defaultSpawn.y,
        get x() { return this.globalX; },
        set x(val: number) { this.globalX = val; },
        get y() { return this.globalY; },
        set y(val: number) { this.globalY = val; },
        get frame() { return this.currentFrame; },
        set frame(val: number) { this.currentFrame = val; },
    });

    const cameraRef         = useRef({ x: 0, y: 0 });
    const remotePlayersRef  = useRef<Map<string, RemotePlayer>>(new Map());
    const lastFrameTimeRef  = useRef(0);
    const animAccRef        = useRef(0);
    const rafRef            = useRef<number>(0);

    // ── Loaded assets (multi-frame character sets cached) ─────────────────
    const assetsRef = useRef<{
        characters?:   Map<CharacterId, CharacterFrameSet>;
        floorTileset?: HTMLImageElement;
        tilesetImages?: Map<string, HTMLImageElement>;
        bgPattern?:    CanvasPattern | null;
    }>({});

    // ── Sitting state & WebSocket sync ────────────────────────────────────
    const [, setPlayerState] = useState<PlayerState>("idle");
    const seatedElementRef = useRef<MapElement | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const localPlayerIdRef = useRef<string | null>(null);

    useEffect(() => {
        const wsUrl = "ws://localhost:3001";
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to websocket server", { spaceId: currentSpaceId });
            ws.send(JSON.stringify({
                type: "join",
                payload: {
                    spaceId: currentSpaceId,
                    displayName,
                    avatarId: navState?.avatarId || navState?.avatar?.id,
                    character: initialCharacter,
                },
            }));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data) as {
                type: string;
                payload?: any;
            };
            console.log("WebSocket message:", message);

            if (message.type === "space-joined") {
                const self = message.payload?.self;
                if (self) {
                    localPlayerIdRef.current = self.playerId;
                    playerRef.current.globalX = self.x;
                    playerRef.current.globalY = self.y;
                    playerRef.current.direction = self.direction || "down";
                }

                remotePlayersRef.current.clear();
                for (const user of message.payload?.users || []) {
                    remotePlayersRef.current.set(user.playerId, {
                        id: user.playerId,
                        playerId: user.playerId,
                        x: user.x,
                        y: user.y,
                        direction: user.direction || "down",
                        frame: user.frame || 1,
                        displayName: user.displayName || "Player",
                        state: user.state || "idle",
                        character: user.character as CharacterId | undefined,
                    });
                }
                console.log("Remote players after join:", remotePlayersRef.current.size);
            } else if (message.type === "user-joined" || message.type === "movement") {
                const user = message.payload;
                if (user?.playerId && user.playerId !== localPlayerIdRef.current) {
                    remotePlayersRef.current.set(user.playerId, {
                        id: user.playerId,
                        playerId: user.playerId,
                        x: user.x,
                        y: user.y,
                        direction: user.direction || "down",
                        frame: user.frame || 1,
                        displayName: user.displayName || "Player",
                        state: user.state || "idle",
                        character: user.character as CharacterId | undefined,
                    });
                    console.log("Remote player updated:", user.playerId, "total:", remotePlayersRef.current.size);
                }
            } else if (message.type === "user-left") {
                remotePlayersRef.current.delete(message.payload?.playerId);
            }
        };

        ws.onerror = (event) => {
            console.error("WebSocket error:", event);
        };

        ws.onclose = () => {
            if (wsRef.current === ws) wsRef.current = null;
        };

        const leaveArena = () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "leave" }));
                ws.close();
            }
        };

        window.addEventListener("pagehide", leaveArena);
        window.addEventListener("beforeunload", leaveArena);

        return () => {
            window.removeEventListener("pagehide", leaveArena);
            window.removeEventListener("beforeunload", leaveArena);
            leaveArena();
            if (ws.readyState !== WebSocket.CLOSED) ws.close();
            remotePlayersRef.current.clear();
            localPlayerIdRef.current = null;
            if (wsRef.current === ws) wsRef.current = null;
        };
    }, [currentSpaceId, displayName, initialCharacter, navState?.avatarId, navState?.avatar?.id, session?.user?.id]);

    // ── Packet hook: onPlayerStateChange ──────────────────────────────────
    const onPlayerStateChange = useCallback(
        (player: {
            name: CharacterId;
            username: string;
            state: "idle" | "walking" | "sitting";
            direction: "down" | "left" | "right" | "up";
            currentFrame: number;
            globalX: number;
            globalY: number;
        }) => {
            const payload = {
                type: "player-state",
                payload: {
                    x: player.globalX,
                    y: player.globalY,
                    state: player.state,
                    direction: player.direction,
                    frame: player.currentFrame,
                    character: player.name,
                    displayName: player.username,
                },
            };
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(payload));
            }
        },
        [session?.user?.id]
    );

    // Keep playerRef username updated when displayName/currentUsername changes
    useEffect(() => {
        playerRef.current.username = currentUsername;
    }, [currentUsername]);

    // ── Main game loop ────────────────────────────────────────────────────
    const gameLoopRef = useRef<((ts: number) => void) | null>(null);

    const gameLoop = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const vw = canvas.width;
        const vh = canvas.height;
        const dt = lastFrameTimeRef.current > 0 ? Math.min(timestamp - lastFrameTimeRef.current, 50) : 16.67;
        lastFrameTimeRef.current = timestamp;

        const currentMap = mapRef.current;
        const collisionRects = collisionRectsRef.current;
        const assets = assetsRef.current;
        const keys   = keysRef.current;
        const player = playerRef.current;
        const camera = cameraRef.current;

        // ── Movement & collision logic ────────────────────────────────────
        let vx = 0;
        let vy = 0;
        if (keys.has("arrowleft")  || keys.has("keya") || keys.has("a")) vx -= 1;
        if (keys.has("arrowright") || keys.has("keyd") || keys.has("d")) vx += 1;
        if (keys.has("arrowup")    || keys.has("keyw") || keys.has("w")) vy -= 1;
        if (keys.has("arrowdown")  || keys.has("keys") || keys.has("s")) vy += 1;

        if (player.state === "sitting") {
            // Movement strictly disabled while sitting - only key 'E' allows standing up
            vx = 0;
            vy = 0;
        }

        let moved = false;

        if (vx !== 0 || vy !== 0) {
            if (player.state !== "walking") {
                player.state = "walking";
                setPlayerState("walking");
            }
            const prevDir = player.direction;
            if (vy > 0) player.direction = "down";
            else if (vy < 0) player.direction = "up";
            else if (vx < 0) player.direction = "left";
            else if (vx > 0) player.direction = "right";

            if (player.direction !== prevDir) {
                onPlayerStateChange(player);
            }

            // Compensate speed across browser zoom levels and delta-time so movement stays constant
            const dtFactor = Math.min(Math.max(dt / (1000 / 60), 0.5), 2.5);
            const currentDpr = window.devicePixelRatio || 1;
            const baseDpr = initialDprRef.current || 1;
            const zoomCompensation = Math.max(0.3, Math.min(3.0, baseDpr / currentDpr));
            const effectiveSpeed = PLAYER_SPEED * dtFactor * zoomCompensation;

            const dx = vx * effectiveSpeed;
            const dy = vy * effectiveSpeed;
            const curFootX = player.globalX;
            const curFootY = player.globalY + FEET_OFFSET_Y;

            // Test X axis independently with pixel-stepping on contact for smooth sliding
            if (dx !== 0) {
                const targetFootX = curFootX + dx;
                if (canMoveTo(targetFootX, curFootY, currentMap, collisionRects)) {
                    player.globalX += dx;
                    moved = true;
                } else {
                    const step = Math.sign(dx);
                    const totalDist = Math.abs(dx);
                    let fx = curFootX;
                    let advanced = 0;
                    while (advanced + 1 <= totalDist) {
                        if (canMoveTo(fx + step, curFootY, currentMap, collisionRects)) {
                            fx += step;
                            player.globalX += step;
                            advanced += 1;
                            moved = true;
                        } else {
                            break;
                        }
                    }
                    const rem = totalDist - advanced;
                    if (rem > 0 && canMoveTo(fx + step * rem, curFootY, currentMap, collisionRects)) {
                        player.globalX += step * rem;
                        moved = true;
                    }
                }
            }

            // Test Y axis independently with pixel-stepping on contact for smooth sliding
            if (dy !== 0) {
                const updatedFootX = player.globalX;
                const targetFootY = curFootY + dy;
                if (canMoveTo(updatedFootX, targetFootY, currentMap, collisionRects)) {
                    player.globalY += dy;
                    moved = true;
                } else {
                    const step = Math.sign(dy);
                    const totalDist = Math.abs(dy);
                    let fy = curFootY;
                    let advanced = 0;
                    while (advanced + 1 <= totalDist) {
                        if (canMoveTo(updatedFootX, fy + step, currentMap, collisionRects)) {
                            fy += step;
                            player.globalY += step;
                            advanced += 1;
                            moved = true;
                        } else {
                            break;
                        }
                    }
                    const rem = totalDist - advanced;
                    if (rem > 0 && canMoveTo(updatedFootX, fy + step * rem, currentMap, collisionRects)) {
                        player.globalY += step * rem;
                        moved = true;
                    }
                }
            }
        }

        // ── Animation Frame Updates (specs/11-change-character.md) ────────
        if (player.state === "walking" && moved) {
            animAccRef.current += dt;
            const mspf = 1000 / RUN_FPS;
            if (animAccRef.current >= mspf) {
                player.currentFrame = (player.currentFrame % FRAMES_PER_DIR) + 1;
                animAccRef.current -= mspf;
                onPlayerStateChange(player);
            }
        } else if (player.state === "idle" || (!moved && player.state === "walking")) {
            if (player.state === "walking") {
                player.state = "idle";
                setPlayerState("idle");
                player.currentFrame = 1;
                animAccRef.current = 0;
                onPlayerStateChange(player);
            }
            // Loop idle anim frames slowly within current direction
            animAccRef.current += dt;
            const mspf = 1000 / IDLE_FPS;
            if (animAccRef.current >= mspf) {
                player.currentFrame = (player.currentFrame % FRAMES_PER_DIR) + 1;
                animAccRef.current -= mspf;
            }
        } else if (player.state === "sitting") {
            // Stop frame increments completely
            animAccRef.current = 0;
            player.currentFrame = 1;
        }

        // ── Camera: center map if viewport is larger, follow player if smaller
        if (vw >= currentMap.width) {
            camera.x = -(vw - currentMap.width) / 2;
        } else {
            camera.x = Math.max(0, Math.min(currentMap.width - vw, player.globalX - vw / 2));
        }

        if (vh >= currentMap.height) {
            camera.y = -(vh - currentMap.height) / 2;
        } else {
            camera.y = Math.max(0, Math.min(currentMap.height - vh, player.globalY - vh / 2));
        }

        // ── Clear Canvas ──────────────────────────────────────────────────
        ctx.clearRect(0, 0, vw, vh);

        // ── Background pattern (zoomed to match map scale) ────────────────
        ctx.fillStyle = "#100e1d";
        ctx.fillRect(0, 0, vw, vh);

        if (assets.bgPattern) {
            ctx.save();
            const patSize = 1000 * MAP_SCALE;
            const ox = -((camera.x % patSize) + patSize) % patSize;
            const oy = -((camera.y % patSize) + patSize) % patSize;
            ctx.translate(ox, oy);
            ctx.scale(MAP_SCALE, MAP_SCALE);
            ctx.fillStyle = assets.bgPattern;
            ctx.fillRect(0, 0, (vw + patSize) / MAP_SCALE, (vh + patSize) / MAP_SCALE);
            ctx.restore();
        }

        // ── Render canonical map floor & walls (zoomed) ───────────────────
        if (assets.floorTileset) {
            drawGround(
                ctx,
                assets.floorTileset,
                currentMap,
                camera.x,
                camera.y,
                vw,
                vh
            );
        }

        // ── Check proximity to sittable objects (tables, sofas, chairs) ───
        const curFootX = player.globalX;
        const curFootY = player.globalY + FEET_OFFSET_Y;
        const nearestSittable = findNearestSittable(curFootX, curFootY, currentMap.elements);

        // ── Render all physical entities (elements + players) sorted by Depth Y ──
        if (currentMap.tilesets && assets.tilesetImages && assets.characters) {
            type RenderEntity =
                | {
                      kind: "element";
                      depthY: number;
                      priority: number;
                      element: MapElement;
                  }
                | {
                      kind: "player";
                      depthY: number;
                      priority: number;
                      player: {
                          sx: number;
                          sy: number;
                          charId: CharacterId;
                          state: "idle" | "walking" | "sitting";
                          direction: "down" | "left" | "right" | "up";
                          currentFrame: number;
                          username: string;
                          isLocal: boolean;
                          chatMessage?: string;
                      };
                  };

            const entities: RenderEntity[] = [];

            // 1. Visible map elements
            for (const el of currentMap.elements) {
                const elW = el.width ?? 32;
                const elH = el.height ?? 32;
                if (el.x + elW < camera.x || el.x > camera.x + vw || el.y + elH < camera.y || el.y > camera.y + vh) {
                    continue;
                }
                const layer = (el.layerName ?? el.elementId).toLowerCase();
                const priority = LAYER_PRIORITY[layer] ?? 30;
                entities.push({
                    kind: "element",
                    depthY: el.y + elH,
                    priority,
                    element: el,
                });
            }

            // 2. Remote players
            remotePlayersRef.current.forEach((rp) => {
                const sx = rp.x - camera.x;
                const sy = rp.y - camera.y;
                if (sx < -96 || sx > vw + 96 || sy < -96 || sy > vh + 96) return;
                const isSitting = rp.state === "sitting";
                const charId = (rp.character as CharacterId) || "Harry";
                const st = (rp.state as "idle" | "walking" | "sitting") || (isSitting ? "sitting" : "idle");
                entities.push({
                    kind: "player",
                    depthY: isSitting ? rp.y - 1 : rp.y + FEET_OFFSET_Y,
                    priority: 45,
                    player: {
                        sx,
                        sy,
                        charId,
                        state: st,
                        direction: rp.direction || "down",
                        currentFrame: rp.frame || 1,
                        username: rp.displayName || "Player",
                        isLocal: false,
                        chatMessage: rp.chatMessage,
                    },
                });
            });

            // 3. Local player
            const localSx = player.globalX - camera.x;
            const localSy = player.globalY - camera.y;
            const isLocalSitting = player.state === "sitting";
            const seatedChair = seatedElementRef.current;

            let localDepthY = curFootY;
            if (isLocalSitting && seatedChair) {
                const chairH = seatedChair.height ?? 32;
                if (player.direction === "up") {
                    // Back-of-head facing away: chair drawn slightly over player back
                    localDepthY = seatedChair.y + chairH - 2;
                } else {
                    // Front / side facing: player sitting on top of chair
                    localDepthY = seatedChair.y + chairH + 1;
                }
            } else if (isLocalSitting) {
                localDepthY = player.globalY;
            }

            entities.push({
                kind: "player",
                depthY: localDepthY,
                priority: 45,
                player: {
                    sx: localSx,
                    sy: localSy,
                    charId: player.name,
                    state: player.state,
                    direction: player.direction,
                    currentFrame: player.currentFrame,
                    username: currentUsername,
                    isLocal: true,
                },
            });

            // Render foreground wall/object layers after players so they can
            // occlude the avatar where Tiled marks them as OnCollide.
            entities.sort((a, b) => {
                const band = (entity: RenderEntity) => {
                    if (entity.kind === "element") {
                        return isForegroundElement(entity.element) ? 2 : 0;
                    }
                    return 1;
                };

                const bandDifference = band(a) - band(b);
                if (bandDifference !== 0) return bandDifference;
                if (a.depthY !== b.depthY) {
                    return a.depthY - b.depthY;
                }
                return a.priority - b.priority;
            });

            // Draw all entities in depth sorted order
            for (const entity of entities) {
                if (entity.kind === "element") {
                    drawElement(ctx, entity.element, currentMap.tilesets, assets.tilesetImages, camera.x, camera.y, vw, vh);
                } else {
                    const p = entity.player;
                    drawPlayer(
                        ctx,
                        assets.characters,
                        p.sx,
                        p.sy,
                        p.charId,
                        p.state,
                        p.direction,
                        p.currentFrame,
                        p.username,
                        p.isLocal,
                        p.chatMessage
                    );
                }
            }

            // Floating sit / stand prompt popup on canvas directly at the chair/sofa
            const targetPromptElement = isLocalSitting ? seatedElementRef.current : nearestSittable;

            if (targetPromptElement) {
                ctx.save();
                const promptText = isLocalSitting ? "Press E to stand" : "Press E to sit";
                ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
                const ptw = ctx.measureText(promptText).width;
                const promptW = ptw + 34;
                const promptH = 26;

                const elemW = targetPromptElement.width ?? 32;
                const elemH = targetPromptElement.height ?? 32;
                const elemSx = targetPromptElement.x - camera.x;
                const elemSy = targetPromptElement.y - camera.y;
                const elemCenterX = elemSx + elemW / 2;

                // Position label just after the element on the side the player is standing or sitting
                const isPlayerBelow = curFootY > targetPromptElement.y + elemH / 2;
                const promptY = isPlayerBelow ? elemSy + elemH + 6 : elemSy - promptH - 6;
                const promptX = Math.max(8, Math.min(vw - promptW - 8, elemCenterX - promptW / 2));
                const arrowX = Math.max(promptX + 12, Math.min(promptX + promptW - 12, elemCenterX));

                // White popup container
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 2;
                ctx.beginPath();
                ctx.roundRect(promptX, promptY, promptW, promptH, 8);
                ctx.fill();

                // Indicator pointer arrow connecting label to element
                ctx.beginPath();
                if (isPlayerBelow) {
                    ctx.moveTo(arrowX - 5, promptY);
                    ctx.lineTo(arrowX + 5, promptY);
                    ctx.lineTo(arrowX, promptY - 5);
                } else {
                    ctx.moveTo(arrowX - 5, promptY + promptH);
                    ctx.lineTo(arrowX + 5, promptY + promptH);
                    ctx.lineTo(arrowX, promptY + promptH + 5);
                }
                ctx.closePath();
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;

                // Border
                ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
                ctx.lineWidth = 1;
                ctx.stroke();

                // [E] keycap
                const keyX = promptX + 5;
                const keyY = promptY + 4;
                const keySize = 18;
                ctx.fillStyle = "#0f172a";
                ctx.beginPath();
                ctx.roundRect(keyX, keyY, keySize, keySize, 4);
                ctx.fill();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("E", keyX + keySize / 2, keyY + keySize / 2);

                // Text label
                ctx.fillStyle = "#0f172a";
                ctx.font = "bold 12px 'Inter', system-ui, sans-serif";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(promptText, keyX + keySize + 6, promptY + promptH / 2);
                ctx.restore();
            }
        }

        // ── Debug mode: render collision rectangles in red & object bounds in yellow ──
        if (debugModeRef.current) {
            ctx.save();
            ctx.lineWidth = 1.5;
            for (const rect of collisionRects) {
                const sx = rect.x - camera.x;
                const sy = rect.y - camera.y;
                if (sx + rect.width < 0 || sx > vw || sy + rect.height < 0 || sy > vh) continue;
                ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
                ctx.fillRect(sx, sy, rect.width, rect.height);
                ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
                ctx.strokeRect(sx, sy, rect.width, rect.height);
            }

            // Draw object bounds in yellow with metadata labels (specs/08-add-elements.md)
            for (const el of currentMap.elements) {
                const destX = el.x - camera.x;
                const destY = el.y - camera.y;
                const destW = el.width ?? 32;
                const destH = el.height ?? 32;
                if (destX + destW < 0 || destX > vw || destY + destH < 0 || destY > vh) continue;

                ctx.strokeStyle = "rgba(234, 179, 8, 0.95)";
                ctx.lineWidth = 1;
                ctx.strokeRect(destX, destY, destW, destH);

                if (currentMap.tilesets) {
                    const res = el.gid ? resolveTile(el.gid, currentMap.tilesets) : null;
                    const layerName = el.layerName ?? el.elementId;
                    const tilesetName = res?.tileset.name ?? "unknown";
                    const label = `${layerName} #${el.id}${el.gid ? ` [GID:${el.gid} (${res?.localTileId})] ${tilesetName}` : ""}`;
                    ctx.font = "9px monospace";
                    const textW = ctx.measureText(label).width;
                    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                    ctx.fillRect(destX, destY - 12, textW + 4, 12);
                    ctx.fillStyle = "#fef08a";
                    ctx.fillText(label, destX + 2, destY - 3);
                }
            }

            // Draw player foot collision box in green
            const footBoxSx = curFootX - 12 - camera.x;
            const footBoxSy = curFootY - 8 - camera.y;
            ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
            ctx.fillRect(footBoxSx, footBoxSy, 24, 16);
            ctx.strokeStyle = "#22c55e";
            ctx.strokeRect(footBoxSx, footBoxSy, 24, 16);
            ctx.restore();
        }

        rafRef.current = requestAnimationFrame((ts) => gameLoopRef.current?.(ts));
    }, [currentUsername, onPlayerStateChange]);

    useEffect(() => {
        gameLoopRef.current = gameLoop;
    }, [gameLoop]);

    // ── Resize handler: keep canvas full screen ───────────────────────────
    useEffect(() => {
        function onResize() {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // ── Load map JSON & assets, pre-cache character frames, start loop ────
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                // Fetch canonical map.json directly (Requirement 1)
                let loadedMap: GameMap = demoSpace.map;
                try {
                    const res = await fetch("/assets/map/map.json");
                    if (res.ok) {
                        loadedMap = (await res.json()) as GameMap;
                    }
                } catch {
                    // Fall back to bundled demoSpace.map
                }

                const scaled = scaleGameMap(loadedMap, MAP_SCALE);
                if (cancelled) return;
                setMap(scaled);
                const rects = buildCollisionRectangles(scaled);
                collisionRectsRef.current = rects;

                // Pre-cache all 24 idle, 24 run, and 4 sit frames for all 4 characters
                const charMap = new Map<CharacterId, CharacterFrameSet>();
                await Promise.all(
                    CHARACTER_OPTIONS.map(async (charOpt) => {
                        const set = await loadCharacterFrames(charOpt.id);
                        charMap.set(charOpt.id, set);
                    })
                );

                // Load base floor, background pattern, and all declared tilesets
                const [floor, bg] = await Promise.all([
                    loadImage(scaled.floor.image),
                    loadImage("/assets/background/bg.png"),
                ]);

                const tilesetImages = new Map<string, HTMLImageElement>();
                if (scaled.tilesets) {
                    await Promise.all(
                        scaled.tilesets.map(async (ts) => {
                            const url = resolveTilesetUrl(ts.image);
                            try {
                                const img = await loadImage(url);
                                tilesetImages.set(ts.name, img);
                            } catch (err) {
                                console.error(`Failed to load tileset image for ${ts.name} from ${url}:`, err);
                                throw new Error(`Missing tileset asset: ${url} for tileset ${ts.name}`, { cause: err });
                            }
                        })
                    );
                }

                if (cancelled) return;

                const canvas = canvasRef.current!;
                const ctx    = canvas.getContext("2d")!;
                const pat    = ctx.createPattern(bg, "repeat");

                assetsRef.current = {
                    characters:   charMap,
                    floorTileset: floor,
                    tilesetImages,
                    bgPattern:    pat,
                };

                // Position player at verified safe spawn point
                const initialSpawn = scaled.spawnPoints[0] ?? { x: 700 * MAP_SCALE, y: 600 * MAP_SCALE };
                const spawnX = initialSpawn.x;
                let spawnY = initialSpawn.y;

                let attempts = 0;
                while (attempts < 20) {
                    if (canMoveTo(spawnX, spawnY + FEET_OFFSET_Y, scaled, rects)) break;
                    spawnY += 16;
                    attempts++;
                }

                playerRef.current.globalX = spawnX;
                playerRef.current.globalY = spawnY;

                lastFrameTimeRef.current = performance.now();
                rafRef.current = requestAnimationFrame(gameLoop);
            } catch (err) {
                console.error("[ArenaPage] init error:", err);
                if (!cancelled) {
                    lastFrameTimeRef.current = performance.now();
                    rafRef.current = requestAnimationFrame(gameLoop);
                }
            }
        }

        init();
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafRef.current);
        };
    }, [gameLoop]);

    // ── Keyboard events ───────────────────────────────────────────────────
    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            const keyLower = e.key.toLowerCase();
            const codeLower = e.code.toLowerCase();

            // Prevent default arrow / WASD scrolling
            if (
                ["arrowup", "arrowdown", "arrowleft", "arrowright", "space"].includes(keyLower) ||
                ["w", "a", "s", "d"].includes(keyLower)
            ) {
                e.preventDefault();
            }

            // Toggle collision debug mode with 'C' key
            if (keyLower === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                setDebugMode((prev) => !prev);
            }

            // Sit on / stand up from nearest sittable element with 'E' key
            if ((keyLower === "e" || codeLower === "keye") && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (playerRef.current.state === "sitting") {
                    playerRef.current.state = "idle";
                    setPlayerState("idle");
                    // Safely dismount chair/sofa in the direction player was facing
                    const dir = playerRef.current.direction;
                    let targetX = playerRef.current.globalX;
                    let targetY = playerRef.current.globalY;
                    if (dir === "down") targetY += 24;
                    else if (dir === "up") targetY -= 24;
                    else if (dir === "left") targetX -= 24;
                    else if (dir === "right") targetX += 24;

                    const curMap = mapRef.current;
                    const cRects = collisionRectsRef.current;
                    if (canMoveTo(targetX, targetY + FEET_OFFSET_Y, curMap, cRects)) {
                        playerRef.current.globalX = targetX;
                        playerRef.current.globalY = targetY;
                    } else if (canMoveTo(playerRef.current.globalX, playerRef.current.globalY + FEET_OFFSET_Y + 16, curMap, cRects)) {
                        playerRef.current.globalY += 16;
                    }
                    seatedElementRef.current = null;
                    onPlayerStateChange(playerRef.current);
                } else {
                    const footX = playerRef.current.globalX;
                    const footY = playerRef.current.globalY + FEET_OFFSET_Y;
                    const nearest = findNearestSittable(footX, footY, mapRef.current.elements);
                    if (nearest) {
                        const sit = getElementSitPoint(nearest, footX, footY);
                        playerRef.current.globalX = sit.x;
                        playerRef.current.globalY = sit.y;
                        playerRef.current.direction = sit.direction;
                        playerRef.current.state = "sitting";
                        playerRef.current.currentFrame = 1;
                        seatedElementRef.current = nearest;
                        setPlayerState("sitting");
                        onPlayerStateChange(playerRef.current);
                    }
                }
            }

            keysRef.current.add(keyLower);
            keysRef.current.add(codeLower);
        };

        const onUp = (e: KeyboardEvent) => {
            const keyLower = e.key.toLowerCase();
            const codeLower = e.code.toLowerCase();
            keysRef.current.delete(keyLower);
            keysRef.current.delete(codeLower);
        };

        const onBlur = () => {
            keysRef.current.clear();
        };

        window.addEventListener("keydown", onDown);
        window.addEventListener("keyup",   onUp);
        window.addEventListener("blur",    onBlur);

        return () => {
            window.removeEventListener("keydown", onDown);
            window.removeEventListener("keyup",   onUp);
            window.removeEventListener("blur",    onBlur);
        };
    }, [onPlayerStateChange]);

    // Clear display name when exiting the game
    useEffect(() => {
        const onUnload = () => {
            localStorage.removeItem("alterverse_display_name");
        };
        window.addEventListener("beforeunload", onUnload);
        return () => {
            window.removeEventListener("beforeunload", onUnload);
            localStorage.removeItem("alterverse_display_name");
        };
    }, []);

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#100e1d" }}>
            {/* Full-screen game canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    imageRendering: "pixelated",
                }}
            />

            {/* ── Prominent HUD: top-left (LOGO) ─── */}
            <div
                style={{
                    position: "absolute",
                    top: 18,
                    left: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    userSelect: "none",
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        padding: "7px 16px",
                        borderRadius: 10,
                        background: "rgba(9, 7, 24, 0.76)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        backdropFilter: "blur(12px)",
                        fontSize: 13,
                        fontFamily: "monospace",
                        letterSpacing: "0.15em",
                        color: "#c4b5fd",
                        fontWeight: 700,
                        textTransform: "uppercase",
                    }}
                >
                    ALTERVERSE
                </div>
            </div>

            {/* ── Prominent HUD: top-right (Collision debug toggle, Player badge & Leave button) ─── */}
            <div
                style={{
                    position: "absolute",
                    top: 18,
                    right: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                }}
            >
                {/* Collision & element debug toggle button */}
                <button
                    onClick={() => setDebugMode((prev) => !prev)}
                    title="Toggle collision & element bounds debug overlay (Hotkey: C)"
                    style={{
                        padding: "7px 14px",
                        borderRadius: 10,
                        background: debugMode ? "rgba(239, 68, 68, 0.22)" : "rgba(9, 7, 24, 0.76)",
                        border: debugMode ? "1px solid rgba(239, 68, 68, 0.45)" : "1px solid rgba(255, 255, 255, 0.12)",
                        backdropFilter: "blur(12px)",
                        fontSize: 13,
                        color: debugMode ? "#fca5a5" : "#94a3b8",
                        cursor: "pointer",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontFamily: "monospace",
                        transition: "all 0.15s ease",
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: debugMode ? "#ef4444" : "#64748b",
                            display: "inline-block",
                            boxShadow: debugMode ? "0 0 8px #ef4444" : "none",
                        }}
                    />
                    <span>[C] Debug: {debugMode ? "ON" : "OFF"}</span>
                </button>

                {/* Player badge */}
                <div
                    style={{
                        padding: "7px 16px",
                        borderRadius: 10,
                        background: "rgba(9, 7, 24, 0.76)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        backdropFilter: "blur(12px)",
                        fontSize: 14,
                        color: "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        userSelect: "none",
                    }}
                >
                    <span
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#34d399",
                            display: "inline-block",
                            boxShadow: "0 0 8px #34d399",
                        }}
                    />
                    <span style={{ fontWeight: 600 }}>{currentUsername}</span>
                </div>

                {/* Leave button */}
                <button
                    onClick={() => {
                        localStorage.removeItem("alterverse_display_name");
                        navigate(-1);
                    }}
                    style={{
                        padding: "7px 16px",
                        borderRadius: 10,
                        background: "rgba(239, 68, 68, 0.16)",
                        border: "1px solid rgba(239, 68, 68, 0.32)",
                        backdropFilter: "blur(12px)",
                        fontSize: 14,
                        color: "#fca5a5",
                        cursor: "pointer",
                        fontWeight: 600,
                        transition: "background 0.15s, border-color 0.15s",
                    }}
                >
                    ✕ Leave
                </button>
            </div>
        </div>
    );
}
