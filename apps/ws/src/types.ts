

export type Direction = "up" | "down" | "left" | "right";
export type PlayerState = "idle" | "walking" | "sitting";

export type Player = {
  playerId: string;
  userId: string;
  spaceId: string;
  displayName: string;
  avatarId?: string;
  character?: string;
  x: number;
  y: number;
  direction: Direction;
  state: PlayerState;
  frame: number;
};

export type OutgoingMessage = {
  type: string;
  payload?: unknown;
};
