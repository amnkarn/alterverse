import WebSocket from "ws";
import { prismaClient } from "@repo/db/client";
import { RoomManager } from "./RoomManager.js";
import type { Direction, OutgoingMessage, Player, PlayerState } from "./types.js";

const DEMO_SPACE_ID = "demo-space";
const DEMO_MAP_WIDTH = 1280;
const DEMO_MAP_HEIGHT = 960;

type AuthenticatedUser = {
  id: string;
  name: string;
};

export type AuthenticatedUserPromise = Promise<AuthenticatedUser | null>;

type JoinPayload = {
  spaceId?: string;
  displayName?: string;
  avatarId?: string;
  character?: string;
};

export class User {
  public readonly id = crypto.randomUUID();
  private readonly ws: WebSocket;
  private readonly authenticatedUserPromise: AuthenticatedUserPromise;
  private authenticatedUser?: AuthenticatedUser;
  private player?: Player;

  constructor(ws: WebSocket, userPromise: AuthenticatedUserPromise) {
    this.ws = ws;
    this.authenticatedUserPromise = userPromise;
    this.initHandler();
  }

  private async join(payload: JoinPayload) {
    if (this.player) return;
    if (!this.authenticatedUser) return;

    const spaceId = payload.spaceId ?? DEMO_SPACE_ID;
    let width = DEMO_MAP_WIDTH;
    let height = DEMO_MAP_HEIGHT;

    if (spaceId !== DEMO_SPACE_ID) {
      const space = await prismaClient.space.findUnique({
        where: { id: spaceId },
        select: { width: true, height: true },
      });

      if (!space) {
        this.send({ type: "error", payload: { message: "Space not found" } });
        this.ws.close(1008, "Space not found");
        return;
      }

      width = space.width;
      height = space.height;
    }

    const room = RoomManager.getInstance();
    const roomSize = room.rooms.get(spaceId)?.length ?? 0;
    const spawnIndex = roomSize % 8;
    const spawnX = 400 + (spawnIndex % 4) * 120;
    const spawnY = 300 + Math.floor(spawnIndex / 4) * 120;

    const player: Player = {
      playerId: this.id,
      userId: this.authenticatedUser.id,
      spaceId,
      displayName: payload.displayName?.trim() || this.authenticatedUser.name || "Player",
      avatarId: payload.avatarId,
      character: payload.character,
      x: Math.min(spawnX, width - 24),
      y: Math.min(spawnY, height - 24),
      direction: "down",
      state: "idle",
      frame: 1,
    };

    this.player = player;
    room.addUser(spaceId, this);

    const users = room.rooms.get(spaceId)
      ?.filter((user) => user !== this)
      .map((user) => user.getPlayer())
      .filter((item): item is Player => Boolean(item)) ?? [];

    this.send({
      type: "space-joined",
      payload: { self: player, users },
    });

    room.broadcast(
      { type: "user-joined", payload: player },
      this,
      spaceId,
    );
    console.log(`[ws] ${player.displayName} joined ${spaceId}; users=${room.rooms.get(spaceId)?.length ?? 0}`);
  }

  private handleMovement(payload: Record<string, unknown>) {
    if (!this.player) return;

    if (typeof payload.x === "number") this.player.x = payload.x;
    if (typeof payload.y === "number") this.player.y = payload.y;
    if (typeof payload.direction === "string") {
      this.player.direction = payload.direction as Direction;
    }
    if (typeof payload.state === "string") {
      this.player.state = payload.state as PlayerState;
    }
    if (typeof payload.frame === "number") this.player.frame = payload.frame;
    if (typeof payload.character === "string") this.player.character = payload.character;

    RoomManager.getInstance().broadcast(
      { type: "movement", payload: this.player },
      this,
      this.player.spaceId,
    );
  }

  private initHandler() {
    this.ws.on("message", async (data) => {
      try {
        if (!this.authenticatedUser) {
          const authenticatedUser = await this.authenticatedUserPromise;
          if (authenticatedUser) this.authenticatedUser = authenticatedUser;
        }
        if (!this.authenticatedUser) {
          this.ws.close(1008, "Unauthorized");
          return;
        }

        const message = JSON.parse(data.toString()) as {
          type?: string;
          payload?: Record<string, unknown>;
        };

        switch (message.type) {
          case "join":
            console.log(`[ws] join received from ${this.authenticatedUser.id}`);
            await this.join((message.payload ?? {}) as JoinPayload);
            break;
          case "move":
          case "player-state":
            this.handleMovement(message.payload ?? message);
            break;
          case "leave":
            this.destroy();
            break;
          default:
            this.send({ type: "error", payload: { message: "Unknown message type" } });
        }
      } catch (error) {
        console.error("Invalid WebSocket message:", error);
        this.send({ type: "error", payload: { message: "Invalid message" } });
      }
    });
  }

  getPlayer() {
    return this.player;
  }

  destroy() {
    if (!this.player) return;

    const { spaceId, userId } = this.player;
    const room = RoomManager.getInstance();
    room.removeUser(this, spaceId);
    room.broadcast({
      type: "user-left",
      payload: { playerId: this.id, userId },
    }, this, spaceId);
    this.player = undefined;
  }

  send(message: OutgoingMessage) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
