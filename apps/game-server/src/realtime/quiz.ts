import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@narintown/shared/events';
import type { QuizResult } from '@narintown/shared/types';
import {
  COMBO_BONUS_MAX,
  COMBO_BONUSES,
  LEADERBOARD_TOP_N,
  PROXIMITY_DISTANCE_PX,
  QUIZ_PAIR_COOLDOWN_MS,
  QUIZ_TIME_LIMIT_SECONDS,
  SCORE_CORRECT,
} from '@narintown/shared/constants';
import { prisma } from '../infra/prisma.js';
import { room, type ServerPlayer } from '../domain/room.js';
import { randomToken } from '../infra/session.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ============================================================================
// 페어 락 + 쿨다운 상태
// ============================================================================

interface PairSession {
  id: string;
  user1Id: string;
  user2Id: string;
  initiator1: boolean; // user1이 initiator인지
  initiator2: boolean; // user2가 initiator인지
  question1: string; // user1의 퀴즈 (user2가 풀게 됨)
  answer1: boolean;
  question2: string;
  answer2: boolean;
  startedAt: number;
  expiresAt: number;
  answers: Map<string, boolean>; // userId -> guess
  // 이미 도전 기록이 있는 사용자 — 이 페어에선 prompt/resolve 양쪽 모두 skip
  skipUserIds: Set<string>;
  timer: NodeJS.Timeout;
}

const activePairs = new Map<string, PairSession>(); // pairId -> session
const cooldowns = new Map<string, number>(); // pairKey -> expiresAt
const recordedAttempts = new Set<string>(); // "challenger->target" 캐시 (DB 부담 줄임)

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function attemptKey(challenger: string, target: string): string {
  return `${challenger}->${target}`;
}

// ============================================================================
// 초기 로드: 이미 시도한 페어 캐시 채우기 (서버 재시작 후)
// ============================================================================

let attemptsLoaded = false;
async function ensureAttemptsLoaded(): Promise<void> {
  if (attemptsLoaded) return;
  attemptsLoaded = true;
  try {
    const all = await prisma.attempt.findMany({ select: { challengerId: true, targetId: true } });
    for (const a of all) recordedAttempts.add(attemptKey(a.challengerId, a.targetId));
  } catch (err) {
    console.error('[quiz] failed to load attempts', err);
    attemptsLoaded = false;
  }
}

// ============================================================================
// 페어 트리거: tick 루프에서 호출
// ============================================================================

export async function scanForPairs(io: IO): Promise<void> {
  await ensureAttemptsLoaded();
  const players = Array.from(room.values());
  const now = Date.now();

  for (let i = 0; i < players.length; i++) {
    const a = players[i]!;
    if (a.activePairId) continue;
    for (let j = i + 1; j < players.length; j++) {
      const b = players[j]!;
      if (b.activePairId) continue;
      if (Math.abs(a.x - b.x) > PROXIMITY_DISTANCE_PX) continue;
      if (Math.abs(a.y - b.y) > PROXIMITY_DISTANCE_PX) continue;

      const cdKey = pairKey(a.id, b.id);
      const cdExp = cooldowns.get(cdKey);
      if (cdExp && cdExp > now) continue;
      if (cdExp && cdExp <= now) cooldowns.delete(cdKey);

      // 이미 양방향 도전 모두 기록되었으면 매칭 자체 스킵
      const aDone = recordedAttempts.has(attemptKey(a.id, b.id));
      const bDone = recordedAttempts.has(attemptKey(b.id, a.id));
      if (aDone && bDone) continue;

      // 한쪽이라도 sleeping/disconnected이면 매칭 제외 (깨어나면 자연스레 다음 tick에서 매칭)
      if (a.status !== 'active' || b.status !== 'active') continue;

      try {
        await createPair(io, a, b, aDone, bDone);
      } catch (err) {
        console.error('[quiz] createPair failed', err);
      }
    }
  }
}

async function createPair(
  io: IO,
  a: ServerPlayer,
  b: ServerPlayer,
  aDone: boolean,
  bDone: boolean,
): Promise<void> {
  // DB에서 두 사용자의 퀴즈 fetch
  const quizzes = await prisma.quiz.findMany({
    where: { userId: { in: [a.id, b.id] } },
  });
  const qa = quizzes.find((q) => q.userId === a.id);
  const qb = quizzes.find((q) => q.userId === b.id);
  if (!qa || !qb) return; // 둘 중 하나 퀴즈가 없으면 매칭 불가

  // initiator 판정: 더 최근에 움직인 쪽. 동시면 둘 다 initiator
  const tieMs = 100; // ±100ms 내면 동시로 간주
  const diff = a.lastMovedAt - b.lastMovedAt;
  const aIsInit = diff >= -tieMs;
  const bIsInit = diff <= tieMs;

  const skipUserIds = new Set<string>();
  if (aDone) skipUserIds.add(a.id);
  if (bDone) skipUserIds.add(b.id);

  const pairId = randomToken(8);
  const now = Date.now();
  const expiresAt = now + QUIZ_TIME_LIMIT_SECONDS * 1000;

  const session: PairSession = {
    id: pairId,
    user1Id: a.id,
    user2Id: b.id,
    initiator1: aIsInit,
    initiator2: bIsInit,
    question1: qa.question,
    answer1: qa.answer,
    question2: qb.question,
    answer2: qb.answer,
    startedAt: now,
    expiresAt,
    answers: new Map(),
    skipUserIds,
    timer: setTimeout(() => {
      resolveTimeout(io, pairId).catch((err) => console.error('[quiz] timeout resolve failed', err));
    }, QUIZ_TIME_LIMIT_SECONDS * 1000),
  };
  activePairs.set(pairId, session);
  a.activePairId = pairId;
  b.activePairId = pairId;

  // 이미 도전 완료한 사용자에겐 prompt 보내지 않음 (한쪽만 도전 가능)
  if (a.socketId && !aDone) {
    io.to(a.socketId).emit('quiz:prompt', {
      pairId,
      partnerId: b.id,
      partnerNickname: b.nickname,
      question: qb.question,
      timeLimit: QUIZ_TIME_LIMIT_SECONDS,
    });
  }
  if (b.socketId && !bDone) {
    io.to(b.socketId).emit('quiz:prompt', {
      pairId,
      partnerId: a.id,
      partnerNickname: a.nickname,
      question: qa.question,
      timeLimit: QUIZ_TIME_LIMIT_SECONDS,
    });
  }
}

// ============================================================================
// 응답 수신
// ============================================================================

export function registerQuizHandlers(io: IO, socket: ClientSocket, userId: string): void {
  socket.on('quiz:answer', async (payload) => {
    if (!payload || typeof payload.guess !== 'boolean') return;
    const pair = activePairs.get(payload.pairId);
    if (!pair) return;
    if (pair.user1Id !== userId && pair.user2Id !== userId) return;
    if (pair.skipUserIds.has(userId)) return;
    if (pair.answers.has(userId)) return;

    pair.answers.set(userId, payload.guess);

    // 즉시 본인 결과 계산 + emit (상대를 기다리지 않음)
    try {
      await processSingleAnswer(io, pair, userId, payload.guess);
    } catch (err) {
      console.error('[quiz] processSingleAnswer failed', err);
    }

    // 참가자 전원이 처리됐으면 페어 마무리 (cooldown 등)
    const participants = 2 - pair.skipUserIds.size;
    if (pair.answers.size >= participants) {
      clearTimeout(pair.timer);
      finalizePair(io, pair.id);
    }
  });
}

// ============================================================================
// Resolve
// ============================================================================

function computeCombo(isCorrect: boolean, oldStreak: number): { delta: number; newStreak: number } {
  if (!isCorrect) return { delta: 0, newStreak: 0 };
  const newStreak = oldStreak + 1;
  let bonus = 0;
  if (newStreak === 2) bonus = COMBO_BONUSES[2] ?? 0;
  else if (newStreak === 3) bonus = COMBO_BONUSES[3] ?? 0;
  else if (newStreak >= 4) bonus = COMBO_BONUS_MAX;
  return { delta: SCORE_CORRECT + bonus, newStreak };
}

/**
 * 한 사용자의 응답을 즉시 처리: outcome 계산 + DB 기록 + emit.
 * 상대를 기다리지 않음.
 */
async function processSingleAnswer(
  io: IO,
  pair: PairSession,
  userId: string,
  guess: boolean,
): Promise<void> {
  const me = room.get(userId);
  if (!me) return;
  const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
  const targetAnswer = pair.user1Id === userId ? pair.answer2 : pair.answer1;
  if (recordedAttempts.has(attemptKey(userId, partnerId))) return;

  const isCorrect = guess === targetAnswer;
  const existing = await prisma.score.findUnique({ where: { userId } });
  const oldStreak = existing?.currentStreak ?? 0;
  const oldBest = existing?.bestStreak ?? 0;
  const { delta, newStreak } = computeCombo(isCorrect, oldStreak);
  const newBest = Math.max(oldBest, newStreak);

  const updated = await prisma.score.upsert({
    where: { userId },
    create: {
      userId,
      points: delta,
      correctCount: isCorrect ? 1 : 0,
      currentStreak: newStreak,
      bestStreak: newBest,
    },
    update: {
      points: { increment: delta },
      correctCount: isCorrect ? { increment: 1 } : undefined,
      currentStreak: newStreak,
      bestStreak: newBest,
    },
  });

  try {
    await prisma.attempt.create({
      data: {
        challengerId: userId,
        targetId: partnerId,
        guess,
        isCorrect,
        forfeited: false,
        pointsDelta: delta,
      },
    });
    recordedAttempts.add(attemptKey(userId, partnerId));
  } catch {
    /* race, ignore */
  }

  const result: QuizResult = isCorrect ? 'correct' : 'wrong';
  if (me.socketId) {
    io.to(me.socketId).emit('quiz:resolve', {
      pairId: pair.id,
      result,
      pointsDelta: delta,
      points: updated.points,
      currentStreak: newStreak,
    });
  }
  io.emit('score:update', {
    userId,
    points: updated.points,
    currentStreak: newStreak,
    bestStreak: updated.bestStreak,
  });
  await broadcastLeaderboard(io);
}

/**
 * 15초 timeout 도래 시 미응답자만 처리.
 */
async function resolveTimeout(io: IO, pairId: string): Promise<void> {
  const pair = activePairs.get(pairId);
  if (!pair) return;

  const ctx = [
    { id: pair.user1Id, isInitiator: pair.initiator1 },
    { id: pair.user2Id, isInitiator: pair.initiator2 },
  ];

  for (const c of ctx) {
    if (pair.skipUserIds.has(c.id)) continue;
    if (pair.answers.has(c.id)) continue; // 응답자는 processSingleAnswer로 이미 처리됨

    const me = room.get(c.id);
    if (!me) continue;
    const partnerId = pair.user1Id === c.id ? pair.user2Id : pair.user1Id;
    if (recordedAttempts.has(attemptKey(c.id, partnerId))) continue;

    const isActive = me.status === 'active';
    if (!c.isInitiator && !isActive) continue; // sleeping/disconnected non-initiator → 기회 유지

    // 기권 처리
    const existing = await prisma.score.findUnique({ where: { userId: c.id } });
    const oldBest = existing?.bestStreak ?? 0;
    const updated = await prisma.score.upsert({
      where: { userId: c.id },
      create: { userId: c.id, points: 0, correctCount: 0, currentStreak: 0, bestStreak: oldBest },
      update: { currentStreak: 0 },
    });
    try {
      await prisma.attempt.create({
        data: {
          challengerId: c.id,
          targetId: partnerId,
          guess: null,
          isCorrect: false,
          forfeited: true,
          pointsDelta: 0,
        },
      });
      recordedAttempts.add(attemptKey(c.id, partnerId));
    } catch {
      /* race, ignore */
    }

    if (me.socketId) {
      io.to(me.socketId).emit('quiz:resolve', {
        pairId,
        result: 'forfeited',
        pointsDelta: 0,
        points: updated.points,
        currentStreak: 0,
      });
    }
    io.emit('score:update', {
      userId: c.id,
      points: updated.points,
      currentStreak: 0,
      bestStreak: updated.bestStreak,
    });
  }

  await broadcastLeaderboard(io);
  finalizePair(io, pairId);
}

/**
 * 페어 정리: activePairs에서 제거 + 쿨다운 설정 + activePairId 해제.
 */
function finalizePair(_io: IO, pairId: string): void {
  const pair = activePairs.get(pairId);
  if (!pair) return;
  activePairs.delete(pairId);
  clearTimeout(pair.timer);

  const p1 = room.get(pair.user1Id);
  const p2 = room.get(pair.user2Id);
  if (p1) p1.activePairId = null;
  if (p2) p2.activePairId = null;

  cooldowns.set(pairKey(pair.user1Id, pair.user2Id), Date.now() + QUIZ_PAIR_COOLDOWN_MS);
}

// ============================================================================
// Leaderboard
// ============================================================================

export async function broadcastLeaderboard(io: IO): Promise<void> {
  try {
    const top = await prisma.score.findMany({
      orderBy: [
        { points: 'desc' },
        { correctCount: 'desc' },
        { bestStreak: 'desc' },
      ],
      take: LEADERBOARD_TOP_N,
      include: { user: { select: { nickname: true, avatarKey: true } } },
    });
    io.emit('leaderboard:update', {
      top: top.map((s, i) => ({
        rank: i + 1,
        userId: s.userId,
        nickname: s.user.nickname,
        avatarKey: s.user.avatarKey,
        points: s.points,
      })),
    });
  } catch (err) {
    console.error('[quiz] broadcastLeaderboard failed', err);
  }
}

// ============================================================================
// disconnect 시 cleanup
// ============================================================================

export function abandonPairOnDisconnect(io: IO, userId: string): void {
  // 끊긴 사용자가 attached된 페어 — 상대 입장에선 그대로 응답 기회 유지 (timeout 대기)
  // 별도 처리 없음. 타임아웃이 사용자 일반 흐름과 동일하게 처리.
}
