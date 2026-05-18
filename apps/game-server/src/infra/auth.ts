import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';
import { verifySession } from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

function extractToken(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  // 같은 호스트 환경(로컬)이면 쿠키도 시도
  const c = (req as unknown as { cookies?: Record<string, string> }).cookies;
  return c?.narintown_session ?? null;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = extractToken(req);
  const userId = verifySession(token);
  if (!userId) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
  req.userId = userId;
}

export async function optionalAuth(req: FastifyRequest): Promise<void> {
  const token = extractToken(req);
  const userId = verifySession(token);
  if (userId) req.userId = userId;
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = extractToken(req);
  const userId = verifySession(token);
  if (!userId) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
  const admin = await prisma.adminUser.findUnique({ where: { userId } });
  if (!admin) {
    reply.code(403).send({ error: 'forbidden' });
    return;
  }
  req.userId = userId;
}
