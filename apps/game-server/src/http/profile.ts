import type { FastifyInstance } from 'fastify';
import { prisma } from '../infra/prisma.js';
import { requireAuth } from '../infra/auth.js';

const NICKNAME_RE = /^[가-힣A-Za-z0-9_]{2,16}$/;
const RESERVED_AVATAR_PREFIXES = ['layered:', 'preset:'];

function isValidAvatarKey(key: string): boolean {
  return RESERVED_AVATAR_PREFIXES.some((p) => key.startsWith(p));
}

export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  // ===== GET /me =====
  app.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, quiz: true, score: true, admin: true },
    });
    if (!user) return reply.code(404).send({ error: 'user_not_found' });

    const isOnboarded =
      !!user.profile && !!user.quiz && user.avatarKey !== 'pending';

    return reply.send({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarKey: user.avatarKey,
      isOnboarded,
      isAdmin: !!user.admin,
      profile: user.profile,
      quiz: user.quiz
        ? { question: user.quiz.question } // 정답은 응답에 노출하지 않음
        : null,
      score: user.score ?? { points: 0, correctCount: 0, currentStreak: 0, bestStreak: 0 },
    });
  });

  // ===== POST /onboarding =====
  app.post<{
    Body: {
      nickname: string;
      avatarKey: string;
      skills: string[];
      bio?: string;
      quizQuestion: string;
      quizAnswer: boolean;
    };
  }>(
    '/onboarding',
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          required: ['nickname', 'avatarKey', 'skills', 'quizQuestion', 'quizAnswer'],
          properties: {
            nickname: { type: 'string', minLength: 2, maxLength: 16 },
            avatarKey: { type: 'string', minLength: 1, maxLength: 128 },
            skills: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 24 }, maxItems: 10 },
            bio: { type: 'string', maxLength: 200 },
            quizQuestion: { type: 'string', minLength: 4, maxLength: 200 },
            quizAnswer: { type: 'boolean' },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = req.userId!;
      const { nickname, avatarKey, skills, bio, quizQuestion, quizAnswer } = req.body;

      if (!NICKNAME_RE.test(nickname)) {
        return reply.code(400).send({ error: 'invalid_nickname' });
      }
      if (!isValidAvatarKey(avatarKey)) {
        return reply.code(400).send({ error: 'invalid_avatar_key' });
      }

      try {
        await prisma.$transaction(async (tx) => {
          const existingByNick = await tx.user.findUnique({ where: { nickname } });
          if (existingByNick && existingByNick.id !== userId) {
            throw new Error('NICKNAME_TAKEN');
          }

          await tx.user.update({
            where: { id: userId },
            data: { nickname, avatarKey },
          });
          await tx.profile.upsert({
            where: { userId },
            create: { userId, skills, bio: bio ?? null },
            update: { skills, bio: bio ?? null },
          });
          await tx.quiz.upsert({
            where: { userId },
            create: { userId, question: quizQuestion, answer: quizAnswer },
            update: { question: quizQuestion, answer: quizAnswer },
          });
          await tx.score.upsert({
            where: { userId },
            create: { userId },
            update: {},
          });
        });
      } catch (e) {
        if ((e as Error).message === 'NICKNAME_TAKEN') {
          return reply.code(409).send({ error: 'nickname_taken' });
        }
        throw e;
      }

      return reply.send({ ok: true });
    },
  );

  // ===== GET /me/attempts =====
  app.get('/me/attempts', { preHandler: requireAuth }, async (req, reply) => {
    const userId = req.userId!;
    const attempts = await prisma.attempt.findMany({
      where: { challengerId: userId },
      orderBy: { attemptedAt: 'desc' },
      take: 50,
      include: { target: { select: { nickname: true } } },
    });
    return reply.send({
      attempts: attempts.map((a) => ({
        id: a.id,
        targetNickname: a.target.nickname,
        // 정답/오답/기권만 노출, 실제 O/X 응답값은 비공개
        result: a.forfeited ? 'forfeited' : a.isCorrect ? 'correct' : 'wrong',
        pointsDelta: a.pointsDelta,
        attemptedAt: a.attemptedAt.toISOString(),
      })),
    });
  });

  // ===== GET /leaderboard =====
  app.get('/leaderboard', async (_req, reply) => {
    const top = await prisma.score.findMany({
      orderBy: [
        { points: 'desc' },
        { correctCount: 'desc' },
        { bestStreak: 'desc' },
      ],
      take: 5,
      include: { user: { select: { nickname: true, avatarKey: true } } },
    });
    return reply.send({
      top: top.map((s, i) => ({
        rank: i + 1,
        userId: s.userId,
        nickname: s.user.nickname,
        avatarKey: s.user.avatarKey,
        points: s.points,
      })),
    });
  });
}
