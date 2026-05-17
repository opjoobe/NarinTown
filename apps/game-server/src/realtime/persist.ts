import { POSITION_DEBOUNCE_MS } from '@narintown/shared/constants';
import { prisma } from '../infra/prisma.js';
import type { ServerPlayer } from '../domain/room.js';

/**
 * LastPosition 디바운스 저장.
 * - 5초마다 한 번씩 변동 있으면 저장
 * - force=true는 연결 종료 등 즉시 flush
 */
export async function persistPositionIfStale(
  p: ServerPlayer,
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  const now = Date.now();
  const changed =
    Math.round(p.x) !== p.lastPersistedX ||
    Math.round(p.y) !== p.lastPersistedY ||
    p.dir !== p.lastPersistedDir;
  const stale = now - p.lastPersistedAt > POSITION_DEBOUNCE_MS;
  if (!force && (!changed || !stale)) return;

  const x = Math.round(p.x);
  const y = Math.round(p.y);
  try {
    await prisma.lastPosition.upsert({
      where: { userId: p.id },
      create: { userId: p.id, x, y, dir: p.dir },
      update: { x, y, dir: p.dir },
    });
    p.lastPersistedX = x;
    p.lastPersistedY = y;
    p.lastPersistedDir = p.dir;
    p.lastPersistedAt = now;
  } catch (err) {
    // 일시 실패는 다음 tick에 재시도되므로 로그만
    console.error('[persist] LastPosition save failed', { userId: p.id, err });
  }
}
