import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../infra/prisma.js';
import { randomToken, signSession } from '../infra/session.js';
import { sendMagicLink } from '../infra/mail.js';
import { requireAuth } from '../infra/auth.js';

const MAGIC_LINK_TTL_MIN = Number(process.env.MAGIC_LINK_TTL_MINUTES ?? 15);
const INVITE_REQUIRED = (process.env.INVITE_CODE_REQUIRED ?? 'true') === 'true';
const WEB_ORIGIN = process.env.GAME_SERVER_ORIGIN ?? 'http://localhost:3000';
const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? 'navercorp.com').toLowerCase();
const BCRYPT_ROUNDS = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 이메일 정합성·도메인·화이트리스트 검증.
 * 통과 시 null, 실패 시 error code 반환.
 */
async function validateEmailAccess(email: string): Promise<string | null> {
  if (!EMAIL_RE.test(email)) return 'invalid_email';
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (domain !== ALLOWED_DOMAIN) return 'email_domain_not_allowed';
  const allowed = await prisma.allowedEmail.findUnique({ where: { email } });
  if (!allowed) return 'email_not_in_whitelist';
  return null;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // ===== POST /auth/magic-link/request =====
  app.post<{
    Body: { email: string; inviteCode?: string };
  }>(
    '/auth/magic-link/request',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', minLength: 3, maxLength: 320 },
            inviteCode: { type: 'string', maxLength: 64 },
          },
        },
      },
    },
    async (req, reply) => {
      const { email: rawEmail, inviteCode } = req.body;
      const email = rawEmail.trim().toLowerCase();

      const accessErr = await validateEmailAccess(email);
      if (accessErr) return reply.code(400).send({ error: accessErr });

      if (INVITE_REQUIRED) {
        const trimmed = inviteCode?.trim();
        if (!trimmed) {
          return reply.code(400).send({ error: 'invite_code_required' });
        }
        const code = await prisma.inviteCode.findUnique({ where: { code: trimmed } });
        const now = new Date();
        if (!code) {
          return reply.code(400).send({ error: 'invalid_invite_code' });
        }
        if (code.expiresAt && code.expiresAt < now) {
          return reply.code(400).send({ error: 'invite_code_expired' });
        }
        // 이미 사용된 코드라면, 같은 이메일 소유자가 재사용하는 경우만 허용
        if (code.usedBy) {
          const owner = await prisma.user.findUnique({ where: { id: code.usedBy } });
          if (!owner || owner.email !== email) {
            return reply.code(400).send({ error: 'invite_code_exhausted' });
          }
        }
      }

      const token = randomToken();
      const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60 * 1000);
      await prisma.magicLink.create({
        data: {
          token,
          email,
          inviteCode: inviteCode?.trim() ?? null,
          expiresAt,
        },
      });

      const link = `${WEB_ORIGIN}/auth/verify?token=${token}`;
      await sendMagicLink(email, link);
      req.log.info({ email }, 'magic link sent');

      return reply.send({ ok: true });
    },
  );

  // ===== GET /auth/magic-link/verify =====
  app.get<{ Querystring: { token?: string } }>(
    '/auth/magic-link/verify',
    async (req, reply) => {
      const token = req.query.token?.trim();
      if (!token) return reply.code(400).send({ error: 'token_required' });

      const result = await prisma.$transaction(async (tx) => {
        const link = await tx.magicLink.findUnique({ where: { token } });
        if (!link) return { error: 'invalid_token' as const };
        if (link.consumedAt) return { error: 'token_already_used' as const };
        if (link.expiresAt < new Date()) return { error: 'token_expired' as const };

        // 화이트리스트 재검증 (운영 중 제거 가능)
        const allowed = await tx.allowedEmail.findUnique({ where: { email: link.email } });
        if (!allowed) return { error: 'email_not_in_whitelist' as const };

        await tx.magicLink.update({
          where: { token },
          data: { consumedAt: new Date() },
        });

        // 초대코드 유효성 재검증 (마킹은 user 확인 후 아래에서)
        if (link.inviteCode) {
          const code = await tx.inviteCode.findUnique({ where: { code: link.inviteCode } });
          if (!code) return { error: 'invalid_invite_code' as const };
          if (code.expiresAt && code.expiresAt < new Date())
            return { error: 'invite_code_expired' as const };
          if (code.usedBy) {
            const owner = await tx.user.findUnique({ where: { id: code.usedBy } });
            if (!owner || owner.email !== link.email) {
              return { error: 'invite_code_exhausted' as const };
            }
          }
        }

        // User upsert
        let user = await tx.user.findUnique({ where: { email: link.email } });
        if (!user) {
          // 닉네임은 온보딩 단계에서 정함. 일단 임시값으로 고유성 충족
          const tempNickname = `user_${randomToken(6)}`;
          user = await tx.user.create({
            data: {
              email: link.email,
              nickname: tempNickname,
              avatarKey: 'pending',
            },
          });
        }

        // 초대코드 마킹 (신규 유저인 경우만 — 재로그인 시엔 사용 X)
        if (link.inviteCode) {
          const code = await tx.inviteCode.findUnique({ where: { code: link.inviteCode } });
          if (code && !code.usedBy) {
            await tx.inviteCode.update({
              where: { code: link.inviteCode },
              data: { usedBy: user.id },
            });
          }
        }

        // 온보딩 완료 여부 = profile + quiz가 모두 있고 avatarKey가 pending 아님
        const profile = await tx.profile.findUnique({ where: { userId: user.id } });
        const quiz = await tx.quiz.findUnique({ where: { userId: user.id } });
        const isOnboarded = !!profile && !!quiz && user.avatarKey !== 'pending';

        return { user, isOnboarded };
      });

      if ('error' in result) {
        return reply.code(400).send({ error: result.error });
      }

      const sessionToken = signSession(result.user.id);
      return reply.send({
        sessionToken,
        isOnboarded: result.isOnboarded,
        nickname: result.user.nickname,
      });
    },
  );

  // ===== POST /auth/password/set =====
  // 인증된 사용자가 본인 비밀번호 설정/변경
  app.post<{ Body: { password: string } }>(
    '/auth/password/set',
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
      },
    },
    async (req, reply) => {
      const { password } = req.body;
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await prisma.user.update({
        where: { id: req.userId! },
        data: { passwordHash },
      });
      return reply.send({ ok: true });
    },
  );

  // ===== POST /auth/password/login =====
  // 이메일 + 비밀번호로 로그인 (인증 불필요)
  app.post<{ Body: { email: string; password: string } }>(
    '/auth/password/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', minLength: 3, maxLength: 320 },
            password: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (req, reply) => {
      const email = req.body.email.trim().toLowerCase();

      const accessErr = await validateEmailAccess(email);
      if (accessErr) return reply.code(400).send({ error: accessErr });

      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true, quiz: true },
      });
      if (!user || !user.passwordHash) {
        return reply.code(401).send({ error: 'invalid_credentials' });
      }
      const ok = await bcrypt.compare(req.body.password, user.passwordHash);
      if (!ok) return reply.code(401).send({ error: 'invalid_credentials' });

      const isOnboarded = !!user.profile && !!user.quiz && user.avatarKey !== 'pending';
      const sessionToken = signSession(user.id);
      return reply.send({ sessionToken, isOnboarded, nickname: user.nickname });
    },
  );

  // ===== POST /auth/logout =====
  app.post('/auth/logout', async (_req, reply) => {
    // 서버 측엔 상태 없음 (signed cookie 무효화는 클라가 쿠키 삭제)
    return reply.send({ ok: true });
  });
}
