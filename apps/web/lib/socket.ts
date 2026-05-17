'use client';

import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@narintown/shared/events';

const URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(URL, {
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
}
