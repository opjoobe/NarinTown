import type { FastifyInstance } from 'fastify';
import { prisma } from '../infra/prisma.js';
import { requireAdmin } from '../infra/auth.js';
import { room } from '../domain/room.js';
import { randomToken } from '../infra/session.js';

const INVITE_CODE_PREFIX = 'NARIN-';

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  // ===== GET /admin/online =====
  app.get('/admin/online', { preHandler: requireAdmin }, async (_req, reply) => {
    const players = Array.from(room.values(), (p) => ({
      userId: p.id,
      nickname: p.nickname,
      avatarKey: p.avatarKey,
      status: p.status,
      x: Math.round(p.x),
      y: Math.round(p.y),
      lastInputAgoSec: Math.round((Date.now() - p.lastInputAt) / 1000),
    }));
    return reply.send({ count: players.length, players });
  });

  // ===== GET /admin/invite-codes =====
  app.get('/admin/invite-codes', { preHandler: requireAdmin }, async (_req, reply) => {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const usedBy = codes.filter((c) => c.usedBy).map((c) => c.usedBy!) as string[];
    const users = usedBy.length
      ? await prisma.user.findMany({
          where: { id: { in: usedBy } },
          select: { id: true, nickname: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    return reply.send({
      codes: codes.map((c) => {
        const owner = c.usedBy ? userMap.get(c.usedBy) : null;
        return {
          code: c.code,
          createdAt: c.createdAt.toISOString(),
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          usedBy: c.usedBy ?? null,
          usedByNickname: owner?.nickname ?? null,
          usedByEmail: owner?.email ?? null,
        };
      }),
    });
  });

  // ===== POST /admin/invite-codes =====
  app.post<{ Body: { code?: string; expiresInDays?: number } }>(
    '/admin/invite-codes',
    {
      preHandler: requireAdmin,
      schema: {
        body: {
          type: 'object',
          properties: {
            code: { type: 'string', maxLength: 64 },
            expiresInDays: { type: 'number', minimum: 1, maximum: 365 },
          },
        },
      },
    },
    async (req, reply) => {
      const code = (req.body?.code?.trim() || `${INVITE_CODE_PREFIX}${randomToken(4).toUpperCase()}`).toUpperCase();
      const expiresInDays = req.body?.expiresInDays ?? 30;
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

      try {
        const created = await prisma.inviteCode.create({
          data: { code, expiresAt, createdBy: req.userId ?? null },
        });
        return reply.send({ code: created.code, expiresAt: created.expiresAt?.toISOString() });
      } catch {
        return reply.code(409).send({ error: 'code_already_exists' });
      }
    },
  );

  // ===== POST /admin/invite-codes/:code/expire =====
  app.post<{ Params: { code: string } }>(
    '/admin/invite-codes/:code/expire',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        await prisma.inviteCode.update({
          where: { code: req.params.code },
          data: { expiresAt: new Date() }, // 지금 시각으로 즉시 만료
        });
        return reply.send({ ok: true });
      } catch {
        return reply.code(404).send({ error: 'not_found' });
      }
    },
  );

  // ===== GET /admin/allowed-emails =====
  app.get('/admin/allowed-emails', { preHandler: requireAdmin }, async (_req, reply) => {
    const emails = await prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ emails });
  });

  // ===== POST /admin/allowed-emails =====
  app.post<{ Body: { email: string } }>(
    '/admin/allowed-emails',
    {
      preHandler: requireAdmin,
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', minLength: 3, maxLength: 320 } },
        },
      },
    },
    async (req, reply) => {
      const email = req.body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.code(400).send({ error: 'invalid_email' });
      }
      try {
        await prisma.allowedEmail.create({
          data: { email, createdBy: req.userId ?? null },
        });
        return reply.send({ ok: true, email });
      } catch {
        return reply.code(409).send({ error: 'already_exists' });
      }
    },
  );

  // ===== DELETE /admin/allowed-emails/:email =====
  app.delete<{ Params: { email: string } }>(
    '/admin/allowed-emails/:email',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        await prisma.allowedEmail.delete({
          where: { email: req.params.email.toLowerCase() },
        });
        return reply.send({ ok: true });
      } catch {
        return reply.code(404).send({ error: 'not_found' });
      }
    },
  );

  // ===== GET /admin/stats =====
  app.get('/admin/stats', { preHandler: requireAdmin }, async (_req, reply) => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [userCount, attemptCount, correctCount, recent24h, codeStats] = await Promise.all([
      prisma.user.count(),
      prisma.attempt.count(),
      prisma.attempt.count({ where: { isCorrect: true } }),
      prisma.attempt.count({ where: { attemptedAt: { gte: since24h } } }),
      prisma.inviteCode.findMany({ select: { usedBy: true } }),
    ]);
    const usedCodes = codeStats.filter((c) => c.usedBy).length;
    const accuracy = attemptCount === 0 ? 0 : Math.round((correctCount / attemptCount) * 100);
    return reply.send({
      userCount,
      attemptCount,
      correctCount,
      accuracy,
      recentAttempts24h: recent24h,
      onlineCount: room.values ? Array.from(room.values()).length : 0,
      inviteCodes: {
        total: codeStats.length,
        used: usedCodes,
        free: codeStats.length - usedCodes,
      },
    });
  });
}
