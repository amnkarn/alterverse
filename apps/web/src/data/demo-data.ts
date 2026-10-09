// ─── Demo Space & Map Data ──────────────────────────────────────────────────
// Uses the canonical GameMap JSON format per specs/04-arena-fix.md

import type { GameMap } from "../types/map";
import mapJson from "./map.json";

export const demoMap: GameMap = mapJson as unknown as GameMap;

export interface DemoSpace {
    id: string;
    name: string;
    map: GameMap;
    spawnX: number;
    spawnY: number;
}

export const demoSpace: DemoSpace = {
    id: "demo-space",
    name: "Alterverse HQ",
    map: demoMap,
    spawnX: demoMap.spawnPoints[0]?.x ?? 700,
    spawnY: demoMap.spawnPoints[0]?.y ?? 600,
};
