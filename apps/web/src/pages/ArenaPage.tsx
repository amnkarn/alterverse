import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { demoSpace } from "../data/demo-data";
import type { GameMap, CollisionRect, RemotePlayer } from "../types/map";
import { buildCollisionRectangles, canMoveTo, scaleGameMap } from "../game/collision";

// ─── Scale & Zoom Config ──────────────────────────────────────────────────────
// Zooms map tiles, walls, and background without changing avatar size
export const MAP_SCALE = 1.8;

// ─── Sprite / Player Config ───────────────────────────────────────────────────
// Spritesheet: 256×64, 4 frames × 64 px each per direction
const SPRITE_FRAME_W  = 64;
const SPRITE_FRAME_H  = 64;
const SPRITE_FRAMES   = 4;
const SPRITE_FPS      = 10;
// Render player at 3× scale (kept unchanged per user preference)
const PLAYER_SCALE    = 3;
const PLAYER_RENDER_W = SPRITE_FRAME_W * PLAYER_SCALE; // 192 px
const PLAYER_RENDER_H = SPRITE_FRAME_H * PLAYER_SCALE; // 192 px

// Foot-level collision box offset (centered at player shoes for natural RPG movement)
const FEET_OFFSET_Y   = 38;
const PLAYER_SPEED    = 7;

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
        ctx.arc(sx, sy, 22, 0, Math.PI * 2);
        ctx.fill();
    }

    // Name tag above avatar head
    ctx.save();
    ctx.font = "bold 14px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const tw = ctx.measureText(name).width;
    const tagY = dy - 6;
    const px = 8;
    const py = 5;

    ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
    ctx.beginPath();
    ctx.roundRect(sx - tw / 2 - px, tagY - 16 - py, tw + px * 2, 16 + py * 2, 6);
    ctx.fill();

    ctx.fillStyle = isLocal ? "#c4b5fd" : "#7dd3fc";
    ctx.fillText(name, sx, tagY);
    ctx.restore();
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

    // ── Canonical GameMap state & collision (scaled) ──────────────────────
    const initialScaledMap = scaleGameMap(demoSpace.map, MAP_SCALE);
    const [map, setMap] = useState<GameMap>(initialScaledMap);
    const mapRef = useRef<GameMap>(initialScaledMap);
    const collisionRectsRef = useRef<CollisionRect[]>(buildCollisionRectangles(initialScaledMap));

    useEffect(() => {
        mapRef.current = map;
        collisionRectsRef.current = buildCollisionRectangles(map);
    }, [map]);

    // ── Canvas ref ────────────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ── Mutable game state ────────────────────────────────────────────────
    const defaultSpawn = initialScaledMap.spawnPoints[0] ?? { x: 1050, y: 900 };
    const keysRef    = useRef<Set<string>>(new Set());
    const playerRef  = useRef<{
        x: number;
        y: number;
        direction: "down" | "left" | "right" | "up";
        frame: number;
    }>({
        x: defaultSpawn.x,
        y: defaultSpawn.y,
        direction: "down",
        frame: 0,
    });
    const cameraRef         = useRef({ x: 0, y: 0 });
    const remotePlayersRef  = useRef<Map<string, RemotePlayer>>(new Map());
    const lastFrameTimeRef  = useRef(0);
    const animAccRef        = useRef(0);
    const rafRef            = useRef<number>(0);

    // ── Loaded assets ─────────────────────────────────────────────────────
    const assetsRef = useRef<{
        spriteDown?:   HTMLImageElement;
        spriteLeft?:   HTMLImageElement;
        spriteRight?:  HTMLImageElement;
        spriteUp?:     HTMLImageElement;
        floorTileset?: HTMLImageElement;
        bgPattern?:    CanvasPattern | null;
    }>({});

    // ── Backend sync stubs ────────────────────────────────────────────────
    const onLocalPlayerMove = useCallback(
        (x: number, y: number, dir: string, frame: number) => {
            void x; void y; void dir; void frame;
            // Stub: emit to WebSocket server
        },
        []
    );

    // ── Main game loop ────────────────────────────────────────────────────
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

        let moved = false;

        if (vx !== 0 || vy !== 0) {
            if (vy > 0) player.direction = "down";
            else if (vy < 0) player.direction = "up";
            else if (vx < 0) player.direction = "left";
            else if (vx > 0) player.direction = "right";

            const dx = vx * PLAYER_SPEED;
            const dy = vy * PLAYER_SPEED;
            const curFootX = player.x;
            const curFootY = player.y + FEET_OFFSET_Y;

            // Test X axis independently with pixel-stepping on contact for smooth sliding
            if (dx !== 0) {
                const targetFootX = curFootX + dx;
                if (canMoveTo(targetFootX, curFootY, currentMap, collisionRects)) {
                    player.x += dx;
                    moved = true;
                } else {
                    const step = Math.sign(dx);
                    let fx = curFootX;
                    for (let s = 1; s <= Math.abs(dx); s++) {
                        if (canMoveTo(fx + step, curFootY, currentMap, collisionRects)) {
                            fx += step;
                            player.x += step;
                            moved = true;
                        } else {
                            break;
                        }
                    }
                }
            }

            // Test Y axis independently with pixel-stepping on contact for smooth sliding
            if (dy !== 0) {
                const updatedFootX = player.x;
                const targetFootY = curFootY + dy;
                if (canMoveTo(updatedFootX, targetFootY, currentMap, collisionRects)) {
                    player.y += dy;
                    moved = true;
                } else {
                    const step = Math.sign(dy);
                    let fy = curFootY;
                    for (let s = 1; s <= Math.abs(dy); s++) {
                        if (canMoveTo(updatedFootX, fy + step, currentMap, collisionRects)) {
                            fy += step;
                            player.y += step;
                            moved = true;
                        } else {
                            break;
                        }
                    }
                }
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

        // ── Camera: center map if viewport is larger, follow player if smaller
        if (vw >= currentMap.width) {
            camera.x = -(vw - currentMap.width) / 2;
        } else {
            camera.x = Math.max(0, Math.min(currentMap.width - vw, player.x - vw / 2));
        }

        if (vh >= currentMap.height) {
            camera.y = -(vh - currentMap.height) / 2;
        } else {
            camera.y = Math.max(0, Math.min(currentMap.height - vh, player.y - vh / 2));
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

        // ── Local player (rendered at full unzoomed avatar size) ───────────
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

    // ── Load map JSON & assets, start game loop ───────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                // Fetch canonical map JSON if available, or fall back to demoSpace.map
                let loadedMap: GameMap = demoSpace.map;
                try {
                    const res = await fetch("/assets/map/demo-map.json");
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

                const [down, left, right, up, floor, bg] = await Promise.all([
                    loadImage("/assets/avtar/Down/[TD] Character 0 Down Spritesheet.png"),
                    loadImage("/assets/avtar/Left/[TD] Character 0 Left Spritesheet.png"),
                    loadImage("/assets/avtar/Right/[TD] Character 0 Right Spritesheet.png"),
                    loadImage("/assets/avtar/Up/[TD] Character 0 Up Spritesheet.png"),
                    loadImage(scaled.floor.image),
                    loadImage("/assets/background/bg.png"),
                ]);

                if (cancelled) return;

                const canvas = canvasRef.current!;
                const ctx    = canvas.getContext("2d")!;
                const pat    = ctx.createPattern(bg, "repeat");

                assetsRef.current = {
                    spriteDown:   down,
                    spriteLeft:   left,
                    spriteRight:  right,
                    spriteUp:     up,
                    floorTileset: floor,
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

            {/* ── Prominent HUD: top-right (Player badge & Leave button) ─── */}
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
                    <span style={{ fontWeight: 600 }}>{displayName}</span>
                </div>

                <button
                    onClick={() => navigate(-1)}
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

            {/* ── Prominent HUD: bottom-left (Controls hint) ─── */}
            <div
                style={{
                    position: "absolute",
                    bottom: 18,
                    left: 18,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "rgba(9, 7, 24, 0.58)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: 12,
                    color: "#94a3b8",
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