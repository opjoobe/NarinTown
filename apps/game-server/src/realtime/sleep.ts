import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@narintown/shared/events';
import { SLEEP_TIMEOUT_MS } from '@narintown/shared/constants';
import { room } from '../domain/room.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

/** active 사용자가 5분 무입력이면 sleeping으로 전환. 1초 주기 폴링 */
export function startSleepWatcher(_io: IO): void {
  setInterval(() => {
    const now = Date.now();
    for (const p of room.values()) {
      if (p.status !== 'active') continue;
      if (now - p.lastInputAt > SLEEP_TIMEOUT_MS) {
        p.status = 'sleeping';
        p.input = { up: false, down: false, left: false, right: false };
        // 다음 tick에서 자연스레 새 status가 브로드캐스트됨
      }
    }
  }, 1000);
}
