import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { demoSpace } from "../data/demo-data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemotePlayer {
    id: string;
    x: number;
    y: number;
    direction: "down" | "left" | "right" | "up";
    frame: number;
    displayName: string;
}

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

// ─── Sprite / Player Config ───────────────────────────────────────────────────
// Spritesheet: 256×64, 4 frames × 64 px each per direction
const SPRITE_FRAME_W  = 64;
const SPRITE_FRAME_H  = 64;
const SPRITE_FRAMES   = 4;
const SPRITE_FPS      = 8;
// Render player at 3× scale for crisp, prominent visibility on full screen
const PLAYER_SCALE    = 3;
const PLAYER_RENDER_W = SPRITE_FRAME_W * PLAYER_SCALE;  // 192 px
const PLAYER_RENDER_H = SPRITE_FRAME_H * PLAYER_SCALE;  // 192 px

// Foot-level collision box (centered at player feet for natural RPG movement)
const FEET_OFFSET_Y   = 18;
const PLAYER_HW       = 12;  // half-width of foot hitbox
const PLAYER_HH       = 8;   // half-height of foot hitbox
const PLAYER_SPEED    = 4;

// ─── Map & Bounds Config ──────────────────────────────────────────────────────
const { tileSize: TILE_SIZE, width: MAP_PX_W, height: MAP_PX_H } = demoSpace.map;
const TILESET_PNG_COLS = 2048 / TILE_SIZE; // FloorAndGround.png = 2048 wide

// Playable floor area bounds in pixels
const MAP_BOUNDS = {
    minX: 160 + PLAYER_HW,
    maxX: 1248 - PLAYER_HW,
    minY: 64 + PLAYER_HH,
    maxY: 928 - PLAYER_HH - FEET_OFFSET_Y,
};

// ─── Utility ─────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, r: Rect) {
    return ax < r.x + r.w && ax + aw > r.x && ay < r.y + r.h && ay + ah > r.y;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ArenaPage() {
    const { spaceId }       = useParams<{ spaceId: string }>();
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

    // ── Canvas ref ────────────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ── Mutable game state ────────────────────────────────────────────────
    const keysRef    = useRef<Set<string>>(new Set());
    const playerRef  = useRef<{
        x: number;
        y: number;
        direction: "down" | "left" | "right" | "up";
        frame: number;
    }>({
        x: demoSpace.spawnX,
        y: demoSpace.spawnY,
        direction: "down",
        frame: 0,
    });
    const cameraRef         = useRef({ x: 0, y: 0 });
    const remotePlayersRef  = useRef<Map<string, RemotePlayer>>(new Map());
    const lastFrameTimeRef  = useRef(0);
    const animAccRef        = useRef(0);
    const rafRef            = useRef<number>(0);

    // Collision rects from Tiled object layers
    const collisionRectsRef = useRef<Rect[]>([]);

    // Loaded assets
    const assetsRef = useRef<{
        spriteDown?:   HTMLImageElement;
        spriteLeft?:   HTMLImageElement;
        spriteRight?:  HTMLImageElement;
        spriteUp?:     HTMLImageElement;
        floorTileset?: HTMLImageElement;
        bgPattern?:    CanvasPattern | null;
        groundData?:   number[];
        mapW?: number;
        mapH?: number;
    }>({});

    // ── Backend sync stubs ────────────────────────────────────────────────
    const onLocalPlayerMove = useCallback(
        (x: number, y: number, dir: string, frame: number) => {
            void x; void y; void dir; void frame;
            // Stub: emit to WebSocket server
        },
        []
    );

    const handleRemotePlayerUpdate = useCallback((players: RemotePlayer[]) => {
        players.forEach((p) => remotePlayersRef.current.set(p.id, p));
    }, []);
    void handleRemotePlayerUpdate;

    // ── Direction parser ──────────────────────────────────────────────────
    function getDir(keys: Set<string>): "down" | "left" | "right" | "up" | null {
        if (keys.has("arrowdown")  || keys.has("keys") || keys.has("s")) return "down";
        if (keys.has("arrowup")    || keys.has("keyw") || keys.has("w")) return "up";
        if (keys.has("arrowleft")  || keys.has("keya") || keys.has("a")) return "left";
        if (keys.has("arrowright") || keys.has("keyd") || keys.has("d")) return "right";
        return null;
    }

    // ── Collision checking ────────────────────────────────────────────────
    function collidesWithWall(nx: number, ny: number): boolean {
        const footX = nx;
        const footY = ny + FEET_OFFSET_Y;
        const ax = footX - PLAYER_HW;
        const ay = footY - PLAYER_HH;
        const aw = PLAYER_HW * 2;
        const ah = PLAYER_HH * 2;

        for (const rect of collisionRectsRef.current) {
            if (rectsOverlap(ax, ay, aw, ah, rect)) return true;
        }
        return false;
    }

    // ── Draw player sprite + name tag ─────────────────────────────────────
    function drawPlayer(
        ctx: CanvasRenderingContext2D,
        sprites: Record<string, HTMLImageElement | undefined>,
        sx: number,
        sy: number,
        dir: "down" | "left" | "right" | "up",
        frame: number,
        name: string,
        isLocal: boolean
    ) {
        const sheet = sprites[dir];
        const dw = PLAYER_RENDER_W;
        const dh = PLAYER_RENDER_H;
        const dx = sx - dw / 2;
        const dy = sy - dh / 2;

        if (sheet) {
            ctx.drawImage(
                sheet,
                frame * SPRITE_FRAME_W, 0,
                SPRITE_FRAME_W, SPRITE_FRAME_H,
                dx, dy, dw, dh
            );
        } else {
            ctx.fillStyle = isLocal ? "#8b5cf6" : "#38bdf8";
            ctx.beginPath();
            ctx.arc(sx, sy, 18, 0, Math.PI * 2);
            ctx.fill();
        }

        // Clean name-tag above head
        ctx.save();
        ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const tw = ctx.measureText(name).width;
        const tagY = dy - 6;
        const px = 7;
        const py = 4;

        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.beginPath();
        ctx.roundRect(sx - tw / 2 - px, tagY - 14 - py, tw + px * 2, 14 + py * 2, 5);
        ctx.fill();

        ctx.fillStyle = isLocal ? "#c4b5fd" : "#7dd3fc";
        ctx.fillText(name, sx, tagY);
        ctx.restore();
    }

    // ── Draw tiled ground layer ───────────────────────────────────────────
    function drawGround(
        ctx: CanvasRenderingContext2D,
        tileset: HTMLImageElement,
        groundData: number[],
        mapW: number,
        mapH: number,
        camX: number,
        camY: number,
        vw: number,
        vh: number
    ) {
        const c0 = Math.max(0, Math.floor(camX / TILE_SIZE));
        const c1 = Math.min(mapW, Math.ceil((camX + vw) / TILE_SIZE) + 1);
        const r0 = Math.max(0, Math.floor(camY / TILE_SIZE));
        const r1 = Math.min(mapH, Math.ceil((camY + vh) / TILE_SIZE) + 1);

        for (let row = r0; row < r1; row++) {
            for (let col = c0; col < c1; col++) {
                const gid = groundData[row * mapW + col];
                if (!gid) continue;
                const tid = gid - 1;
                const sx = (tid % TILESET_PNG_COLS) * TILE_SIZE;
                const sy = Math.floor(tid / TILESET_PNG_COLS) * TILE_SIZE;
                ctx.drawImage(
                    tileset,
                    sx, sy, TILE_SIZE, TILE_SIZE,
                    col * TILE_SIZE - camX,
                    row * TILE_SIZE - camY,
                    TILE_SIZE, TILE_SIZE
                );
            }
        }
    }

    // ── Main game loop ref ────────────────────────────────────────────────
    const gameLoopRef = useRef<((ts: number) => void) | null>(null);

    const gameLoop = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const vw = canvas.width;
        const vh = canvas.height;
        const dt = Math.min(timestamp - lastFrameTimeRef.current, 50);
        lastFrameTimeRef.current = timestamp;

        const assets = assetsRef.current;
        const keys   = keysRef.current;
        const player = playerRef.current;
        const camera = cameraRef.current;

        // ── Movement & collision logic ────────────────────────────────────
        const dir = getDir(keys);
        let moved = false;

        if (dir) {
            player.direction = dir;
            const dx = dir === "left" ? -PLAYER_SPEED : dir === "right" ? PLAYER_SPEED : 0;
            const dy = dir === "up"   ? -PLAYER_SPEED : dir === "down"  ? PLAYER_SPEED : 0;

            const nextX = player.x + dx;
            const nextY = player.y + dy;

            // Clamp strictly within map bounds
            const clampedX = Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, nextX));
            const clampedY = Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, nextY));

            // Test X & Y independently to enable wall sliding
            if (!collidesWithWall(clampedX, player.y)) {
                player.x = clampedX;
                moved = true;
            }
            if (!collidesWithWall(player.x, clampedY)) {
                player.y = clampedY;
                moved = true;
            }
        }

        // Animate sprite frames when moving
        if (moved) {
            animAccRef.current += dt;
            const mspf = 1000 / SPRITE_FPS;
            if (animAccRef.current >= mspf) {
                player.frame = (player.frame + 1) % SPRITE_FRAMES;
                animAccRef.current -= mspf;
                onLocalPlayerMove(player.x, player.y, player.direction, player.frame);
            }
        } else {
            player.frame = 0;
            animAccRef.current = 0;
        }

        // ── Camera: center map if viewport is large, or follow player ─────
        if (vw >= MAP_PX_W) {
            camera.x = -(vw - MAP_PX_W) / 2;
        } else {
            camera.x = Math.max(0, Math.min(MAP_PX_W - vw, player.x - vw / 2));
        }

        if (vh >= MAP_PX_H) {
            camera.y = -(vh - MAP_PX_H) / 2;
        } else {
            camera.y = Math.max(0, Math.min(MAP_PX_H - vh, player.y - vh / 2));
        }

        // ── Clear Canvas ──────────────────────────────────────────────────
        ctx.clearRect(0, 0, vw, vh);

        // ── Background pattern ────────────────────────────────────────────
        ctx.fillStyle = "#100e1d";
        ctx.fillRect(0, 0, vw, vh);

        if (assets.bgPattern) {
            ctx.save();
            const ox = -((camera.x % 1000) + 1000) % 1000;
            const oy = -((camera.y % 1000) + 1000) % 1000;
            ctx.translate(ox, oy);
            ctx.fillStyle = assets.bgPattern;
            ctx.fillRect(0, 0, vw + 1000, vh + 1000);
            ctx.restore();
        }

        // ── Ground tiles ──────────────────────────────────────────────────
        if (assets.floorTileset && assets.groundData && assets.mapW && assets.mapH) {
            drawGround(
                ctx,
                assets.floorTileset,
                assets.groundData,
                assets.mapW,
                assets.mapH,
                camera.x,
                camera.y,
                vw,
                vh
            );
        }

        // ── Remote players ────────────────────────────────────────────────
        const sprites: Record<string, HTMLImageElement | undefined> = {
            down:  assets.spriteDown,
            left:  assets.spriteLeft,
            right: assets.spriteRight,
            up:    assets.spriteUp,
        };

        remotePlayersRef.current.forEach((rp) => {
            const sx = rp.x - camera.x;
            const sy = rp.y - camera.y;
            if (sx < -96 || sx > vw + 96 || sy < -96 || sy > vh + 96) return;
            drawPlayer(ctx, sprites, sx, sy, rp.direction, rp.frame, rp.displayName, false);
        });

        // ── Local player ──────────────────────────────────────────────────
        const localSx = player.x - camera.x;
        const localSy = player.y - camera.y;
        drawPlayer(ctx, sprites, localSx, localSy, player.direction, player.frame, displayName, true);

        rafRef.current = requestAnimationFrame((ts) => gameLoopRef.current?.(ts));
    }, [displayName, onLocalPlayerMove]);

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

    // ── Load assets, parse collision, start loop ──────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const [down, left, right, up, floor, bg, mapJson] = await Promise.all([
                    loadImage("/assets/avtar/Down/[TD] Character 0 Down Spritesheet.png"),
                    loadImage("/assets/avtar/Left/[TD] Character 0 Left Spritesheet.png"),
                    loadImage("/assets/avtar/Right/[TD] Character 0 Right Spritesheet.png"),
                    loadImage("/assets/avtar/Up/[TD] Character 0 Up Spritesheet.png"),
                    loadImage(demoSpace.map.tilesetUrl),
                    loadImage(demoSpace.map.backgroundUrl),
                    fetch(demoSpace.map.tiledJsonUrl).then((r) => r.json()),
                ]);

                if (cancelled) return;

                const canvas = canvasRef.current!;
                const ctx    = canvas.getContext("2d")!;
                const pat    = ctx.createPattern(bg, "repeat");

                const groundLayer = mapJson.layers.find((l: { name: string }) => l.name === "Ground");
                const groundData  = (groundLayer?.data ?? []) as number[];

                // Parse collision rects from Tiled object layers
                const collisionLayerNames = new Set(demoSpace.map.collisionLayers);
                const rects: Rect[] = [];
                for (const layer of mapJson.layers) {
                    if (!collisionLayerNames.has(layer.name)) continue;
                    for (const obj of layer.objects ?? []) {
                        const y = obj.gid ? obj.y - obj.height : obj.y;
                        rects.push({ x: obj.x, y, w: obj.width, h: obj.height });
                    }
                }
                collisionRectsRef.current = rects;

                assetsRef.current = {
                    spriteDown:  down,
                    spriteLeft:  left,
                    spriteRight: right,
                    spriteUp:    up,
                    floorTileset: floor,
                    bgPattern:   pat,
                    groundData,
                    mapW: mapJson.width  as number,
                    mapH: mapJson.height as number,
                };

                // Position player at verified safe spawn
                const spawnX = demoSpace.spawnX;
                let spawnY = demoSpace.spawnY;

                // Self-resolve if spawn happens to collide
                let attempts = 0;
                while (attempts < 20) {
                    const footX = spawnX;
                    const footY = spawnY + FEET_OFFSET_Y;
                    const ax = footX - PLAYER_HW;
                    const ay = footY - PLAYER_HH;
                    const aw = PLAYER_HW * 2;
                    const ah = PLAYER_HH * 2;
                    const hit = rects.some((r) => rectsOverlap(ax, ay, aw, ah, r));
                    if (!hit) break;
                    spawnY += 16;
                    attempts++;
                }

                playerRef.current.x = spawnX;
                playerRef.current.y = spawnY;

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

            {/* ── Minimal HUD: top-left ─── */}
            <div
                style={{
                    position: "absolute",
                    top: 14,
                    left: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    userSelect: "none",
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: "rgba(9, 7, 24, 0.72)",
                        border: "1px solid rgba(255, 255, 255, 0.09)",
                        backdropFilter: "blur(10px)",
                        fontSize: 11,
                        fontFamily: "monospace",
                        letterSpacing: "0.14em",
                        color: "#c4b5fd",
                        fontWeight: 700,
                        textTransform: "uppercase",
                    }}
                >
                    ALTERVERSE
                </div>
                {spaceId && (
                    <div
                        style={{
                            padding: "3px 9px",
                            borderRadius: 6,
                            background: "rgba(139, 92, 246, 0.12)",
                            border: "1px solid rgba(167, 139, 250, 0.2)",
                            fontSize: 10,
                            color: "#a78bfa",
                            fontFamily: "monospace",
                        }}
                    >
                        {demoSpace.name}
                    </div>
                )}
            </div>

            {/* ── Minimal HUD: top-right (Player badge & Leave button) ─── */}
            <div
                style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <div
                    style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: "rgba(9, 7, 24, 0.72)",
                        border: "1px solid rgba(255, 255, 255, 0.09)",
                        backdropFilter: "blur(10px)",
                        fontSize: 12,
                        color: "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        userSelect: "none",
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#34d399",
                            display: "inline-block",
                            boxShadow: "0 0 7px #34d399",
                        }}
                    />
                    <span style={{ fontWeight: 600 }}>{displayName}</span>
                </div>

                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: "rgba(239, 68, 68, 0.14)",
                        border: "1px solid rgba(239, 68, 68, 0.28)",
                        backdropFilter: "blur(10px)",
                        fontSize: 12,
                        color: "#fca5a5",
                        cursor: "pointer",
                        fontWeight: 600,
                    }}
                >
                    ✕ Leave
                </button>
            </div>

            {/* ── Minimal HUD: bottom-left (Controls hint) ─── */}
            <div
                style={{
                    position: "absolute",
                    bottom: 14,
                    left: 14,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(9, 7, 24, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: 10,
                    color: "#64748b",
                    userSelect: "none",
                    pointerEvents: "none",
                    fontFamily: "monospace",
                    letterSpacing: "0.05em",
                }}
            >
                WASD / Arrow keys to move
            </div>
        </div>
    );
}