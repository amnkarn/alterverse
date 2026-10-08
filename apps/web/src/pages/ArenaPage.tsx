import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSession } from "../lib/auth-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemotePlayer {
    id: string;
    x: number;
    y: number;
    direction: "down" | "left" | "right" | "up";
    frame: number;
    displayName: string;
}

interface ChatMessage {
    id: number;
    sender: string;
    text: string;
    self: boolean;
    timestamp: number;
}

// ─── Sprite Config ───────────────────────────────────────────────────────────
// Local custom avatar spritesheet: 256×64 → 4 frames × 64px each per direction
const SPRITE_FRAME_W = 64;
const SPRITE_FRAME_H = 64;
const SPRITE_FRAMES  = 4;
const SPRITE_FPS     = 8;          // animation speed
const PLAYER_SCALE   = 2;          // render at 2× size on screen
const PLAYER_RENDER_W = SPRITE_FRAME_W * PLAYER_SCALE;
const PLAYER_RENDER_H = SPRITE_FRAME_H * PLAYER_SCALE;

// Map / tile config
const TILE_SIZE     = 32;
const TILESET_COLS  = 2048 / TILE_SIZE; // FloorAndGround.png width ÷ tilesize = 64 cols
const CANVAS_W      = 800;
const CANVAS_H      = 600;
const PLAYER_SPEED  = 3;

// ─── Utility ─────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
    });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ArenaPage() {
    const { spaceId } = useParams<{ spaceId: string }>();
    const navigate    = useNavigate();
    const location    = useLocation();
    const { data: session } = useSession();

    // Passed from SpacePage via navigate state
    const state = location.state as {
        spaceId?: string;
        avatarId?: string;
        avatar?: { id: string; imageUrl: string; name: string };
        displayName?: string;
    } | null;

    const displayName = state?.displayName || session?.user?.name || "Player";

    // ── Refs: mutable game state (doesn't need React re-renders) ───────────
    const canvasRef         = useRef<HTMLCanvasElement>(null);
    const chatInputRef      = useRef<HTMLInputElement>(null);
    const chatBodyRef       = useRef<HTMLDivElement>(null);
    const messagesRef       = useRef<ChatMessage[]>([]);
    const chatRenderRef     = useRef<(() => void) | null>(null);

    const keysRef           = useRef<Set<string>>(new Set());
    const playerRef         = useRef<{
        x: number; y: number;
        direction: "down" | "left" | "right" | "up";
        frame: number;
    }>({ x: 400, y: 300, direction: "down", frame: 0 });
    const cameraRef         = useRef({ x: 0, y: 0 });
    const remotePlayersRef  = useRef<Map<string, RemotePlayer>>(new Map());
    const lastFrameTime     = useRef(0);
    const animAccRef        = useRef(0);
    const rafRef            = useRef<number>(0);
    const assetsRef         = useRef<{
        spriteDown?:  HTMLImageElement;
        spriteLeft?:  HTMLImageElement;
        spriteRight?: HTMLImageElement;
        spriteUp?:    HTMLImageElement;
        floorTileset?:HTMLImageElement;
        bgPattern?:   CanvasPattern | null;
        mapData?:     { width: number; height: number; groundData: number[] };
    }>({});

    // ── Stub: backend sync hooks ────────────────────────────────────────────
    const onLocalPlayerMove = useCallback(
        (x: number, y: number, direction: string, frame: number) => {
            // TODO: emit to WebSocket server
            void x; void y; void direction; void frame;
        },
        []
    );

    const handleRemotePlayerUpdate = useCallback((players: RemotePlayer[]) => {
        // TODO: called from WebSocket message handler
        players.forEach((p) => remotePlayersRef.current.set(p.id, p));
    }, []);
    void handleRemotePlayerUpdate;

    // ── Chat helpers ────────────────────────────────────────────────────────
    function sendSocketMessage(text: string) {
        // TODO: hook up to WebSocket
        void text;
    }

    const addMessage = useCallback((sender: string, text: string, self: boolean) => {
        const msg: ChatMessage = {
            id: Date.now() + Math.random(),
            sender,
            text,
            self,
            timestamp: Date.now(),
        };
        messagesRef.current = [...messagesRef.current.slice(-99), msg];
        chatRenderRef.current?.();
    }, []);

    const handleChatSend = useCallback(() => {
        const inp = chatInputRef.current;
        if (!inp) return;
        const text = inp.value.trim();
        if (!text) return;
        inp.value = "";
        addMessage(displayName, text, true);
        sendSocketMessage(text);
    }, [addMessage, displayName]);

    // ── Direction from keys ─────────────────────────────────────────────────
    function getDirectionFromKeys(keys: Set<string>): "down" | "left" | "right" | "up" | null {
        if (keys.has("ArrowDown") || keys.has("s") || keys.has("S"))  return "down";
        if (keys.has("ArrowUp")   || keys.has("w") || keys.has("W"))  return "up";
        if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A"))  return "left";
        if (keys.has("ArrowRight")|| keys.has("d") || keys.has("D"))  return "right";
        return null;
    }

    // ── Draw one player (local or remote) ──────────────────────────────────
    function drawPlayer(
        ctx: CanvasRenderingContext2D,
        sprites: { down?: HTMLImageElement; left?: HTMLImageElement; right?: HTMLImageElement; up?: HTMLImageElement },
        screenX: number,
        screenY: number,
        direction: "down" | "left" | "right" | "up",
        frame: number,
        name: string,
        isLocal: boolean
    ) {
        const sheet = direction === "down"  ? sprites.down
                    : direction === "left"  ? sprites.left
                    : direction === "right" ? sprites.right
                    : sprites.up;

        const drawX = screenX - PLAYER_RENDER_W / 2;
        const drawY = screenY - PLAYER_RENDER_H / 2;

        if (sheet) {
            ctx.drawImage(
                sheet,
                frame * SPRITE_FRAME_W, 0,
                SPRITE_FRAME_W, SPRITE_FRAME_H,
                drawX, drawY,
                PLAYER_RENDER_W, PLAYER_RENDER_H
            );
        } else {
            // Fallback: solid circle
            ctx.fillStyle = isLocal ? "rgba(139,92,246,0.9)" : "rgba(100,200,255,0.9)";
            ctx.beginPath();
            ctx.arc(screenX, screenY, 16, 0, Math.PI * 2);
            ctx.fill();
        }

        // Name-tag above head
        ctx.save();
        ctx.font        = "bold 12px 'Inter', sans-serif";
        ctx.textAlign   = "center";
        ctx.textBaseline= "bottom";
        const tagY = drawY - 4;

        // Background pill
        const textW = ctx.measureText(name).width;
        const padX = 6, padY = 3;
        const bgX = screenX - textW / 2 - padX;
        const bgW = textW + padX * 2;
        const bgH = 16 + padY;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(bgX, tagY - bgH, bgW, bgH, 4);
        ctx.fill();

        ctx.fillStyle = isLocal ? "#c4b5fd" : "#7dd3fc";
        ctx.fillText(name, screenX, tagY - padY + 2);
        ctx.restore();
    }

    // ── Draw map ground layer ───────────────────────────────────────────────
    function drawMap(
        ctx: CanvasRenderingContext2D,
        tileset: HTMLImageElement,
        mapData: { width: number; height: number; groundData: number[] },
        camX: number,
        camY: number
    ) {
        const { width: mapW, height: mapH, groundData } = mapData;
        const tilesetCols = TILESET_COLS;

        const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
        const endCol   = Math.min(mapW, Math.ceil((camX + CANVAS_W) / TILE_SIZE) + 1);
        const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
        const endRow   = Math.min(mapH, Math.ceil((camY + CANVAS_H) / TILE_SIZE) + 1);

        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const gid = groundData[row * mapW + col];
                if (!gid) continue;
                const tileId  = gid - 1; // 1-indexed → 0-indexed
                const srcX    = (tileId % tilesetCols) * TILE_SIZE;
                const srcY    = Math.floor(tileId / tilesetCols) * TILE_SIZE;
                const destX   = col * TILE_SIZE - camX;
                const destY   = row * TILE_SIZE - camY;

                ctx.drawImage(tileset, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // ── Main game loop ref (avoids forward-reference lint error) ────────────
    const gameLoopRef = useRef<((ts: number) => void) | null>(null);

    // ── Main game loop ──────────────────────────────────────────────────────
    const gameLoop = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dt = timestamp - lastFrameTime.current;
        lastFrameTime.current = timestamp;

        const assets = assetsRef.current;
        const keys   = keysRef.current;
        const player = playerRef.current;
        const camera = cameraRef.current;

        // ── Movement ──────────────────────────────────────────────────────
        const dir = getDirectionFromKeys(keys);
        let moved = false;
        if (dir) {
            player.direction = dir;
            const dx = dir === "left" ? -PLAYER_SPEED : dir === "right" ? PLAYER_SPEED : 0;
            const dy = dir === "up"   ? -PLAYER_SPEED : dir === "down"  ? PLAYER_SPEED : 0;
            player.x += dx;
            player.y += dy;
            moved = true;
        }

        // Animate only when moving
        if (moved) {
            animAccRef.current += dt;
            const msPerFrame = 1000 / SPRITE_FPS;
            if (animAccRef.current >= msPerFrame) {
                player.frame = (player.frame + 1) % SPRITE_FRAMES;
                animAccRef.current -= msPerFrame;
                onLocalPlayerMove(player.x, player.y, player.direction, player.frame);
            }
        } else {
            player.frame = 0;
            animAccRef.current = 0;
        }

        // Camera follows player
        camera.x = player.x - CANVAS_W / 2;
        camera.y = player.y - CANVAS_H / 2;

        // ── Clear ─────────────────────────────────────────────────────────
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // ── Background pattern (infinite tiled) ───────────────────────────
        if (assets.bgPattern) {
            ctx.save();
            ctx.translate(-((camera.x % 1000) + 1000) % 1000, -((camera.y % 1000) + 1000) % 1000);
            ctx.fillStyle = assets.bgPattern;
            ctx.fillRect(0, 0, CANVAS_W + 1000, CANVAS_H + 1000);
            ctx.restore();
        } else {
            ctx.fillStyle = "#1a1625";
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // ── Tiled Map ─────────────────────────────────────────────────────
        if (assets.floorTileset && assets.mapData) {
            drawMap(ctx, assets.floorTileset, assets.mapData, camera.x, camera.y);
        }

        // ── Remote players ────────────────────────────────────────────────
        const sprites = {
            down:  assets.spriteDown,
            left:  assets.spriteLeft,
            right: assets.spriteRight,
            up:    assets.spriteUp,
        };
        remotePlayersRef.current.forEach((rp) => {
            const sx = rp.x - camera.x;
            const sy = rp.y - camera.y;
            if (sx < -64 || sx > CANVAS_W + 64 || sy < -64 || sy > CANVAS_H + 64) return; // frustum cull
            drawPlayer(ctx, sprites, sx, sy, rp.direction, rp.frame, rp.displayName, false);
        });

        // ── Local player (always centered) ────────────────────────────────
        drawPlayer(ctx, sprites, CANVAS_W / 2, CANVAS_H / 2, player.direction, player.frame, displayName, true);

        rafRef.current = requestAnimationFrame((ts) => gameLoopRef.current?.(ts));
    }, [displayName, onLocalPlayerMove]);

    useEffect(() => {
        gameLoopRef.current = gameLoop;
    }, [gameLoop]);

    // ── Load assets then start loop ─────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const [down, left, right, up, floor, bg, mapRes] = await Promise.all([
                    loadImage("/assets/avtar/Down/[TD] Character 0 Down Spritesheet.png"),
                    loadImage("/assets/avtar/Left/[TD] Character 0 Left Spritesheet.png"),
                    loadImage("/assets/avtar/Right/[TD] Character 0 Right Spritesheet.png"),
                    loadImage("/assets/avtar/Up/[TD] Character 0 Up Spritesheet.png"),
                    loadImage("/assets/map/FloorAndGround.png"),
                    loadImage("/assets/background/bg.png"),
                    fetch("/assets/map/map.json").then((r) => r.json()),
                ]);

                if (cancelled) return;

                // Build bg pattern
                const canvas = canvasRef.current!;
                const ctx    = canvas.getContext("2d")!;
                const pat    = ctx.createPattern(bg, "repeat");

                // Extract ground layer data
                const groundLayer = mapRes.layers.find((l: { name: string }) => l.name === "Ground");
                const mapData = {
                    width:  mapRes.width  as number,
                    height: mapRes.height as number,
                    groundData: (groundLayer?.data ?? []) as number[],
                };

                assetsRef.current = {
                    spriteDown:  down,
                    spriteLeft:  left,
                    spriteRight: right,
                    spriteUp:    up,
                    floorTileset: floor,
                    bgPattern:   pat,
                    mapData,
                };

                // Start player roughly in center of map
                playerRef.current.x = (mapData.width  * TILE_SIZE) / 2;
                playerRef.current.y = (mapData.height * TILE_SIZE) / 2;

                lastFrameTime.current = performance.now();
                rafRef.current = requestAnimationFrame(gameLoop);
            } catch (err) {
                console.error("[ArenaPage] Asset load error:", err);
                if (!cancelled) {
                    // Start even if assets failed — will render fallback shapes
                    lastFrameTime.current = performance.now();
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

    // ── Keyboard events ─────────────────────────────────────────────────────
    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            // Don't capture if focus is in chat input
            if (e.target === chatInputRef.current) return;
            keysRef.current.add(e.key);
        };
        const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
        window.addEventListener("keydown", onDown);
        window.addEventListener("keyup",   onUp);
        return () => {
            window.removeEventListener("keydown", onDown);
            window.removeEventListener("keyup",   onUp);
        };
    }, []);

    // ── Chat render hook ────────────────────────────────────────────────────
    const renderChat = useCallback(() => {
        const body = chatBodyRef.current;
        if (!body) return;
        body.innerHTML = "";
        messagesRef.current.forEach((msg) => {
            const row = document.createElement("div");
            row.style.cssText = `
                display:flex; flex-direction:column;
                align-items: ${msg.self ? "flex-end" : "flex-start"};
                gap: 1px; margin-bottom: 4px;
            `;
            const bubble = document.createElement("div");
            bubble.style.cssText = `
                max-width: 85%; padding: 4px 8px;
                border-radius: 8px; font-size: 12px; line-height: 1.4;
                background: ${msg.self ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.08)"};
                border: 1px solid ${msg.self ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.1)"};
                color: #f1f5f9; word-break: break-word;
            `;
            const sender = document.createElement("span");
            sender.style.cssText = `font-size:10px; color:${msg.self ? "#c4b5fd" : "#94a3b8"}; font-weight:600;`;
            sender.textContent = msg.self ? "You" : msg.sender;
            bubble.prepend(sender, document.createElement("br"));
            // Re-create text node safely
            const textNode = document.createTextNode(msg.text);
            bubble.appendChild(textNode);
            row.appendChild(bubble);
            body.appendChild(row);
        });
        body.scrollTop = body.scrollHeight;
    }, []);

    useEffect(() => {
        chatRenderRef.current = renderChat;
    }, [renderChat]);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "#0d0b1e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
            }}
        >
            {/* ── Game Canvas ── */}
            <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{
                    display: "block",
                    imageRendering: "pixelated",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 0 60px rgba(0,0,0,0.8)",
                }}
            />

            {/* ── HUD Overlays ── */}

            {/* Top-left: Space info */}
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    userSelect: "none",
                }}
            >
                <div
                    style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(9,7,24,0.75)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(8px)",
                        fontSize: 11,
                        fontFamily: "monospace",
                        letterSpacing: "0.12em",
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
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(139,92,246,0.12)",
                            border: "1px solid rgba(167,139,250,0.2)",
                            fontSize: 10,
                            color: "#a78bfa",
                            fontFamily: "monospace",
                        }}
                    >
                        Space: {spaceId.slice(0, 8)}…
                    </div>
                )}
            </div>

            {/* Top-right: Player info + Exit */}
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <div
                    style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(9,7,24,0.75)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(8px)",
                        fontSize: 11,
                        color: "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <span
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#34d399",
                            display: "inline-block",
                            boxShadow: "0 0 6px #34d399",
                        }}
                    />
                    <span style={{ fontWeight: 600 }}>{displayName}</span>
                </div>

                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        backdropFilter: "blur(8px)",
                        fontSize: 11,
                        color: "#fca5a5",
                        cursor: "pointer",
                        fontWeight: 600,
                    }}
                >
                    ✕ Leave
                </button>
            </div>

            {/* Bottom-left: Controls hint */}
            <div
                style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(9,7,24,0.55)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 10,
                    color: "#64748b",
                    userSelect: "none",
                    pointerEvents: "none",
                    fontFamily: "monospace",
                }}
            >
                WASD / Arrow keys to move
            </div>

            {/* Bottom-right: Chat HUD */}
            <div
                style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    width: 280,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                }}
            >
                {/* Messages area */}
                <div
                    ref={chatBodyRef}
                    style={{
                        height: 160,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        padding: "6px 8px",
                        borderRadius: "10px 10px 0 0",
                        background: "rgba(9,7,24,0.65)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderBottom: "none",
                        backdropFilter: "blur(12px)",
                        scrollbarWidth: "none",
                    }}
                />

                {/* Input row */}
                <div
                    style={{
                        display: "flex",
                        gap: 4,
                        padding: "5px 6px",
                        borderRadius: "0 0 10px 10px",
                        background: "rgba(9,7,24,0.75)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <input
                        ref={chatInputRef}
                        type="text"
                        maxLength={200}
                        placeholder="Say something…"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleChatSend();
                            e.stopPropagation(); // don't let WASD trigger movement
                        }}
                        style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            fontSize: 12,
                            color: "#f1f5f9",
                            fontFamily: "inherit",
                        }}
                    />
                    <button
                        onClick={handleChatSend}
                        style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: "rgba(139,92,246,0.7)",
                            border: "1px solid rgba(167,139,250,0.4)",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        ↵
                    </button>
                </div>
            </div>
        </div>
    );
}