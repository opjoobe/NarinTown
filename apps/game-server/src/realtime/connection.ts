import type { Server, Socket } from 'socket.io';
import type { FastifyBaseLogger } from 'fastify';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@narintown/shared/events';
import { prisma } from '../infra/prisma.js';
import {
  room,
  toPlayerState,
  DEFAULT_INPUT,
  type ServerPlayer,
} from '../domain/room.js';
import { pickRandomSpawn, clampToMap, MAP_BOUNDS } from '../domain/map.js';
import { persistPositionIfStale } from './persist.js';
import { registerChatHandlers, fetchHistory } from './chat.js';
import { broadcastLeaderboard, registerQuizHandlers } from './quiz.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const VALID_DIRS = ['up', 'down', 'left', 'right', 'stop'] as const;
const INPUT_RATE_LIMIT_MS = 16; // 클라 입력은 최대 60Hz

export async function handleConnection(
  io: IO,
  socket: ClientSocket,
  log: FastifyBaseLogger,
): Promise<void> {
  const userId = socket.data.userId;

  // 1. User + LastPosition 로드
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { lastPosition: true },
  });
  if (!user) {
    socket.emit('system:error', { code: 'user_not_found', message: 'user_not_found' });
    socket.disconnect(true);
    return;
  }
  if (user.avatarKey === 'pending') {
    socket.emit('system:error', {
      code: 'not_onboarded',
      message: '온보딩이 완료되지 않았습니다.',
    });
    socket.disconnect(true);
    return;
  }

  // 2. 위치 결정: LastPosition 있으면 복원, 없으면 스폰존 무작위
  let x: number;
  let y: number;
  let dir: ServerPlayer['dir'] = 'down';
  if (user.lastPosition) {
    const clamped = clampToMap(user.lastPosition.x, user.lastPosition.y);
    x = clamped.x;
    y = clamped.y;
    dir = (user.lastPosition.dir as ServerPlayer['dir']) ?? 'down';
  } else {
    const occupied = Array.from(room.values(), (p) => ({ x: p.x, y: p.y }));
    const spawn = pickRandomSpawn(occupied);
    x = spawn.x;
    y = spawn.y;
  }

  // 3. 동일 유저 기존 소켓이 있으면 자리만 이어받기 (중복 접속)
  const existing = room.get(userId);
  if (existing) {
    if (existing.socketId && existing.socketId !== socket.id) {
      io.sockets.sockets.get(existing.socketId)?.disconnect(true);
    }
    existing.socketId = socket.id;
    existing.status = 'active';
    existing.lastInputAt = Date.now();
    existing.lastMovedAt = 0;
    existing.activePairId = null;
    existing.input = { ...DEFAULT_INPUT };
  } else {
    const player: ServerPlayer = {
      id: user.id,
      socketId: socket.id,
      nickname: user.nickname,
      avatarKey: user.avatarKey,
      x,
      y,
      dir,
      status: 'active',
      input: { ...DEFAULT_INPUT },
      lastInputAt: Date.now(),
      lastMovedAt: 0,
      activePairId: null,
      lastPersistedX: x,
      lastPersistedY: y,
      lastPersistedDir: dir,
      lastPersistedAt: 0,
    };
    room.add(player);
  }

  // 4. 응답: 본인에게 현재 룸 상태
  const score = await prisma.score.findUnique({ where: { userId } });
  const self = room.get(userId)!;
  socket.emit('room:join', {
    self: {
      ...toPlayerState(self),
      points: score?.points ?? 0,
      currentStreak: score?.currentStreak ?? 0,
      bestStreak: score?.bestStreak ?? 0,
    },
    players: room.toPlayerStates(),
    mapId: room.mapId,
  });

  // 5. 다른 사용자에게 입장 알림
  socket.broadcast.emit('room:player:joined', { player: toPlayerState(self) });

  // 6. 채팅 히스토리 (전체 채팅 최근 50개)
  fetchHistory()
    .then((messages) => {
      if (messages.length > 0) socket.emit('chat:history', { messages });
    })
    .catch(() => {
      /* logged in fetchHistory */
    });

  // 7. 채팅 핸들러 등록
  registerChatHandlers(io, socket, userId);

  // 8. 퀴즈 핸들러 등록 + 초기 리더보드 송신
  registerQuizHandlers(io, socket, userId);
  broadcastLeaderboard(io).catch(() => {
    /* logged */
  });

  // ===== 입력 이벤트 =====
  let lastInputProcessedAt = 0;
  socket.on('player:input', (payload) => {
    const now = Date.now();
    if (now - lastInputProcessedAt < INPUT_RATE_LIMIT_MS) return;
    lastInputProcessedAt = now;

    if (!payload || !VALID_DIRS.includes(payload.dir as (typeof VALID_DIRS)[number])) return;
    const p = room.get(userId);
    if (!p) return;

    p.lastInputAt = now;
    if (p.status !== 'active') p.status = 'active';

    if (payload.dir === 'stop') {
      p.input = { ...DEFAULT_INPUT };
    } else {
      // 한 번에 한 방향만 (게더타운 스타일)
      p.input = { ...DEFAULT_INPUT, [payload.dir]: true };
      p.dir = payload.dir;
    }
  });

  // ===== 연결 종료 =====
  socket.on('disconnect', async (reason) => {
    log.info({ socketId: socket.id, userId, reason }, 'socket disconnected');
    const p = room.get(userId);
    if (!p) return;

    // 같은 user의 신규 소켓이 이미 자리 차지했으면 무시
    if (p.socketId !== socket.id) return;

    p.socketId = null;
    p.status = 'disconnected';
    p.input = { ...DEFAULT_INPUT };
    // 자리는 유지 (캐릭터 영속 정책)

    await persistPositionIfStale(p, { force: true });
    // 잠든 상태와 같은 시각 표현을 위해 broadcast (status 변화 + 정지)
  });
}
