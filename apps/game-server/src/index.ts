import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { Server as IOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@narintown/shared/events';
import { registerHealthRoutes } from './http/health.js';
import { registerAuthRoutes } from './http/auth.js';
import { registerProfileRoutes } from './http/profile.js';
import { registerAdminRoutes } from './http/admin.js';
import { registerRealtime } from './realtime/index.js';

const PORT = Number(process.env.GAME_SERVER_PORT ?? 3001);
const ORIGIN = process.env.GAME_SERVER_ORIGIN ?? 'http://localhost:3000';

const app = Fastify({
  logger: {
    transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } },
  },
});

await app.register(cors, { origin: ORIGIN, credentials: true });
await app.register(cookie, { secret: process.env.SESSION_SECRET });

await registerHealthRoutes(app);
await registerAuthRoutes(app);
await registerProfileRoutes(app);
await registerAdminRoutes(app);

const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: { origin: ORIGIN, credentials: true },
});

registerRealtime(io, app.log);

await app.listen({ port: PORT, host: '0.0.0.0' });
app.log.info(`🌳 NarinTown game server listening on :${PORT}`);
