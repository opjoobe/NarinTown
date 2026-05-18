import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET;
if (!SECRET || SECRET.length < 16) {
  throw new Error('SESSION_SECRET must be at least 16 chars. Check .env');
}

const SEP = '.';

export function signSession(userId: string): string {
  const hmac = createHmac('sha256', SECRET!).update(userId).digest('base64url');
  return `${userId}${SEP}${hmac}`;
}

export function verifySession(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(SEP);
  if (idx < 0) return null;
  const userId = signed.slice(0, idx);
  const provided = signed.slice(idx + 1);
  const expected = createHmac('sha256', SECRET!).update(userId).digest('base64url');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try {
    return timingSafeEqual(a, b) ? userId : null;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}
