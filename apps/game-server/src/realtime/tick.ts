import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@narintown/shared/events';
import {
  AOI_RADIUS_PX,
  PLAYER_SPEED_PX_S,
  TICK_INTERVAL_MS,
} from '@narintown/shared/constants';
import { room, toTickState } from '../domain/room.js';
import { clampToMap } from '../domain/map.js';
import { persistPositionIfStale } from './persist.js';
import { scanForPairs } from './quiz.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export function startTickLoop(io: IO): void {
  let lastT = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastT) / 1000;
    lastT = now;

    // 1. 위치 갱신
    for (const p of room.values()) {
      if (p.status !== 'active') continue;
      let dx = 0;
      let dy = 0;
      if (p.input.up) dy -= 1;
      if (p.input.down) dy += 1;
      if (p.input.left) dx -= 1;
      if (p.input.right) dx += 1;
      if (dx === 0 && dy === 0) continue;

      const speed = PLAYER_SPEED_PX_S * dt;
      const nx = p.x + dx * speed;
      const ny = p.y + dy * speed;
      const { x, y } = clampToMap(nx, ny);
      if (Math.round(x) !== Math.round(p.x) || Math.round(y) !== Math.round(p.y)) {
        p.lastMovedAt = now;
      }
      p.x = x;
      p.y = y;
    }

    // 1.5. 페어 매칭 스캔 (proximity)
    scanForPairs(io).catch((err) => console.error('[tick] scanForPairs', err));

    // 2. AOI 브로드캐스트: 각 active 소켓에 시야 내 player만
    const allPlayers = Array.from(room.values());
    for (const viewer of allPlayers) {
      if (!viewer.socketId) continue;
      const sock = io.sockets.sockets.get(viewer.socketId);
      if (!sock) continue;
      const visible = allPlayers
        .filter(
          (p) =>
            Math.abs(p.x - viewer.x) <= AOI_RADIUS_PX &&
            Math.abs(p.y - viewer.y) <= AOI_RADIUS_PX,
        )
        .map(toTickState);
      sock.emit('state:tick', { players: visible, t: now });
    }

    // 3. 위치 디바운스 저장 (5초마다)
    for (const p of room.values()) {
      persistPositionIfStale(p).catch(() => {
        /* 로그는 persist 내부에서 */
      });
    }
  }, TICK_INTERVAL_MS);
}
