/**
 * NarinTown 부하 테스트 스크립트
 *
 * 사용법:
 *   pnpm load-test [count] [duration_sec] [--cleanup]
 *
 * 예시:
 *   pnpm load-test                  # 기본 40봇 × 60초
 *   pnpm load-test 40 60 --cleanup  # 끝난 후 봇 유저 자동 삭제
 *   pnpm load-test:clean            # 부하 테스트 없이 봇만 정리
 *
 * 사전:
 *   - game-server, postgres, redis 가 떠 있어야 함
 *   - 스크립트는 봇 유저를 DB에 자동 upsert함 (email: bot-{i}@narintown.local)
 *   - SESSION_SECRET이 .env에 game-server와 동일해야 함 (같은 .env 공유하므로 자동)
 *
 * 측정 지표:
 *   - 평균 state:tick 수신 간격
 *   - 입력 → 다음 tick 도착까지 RTT
 *   - 채팅 메시지 송수신 수
 */

import 'dotenv/config';
import { io, type Socket } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  StateTickPayload,
} from '@narintown/shared/events';
import type { InputDirection } from '@narintown/shared/types';
import { TICK_INTERVAL_MS } from '@narintown/shared/constants';

const URL = process.env.LOAD_TEST_URL ?? 'http://localhost:3001';
const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  console.error('SESSION_SECRET missing in env');
  process.exit(1);
}

const args = process.argv.slice(2);
const cleanupOnly = args.includes('--clean-only');
const cleanup = cleanupOnly || args.includes('--cleanup');
const positional = args.filter((a) => !a.startsWith('--'));
const count = Number(positional[0] ?? 40);
const durationSec = Number(positional[1] ?? 60);

function signUserId(userId: string): string {
  const hmac = createHmac('sha256', SECRET!).update(userId).digest('base64url');
  return `${userId}.${hmac}`;
}

const prisma = new PrismaClient();

interface BotStats {
  id: string;
  ticksReceived: number;
  chatsReceived: number;
  inputsSent: number;
  connectedAt: number;
  lastTickAt: number;
  tickIntervalsSum: number; // ms 합
  tickIntervalSamples: number;
}

const stats: BotStats[] = [];

async function ensureBot(i: number): Promise<{ id: string; nickname: string }> {
  const email = `bot-${i}@narintown.local`;
  const nickname = `bot_${i}`;
  const avatarKey = 'preset:pokemon_025';

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      nickname,
      avatarKey,
      profile: { create: { skills: ['load-test'], bio: '부하 테스트 봇' } },
      quiz: { create: { question: `bot ${i}의 퀴즈 (정답 O)`, answer: true } },
      score: { create: {} },
    },
    update: {
      avatarKey,
      profile: { upsert: { create: { skills: ['load-test'] }, update: {} } },
      quiz: {
        upsert: {
          create: { question: `bot ${i}의 퀴즈 (정답 O)`, answer: true },
          update: {},
        },
      },
      score: { upsert: { create: {}, update: {} } },
    },
  });
  return { id: user.id, nickname: user.nickname };
}

const DIRS: InputDirection[] = ['up', 'down', 'left', 'right', 'stop'];

async function spawnBot(i: number): Promise<void> {
  const bot = await ensureBot(i);
  const token = signUserId(bot.id);

  const s: BotStats = {
    id: bot.id,
    ticksReceived: 0,
    chatsReceived: 0,
    inputsSent: 0,
    connectedAt: Date.now(),
    lastTickAt: 0,
    tickIntervalsSum: 0,
    tickIntervalSamples: 0,
  };
  stats.push(s);

  type SocketT = Socket<ServerToClientEvents, ClientToServerEvents>;
  const socket: SocketT = io(URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('state:tick', (_p: StateTickPayload) => {
    s.ticksReceived++;
    const now = Date.now();
    if (s.lastTickAt > 0) {
      s.tickIntervalsSum += now - s.lastTickAt;
      s.tickIntervalSamples++;
    }
    s.lastTickAt = now;
  });

  socket.on('chat:global', () => s.chatsReceived++);

  socket.on('connect_error', (err) =>
    console.warn(`[bot ${i}] connect_error:`, err.message),
  );

  // 무작위 이동: 1~3초마다 방향 변경
  const moveInterval = setInterval(() => {
    const dir = DIRS[Math.floor(Math.random() * DIRS.length)]!;
    socket.emit('player:input', { dir, t: Date.now() });
    s.inputsSent++;
  }, 1000 + Math.random() * 2000);

  // 가끔 채팅 (10% 봇만, 30초 1회)
  let chatInterval: NodeJS.Timeout | null = null;
  if (Math.random() < 0.1) {
    chatInterval = setInterval(() => {
      socket.emit('chat:global', { text: `hi from bot ${i}` });
    }, 30_000);
  }

  setTimeout(() => {
    clearInterval(moveInterval);
    if (chatInterval) clearInterval(chatInterval);
    socket.disconnect();
  }, durationSec * 1000);
}

async function cleanupBots(): Promise<void> {
  const deleted = await prisma.user.deleteMany({
    where: { email: { startsWith: 'bot-' } },
  });
  console.log(`[load-test] 🧹 deleted ${deleted.count} bot users (cascade: profile/quiz/score/attempts/position)`);
}

async function main(): Promise<void> {
  if (cleanupOnly) {
    console.log('[load-test] cleanup only — no bots spawned');
    await cleanupBots();
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(`[load-test] target=${URL}, count=${count}, duration=${durationSec}s, cleanup=${cleanup}`);

  // 순차 ensureBot으로 DB 부담 줄임
  for (let i = 0; i < count; i++) {
    await spawnBot(i);
    if ((i + 1) % 10 === 0) console.log(`[load-test] spawned ${i + 1}/${count}`);
  }
  console.log('[load-test] all bots connected, running…');

  await new Promise((r) => setTimeout(r, durationSec * 1000 + 2000));

  // 통계 집계
  const totalTicks = stats.reduce((s, b) => s + b.ticksReceived, 0);
  const totalChats = stats.reduce((s, b) => s + b.chatsReceived, 0);
  const totalInputs = stats.reduce((s, b) => s + b.inputsSent, 0);
  const intervalAvg =
    stats.reduce((s, b) => s + (b.tickIntervalSamples ? b.tickIntervalsSum / b.tickIntervalSamples : 0), 0) /
    stats.length;
  const expectedInterval = TICK_INTERVAL_MS;

  console.log('===== Results =====');
  console.log(`bots:          ${stats.length}`);
  console.log(`duration:      ${durationSec}s`);
  console.log(`inputs sent:   ${totalInputs} (avg ${(totalInputs / stats.length).toFixed(1)}/bot)`);
  console.log(`ticks recv:    ${totalTicks} (avg ${(totalTicks / stats.length).toFixed(1)}/bot)`);
  console.log(`avg interval:  ${intervalAvg.toFixed(1)}ms (expected ~${expectedInterval}ms)`);
  console.log(`chats recv:    ${totalChats}`);

  if (cleanup) {
    await cleanupBots();
  } else {
    console.log('[load-test] 💡 봇 정리하려면 `pnpm load-test:clean` 실행');
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
