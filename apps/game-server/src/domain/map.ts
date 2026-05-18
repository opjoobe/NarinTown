import {
  MAP_HEIGHT_PX,
  MAP_WIDTH_PX,
  PLAYER_SIZE_PX,
  TILE_SIZE,
} from '@narintown/shared/constants';

const PADDING = TILE_SIZE * 2; // 가장자리 여유

/**
 * Phase 2: 단일 통합 맵, 벽/가구 충돌 없이 경계만.
 * Phase 5에서 Tiled 맵으로 교체.
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const MAP_BOUNDS: BoundingBox = {
  minX: PADDING,
  minY: PADDING,
  maxX: MAP_WIDTH_PX - PADDING - PLAYER_SIZE_PX,
  maxY: MAP_HEIGHT_PX - PADDING - PLAYER_SIZE_PX,
};

/** 맵 전체 범위에서 균일 분포 40개 스폰 후보 (재현 가능한 의사난수) */
function generateSpawnCandidates(): Array<{ x: number; y: number }> {
  const candidates: Array<{ x: number; y: number }> = [];
  const cols = 8;
  const rows = 5;
  const stepX = (MAP_BOUNDS.maxX - MAP_BOUNDS.minX) / (cols - 1);
  const stepY = (MAP_BOUNDS.maxY - MAP_BOUNDS.minY) / (rows - 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 셀마다 약간의 jitter로 정렬 느낌 줄이기
      const jitterX = ((r * cols + c) * 31) % TILE_SIZE;
      const jitterY = ((r * cols + c) * 47) % TILE_SIZE;
      candidates.push({
        x: Math.round(MAP_BOUNDS.minX + stepX * c + jitterX),
        y: Math.round(MAP_BOUNDS.minY + stepY * r + jitterY),
      });
    }
  }
  return candidates;
}

export const SPAWN_CANDIDATES = generateSpawnCandidates();

export function clampToMap(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, x)),
    y: Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, y)),
  };
}

export function pickRandomSpawn(
  occupied: Array<{ x: number; y: number }>,
): { x: number; y: number } {
  const SAFE_DISTANCE = PLAYER_SIZE_PX * 2;
  const free = SPAWN_CANDIDATES.filter((c) =>
    occupied.every((o) => Math.hypot(c.x - o.x, c.y - o.y) > SAFE_DISTANCE),
  );
  const pool = free.length > 0 ? free : SPAWN_CANDIDATES;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick ?? { x: MAP_BOUNDS.minX, y: MAP_BOUNDS.minY };
}
