export type MapElement = {
    id: string;
    elementId: string;
    gid?: number;
    layerName?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    layer?: number;
    properties?: { name: string; type?: string; value: unknown }[];
    collision?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};

export type TilesetDef = {
    firstgid: number;
    name: string;
    image: string;
    tilewidth: number;
    tileheight: number;
    columns: number;
    tilecount: number;
    tiles?: {
        id: number;
        properties?: { name: string; type?: string; value: unknown }[];
    }[];
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

    tilesets?: TilesetDef[];

    layers?: {
        id?: number;
        name: string;
        type: string;
        width?: number;
        height?: number;
        visible?: boolean;
        opacity?: number;
        x?: number;
        y?: number;
        data?: number[];
        objects?: unknown[];
    }[];
};

export type CollisionRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export interface RemotePlayer {
    id: string;
    x: number;
    y: number;
    direction: "down" | "left" | "right" | "up";
    frame: number;
    displayName: string;
}
