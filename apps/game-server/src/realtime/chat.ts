import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessagePayload,
} from '@narintown/shared/events';
import { room } from '../domain/room.js';
import { redis } from '../infra/redis.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const CHAT_HISTORY_KEY = 'chat:global:history';
const CHAT_HISTORY_LEN = 200;
const CHAT_HISTORY_FETCH = 50;
const CHAT_RATE_MIN_INTERVAL_MS = 400; // 초당 2.5회
const CHAT_MAX_LEN = 200;

function sanitize(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.slice(0, CHAT_MAX_LEN);
}

let redisReady = false;
async function ensureRedis(): Promise<boolean> {
  if (redisReady) return true;
  try {
    if (redis.status === 'wait' || redis.status === 'end') {
      await redis.connect();
    }
    redisReady = true;
    return true;
  } catch (err) {
    console.warn('[chat] redis unavailable, history disabled', err);
    return false;
  }
}

async function pushHistory(msg: ChatMessagePayload): Promise<void> {
  if (!(await ensureRedis())) return;
  try {
    await redis.xadd(
      CHAT_HISTORY_KEY,
      'MAXLEN',
      '~',
      String(CHAT_HISTORY_LEN),
      '*',
      'msg',
      JSON.stringify(msg),
    );
  } catch (err) {
    console.warn('[chat] xadd failed', err);
  }
}

export async function fetchHistory(): Promise<ChatMessagePayload[]> {
  if (!(await ensureRedis())) return [];
  try {
    const entries = await redis.xrevrange(CHAT_HISTORY_KEY, '+', '-', 'COUNT', CHAT_HISTORY_FETCH);
    return entries
      .reverse()
      .map(([, fields]) => {
        const idx = fields.indexOf('msg');
        if (idx < 0) return null;
        try {
          return JSON.parse(fields[idx + 1] ?? '') as ChatMessagePayload;
        } catch {
          return null;
        }
      })
      .filter((m): m is ChatMessagePayload => !!m);
  } catch (err) {
    console.warn('[chat] xrevrange failed', err);
    return [];
  }
}

export function registerChatHandlers(io: IO, socket: ClientSocket, userId: string): void {
  let lastChatAt = 0;

  socket.on('chat:global', async (payload) => {
    const now = Date.now();
    if (now - lastChatAt < CHAT_RATE_MIN_INTERVAL_MS) return;
    const text = sanitize(payload?.text);
    if (!text) return;
    const sender = room.get(userId);
    if (!sender) return;

    lastChatAt = now;
    const msg: ChatMessagePayload = {
      from: userId,
      fromNickname: sender.nickname,
      text,
      t: now,
    };
    io.emit('chat:global', msg);
    pushHistory(msg).catch(() => {
      /* logged */
    });
  });
}
