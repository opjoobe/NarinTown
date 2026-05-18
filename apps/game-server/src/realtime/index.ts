import type { Server as IOServer, Socket } from 'socket.io';
import type { FastifyBaseLogger } from 'fastify';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@narintown/shared/events';
import { verifySession } from '../infra/session.js';
import { handleConnection } from './connection.js';
import { startTickLoop } from './tick.js';
import { startSleepWatcher } from './sleep.js';

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return v;
  }
  return undefined;
}

export function registerRealtime(io: IO, log: FastifyBaseLogger): void {
  io.use((socket, next) => {
    const auth = (socket.handshake.auth ?? {}) as { token?: string };
    let token: string | undefined = auth.token;
    if (!token) {
      token = parseCookie(socket.handshake.headers.cookie, 'narintown_session');
    }
    const userId = verifySession(token ?? null);
    if (!userId) {
      next(new Error('unauthorized'));
      return;
    }
    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket: ClientSocket) => {
    const userId = socket.data.userId as string;
    log.info({ socketId: socket.id, userId }, 'socket connected');
    handleConnection(io, socket, log).catch((err: unknown) => {
      log.error({ err, userId }, 'connection handler failed');
      socket.disconnect(true);
    });
  });

  startTickLoop(io);
  startSleepWatcher(io);
}

declare module 'socket.io' {
  interface SocketData {
    userId: string;
  }
}
