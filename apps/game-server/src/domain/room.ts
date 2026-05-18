import type {
  Direction,
  PlayerState,
  PlayerStatus,
  PlayerTickState,
} from '@narintown/shared/types';
import { DEFAULT_MAP_ID } from '@narintown/shared/constants';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface ServerPlayer {
  id: string;
  socketId: string | null; // disconnected이면 null
  nickname: string;
  avatarKey: string;
  x: number;
  y: number;
  dir: Direction;
  status: PlayerStatus;
  input: InputState;
  lastInputAt: number;
  lastMovedAt: number; // 위치 실제 변경 timestamp (initiator 판정용)
  activePairId: string | null;
  lastPersistedX: number;
  lastPersistedY: number;
  lastPersistedDir: Direction;
  lastPersistedAt: number;
}

export const DEFAULT_INPUT: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

class Room {
  readonly mapId = DEFAULT_MAP_ID;
  readonly players = new Map<string, ServerPlayer>();

  add(player: ServerPlayer): void {
    this.players.set(player.id, player);
  }

  remove(playerId: string): void {
    this.players.delete(playerId);
  }

  get(playerId: string): ServerPlayer | undefined {
    return this.players.get(playerId);
  }

  values(): IterableIterator<ServerPlayer> {
    return this.players.values();
  }

  toPlayerStates(): PlayerState[] {
    return Array.from(this.players.values(), (p) => toPlayerState(p));
  }
}

export const room = new Room();

export function toPlayerState(p: ServerPlayer): PlayerState {
  return {
    id: p.id,
    nickname: p.nickname,
    avatarKey: p.avatarKey,
    x: Math.round(p.x),
    y: Math.round(p.y),
    dir: p.dir,
    status: p.status,
  };
}

export function toTickState(p: ServerPlayer): PlayerTickState {
  return {
    id: p.id,
    x: Math.round(p.x),
    y: Math.round(p.y),
    dir: p.dir,
    status: p.status,
  };
}
