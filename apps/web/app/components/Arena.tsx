"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
const TILE_SIZE = 40; // Size of each grid block in pixels

type PlayerPosition = { x: number; y: number };
type PlayerMap = Map<string, PlayerPosition>;

export default function MetaverseArena({ spaceId, token }: { spaceId: string; token: string; }) {
    const wsRef = useRef<WebSocket | null>(null);
    const [players, setPlayers] = useState<PlayerMap>(new Map());
    const [myPosition, setMyPosition] = useState<PlayerPosition>({ x: 0, y: 0 });
    const [status, setStatus] = useState("Connecting...");
    const [error, setError] = useState("");

    // Handle incoming WebSocket messages
    type IncomingUser = { userId: string; x?: number; y?: number };

    const handleMessage = useCallback((event: MessageEvent) => {
        const parsedData = JSON.parse(event.data);

        switch (parsedData.type) {
            case "space-joined": {
                setMyPosition({
                    x: parsedData.payload.spawn.x,
                    y: parsedData.payload.spawn.y
                });

                const existingPlayers: PlayerMap = new Map();
                (parsedData.payload.users ?? []).forEach((user: IncomingUser) => {
                    if (!user.userId) return;
                    existingPlayers.set(user.userId, {
                        x: user.x ?? 0,
                        y: user.y ?? 0
                    });
                });

                setPlayers(existingPlayers);
                setStatus("Connected");
                break;
            }

            case "user-joined":
                setPlayers(prev => {
                    const newMap = new Map(prev);
                    newMap.set(parsedData.payload.userId, {
                        x: parsedData.payload.x,
                        y: parsedData.payload.y
                    });
                    return newMap;
                });
                break;

            case "movement":
                setPlayers(prev => {
                    const newMap = new Map(prev);
                    newMap.set(parsedData.payload.userId, {
                        x: parsedData.payload.x,
                        y: parsedData.payload.y
                    });
                    return newMap;
                });
                break;

            case "movement-rejected":
                setMyPosition({
                    x: parsedData.payload.x,
                    y: parsedData.payload.y
                });
                break;

            case "user-left":
                setPlayers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(parsedData.payload.userId);
                    return newMap;
                });
                break;

            default:
                console.log("Unknown message type:", parsedData.type);
        }
    }, []);

    // Setup WebSocket Connection
    useEffect(() => {
        if (!spaceId || !token) {
            setError("Missing spaceId or auth token.");
            return;
        }

        setError("");
        setStatus("Connecting...");

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "join",
                payload: { spaceId, token }
            }));
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
            setStatus("Disconnected");
        };

        ws.onerror = () => {
            setError("WebSocket connection error.");
            setStatus("Error");
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [spaceId, token, handleMessage]);

    // Handle Keyboard Movement (WASD or Arrow Keys)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

            let newX = myPosition.x;
            let newY = myPosition.y;
            const key = e.key.toLowerCase();

            if (key === 'arrowup' || key === 'w') newY -= 1;
            if (key === 'arrowdown' || key === 's') newY += 1;
            if (key === 'arrowleft' || key === 'a') newX -= 1;
            if (key === 'arrowright' || key === 'd') newX += 1;

            if (newX !== myPosition.x || newY !== myPosition.y) {
                setMyPosition({ x: newX, y: newY });
                wsRef.current.send(JSON.stringify({
                    type: "move",
                    payload: { x: newX, y: newY }
                }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [myPosition]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 16, top: 16, zIndex: 20, color: 'white', fontSize: 14 }}>
                <div>Status: {status}</div>
                {error ? <div style={{ color: '#ff6b6b' }}>{error}</div> : null}
                <div>Space: {spaceId}</div>
            </div>

            {Array.from(players.entries()).map(([id, pos]) => (
                <div
                    key={id}
                    style={{
                        position: 'absolute',
                        left: pos.x * TILE_SIZE,
                        top: pos.y * TILE_SIZE,
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        backgroundColor: '#ff4444',
                        borderRadius: '50%',
                        transition: 'all 0.1s linear'
                    }}
                >
                    <span style={{color: 'white', fontSize: '10px', position: 'absolute', top: '-15px'}}>{id.substring(0,4)}</span>
                </div>
            ))}

            <div
                style={{
                    position: 'absolute',
                    left: myPosition.x * TILE_SIZE,
                    top: myPosition.y * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    backgroundColor: '#44ff44',
                    borderRadius: '8px',
                    transition: 'all 0.1s linear',
                    zIndex: 10
                }}
            />
        </div>
    );
}