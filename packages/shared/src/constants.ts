export const TICK_RATE_HZ = 20;
export const TICK_INTERVAL_MS = 1000 / TICK_RATE_HZ; // 50ms

export const QUIZ_TIME_LIMIT_SECONDS = 15;
export const QUIZ_PAIR_COOLDOWN_MS = 5000;

export const SLEEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const POSITION_DEBOUNCE_MS = 5000;

export const AOI_RADIUS_PX = 520; // 화면 800px 가정 × 1.3

export const SCORE_CORRECT = 10;
export const COMBO_BONUSES: Record<number, number> = {
  2: 5,
  3: 10,
};
export const COMBO_BONUS_MAX = 15; // 4연속 이상

export const LEADERBOARD_TOP_N = 5;

export const TILE_SIZE = 32;
export const MAP_WIDTH_TILES = 40;
export const MAP_HEIGHT_TILES = 30;
export const MAP_WIDTH_PX = MAP_WIDTH_TILES * TILE_SIZE; // 1280
export const MAP_HEIGHT_PX = MAP_HEIGHT_TILES * TILE_SIZE; // 960

export const PLAYER_SPEED_PX_S = 130;
export const PLAYER_SIZE_PX = 28; // 캐릭터 히트박스/렌더 사이즈
export const PROXIMITY_DISTANCE_TILES = 2; // 2타일 이내면 페어링 후보 (캐릭터 사이즈 포함)
export const PROXIMITY_DISTANCE_PX = PROXIMITY_DISTANCE_TILES * TILE_SIZE + PLAYER_SIZE_PX;

export const DEFAULT_MAP_ID = 'office-1784';
