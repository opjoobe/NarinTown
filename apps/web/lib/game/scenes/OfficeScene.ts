import Phaser from 'phaser';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomJoinPayload,
} from '@narintown/shared/events';
import type { InputDirection, PlayerStatus } from '@narintown/shared/types';
import {
  MAP_WIDTH_PX,
  MAP_HEIGHT_PX,
  TILE_SIZE,
  PLAYER_SIZE_PX,
} from '@narintown/shared/constants';

type IOSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SpriteEntry {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Container;
  bubbleBg: Phaser.GameObjects.Rectangle;
  bubbleText: Phaser.GameObjects.Text;
  bubbleHideAt: number; // 0이면 표시 안 함
  zzz: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  status: PlayerStatus;
}

const BUBBLE_DURATION_MS = 3000;
const BUBBLE_PADDING_X = 6;
const BUBBLE_PADDING_Y = 3;

const COLORS = [0xff7a59, 0x4d96ff, 0x00c73c, 0xfb8c00, 0xb967db, 0xf48fb1];

function colorFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

export class OfficeScene extends Phaser.Scene {
  private socket: IOSocket | null = null;
  private selfId = '';
  private sprites = new Map<string, SpriteEntry>();
  private currentInputDir: InputDirection = 'stop';
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wKey!: Phaser.Input.Keyboard.Key;
  private aKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('OfficeScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#eef0e8');
    this.cameras.main.setBounds(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
    this.drawGrid();

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    const injected = this.registry.get('socket') as IOSocket | undefined;
    if (!injected) {
      console.error('[OfficeScene] socket not injected');
      return;
    }
    this.socket = injected;

    this.socket.on('room:join', (payload: RoomJoinPayload) => {
      this.selfId = payload.self.id;
      this.upsertSprite(
        payload.self.id,
        payload.self.nickname,
        payload.self.x,
        payload.self.y,
        payload.self.status,
      );
      for (const p of payload.players) {
        this.upsertSprite(p.id, p.nickname, p.x, p.y, p.status);
      }
      const selfSprite = this.sprites.get(this.selfId);
      if (selfSprite) {
        this.cameras.main.startFollow(selfSprite.container, false, 0.15, 0.15);
      }
    });

    this.socket.on('room:player:joined', ({ player }) => {
      this.upsertSprite(player.id, player.nickname, player.x, player.y, player.status);
    });

    this.socket.on('room:player:left', ({ playerId }) => {
      const s = this.sprites.get(playerId);
      if (s) {
        s.container.destroy();
        this.sprites.delete(playerId);
      }
    });

    this.socket.on('state:tick', ({ players }) => {
      const seen = new Set<string>();
      for (const p of players) {
        seen.add(p.id);
        const entry = this.sprites.get(p.id);
        if (entry) {
          entry.targetX = p.x;
          entry.targetY = p.y;
          this.applyStatus(entry, p.status);
        }
      }
      // AOI 밖으로 나간 다른 플레이어는 일단 안 보이게 두지 않고 그대로 둠 (마지막 위치 유지)
    });

    this.socket.on('chat:global', ({ from, text }) => {
      this.showBubble(from, text);
    });

    this.socket.on('system:error', (e) => {
      console.error('[system:error]', e);
    });

    // socket은 React가 소유. OfficeScene이 핸들러 등록을 마친 후 connect 시작
    if (!this.socket.connected) this.socket.connect();
  }

  private drawGrid(): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0xdcdcdc, 0.8);
    for (let x = 0; x <= MAP_WIDTH_PX; x += TILE_SIZE) {
      g.lineBetween(x, 0, x, MAP_HEIGHT_PX);
    }
    for (let y = 0; y <= MAP_HEIGHT_PX; y += TILE_SIZE) {
      g.lineBetween(0, y, MAP_WIDTH_PX, y);
    }
    g.lineStyle(3, 0x00c73c, 1).strokeRect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
  }

  private upsertSprite(
    id: string,
    nickname: string,
    x: number,
    y: number,
    status: PlayerStatus,
  ): void {
    let entry = this.sprites.get(id);
    if (!entry) {
      const body = this.add.circle(0, 0, PLAYER_SIZE_PX / 2, colorFor(id));
      body.setStrokeStyle(2, 0xffffff);
      const label = this.add
        .text(0, -(PLAYER_SIZE_PX / 2 + 4), nickname, {
          fontSize: '12px',
          color: '#1a1a1a',
          backgroundColor: '#ffffffcc',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1);

      // 말풍선 (초기엔 숨김)
      const bubbleBg = this.add.rectangle(0, 0, 40, 18, 0xffffff, 1).setStrokeStyle(1, 0xbfbfbf);
      const bubbleText = this.add
        .text(0, 0, '', { fontSize: '11px', color: '#1a1a1a' })
        .setOrigin(0.5, 0.5);
      const bubble = this.add.container(0, -(PLAYER_SIZE_PX / 2 + 30), [bubbleBg, bubbleText]);
      bubble.setVisible(false);

      const zzz = this.add
        .text(PLAYER_SIZE_PX / 2 + 2, -(PLAYER_SIZE_PX / 2 + 2), '💤', {
          fontSize: '14px',
        })
        .setOrigin(0.5, 0.5);
      zzz.setVisible(false);

      const container = this.add.container(x, y, [body, label, bubble, zzz]);
      entry = {
        container,
        body,
        label,
        bubble,
        bubbleBg,
        bubbleText,
        bubbleHideAt: 0,
        zzz,
        targetX: x,
        targetY: y,
        status,
      };
      this.sprites.set(id, entry);
    } else {
      entry.targetX = x;
      entry.targetY = y;
    }
    this.applyStatus(entry, status);
  }

  private showBubble(playerId: string, text: string): void {
    const entry = this.sprites.get(playerId);
    if (!entry) return;
    const truncated = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    entry.bubbleText.setText(truncated);
    const tw = entry.bubbleText.width + BUBBLE_PADDING_X * 2;
    const th = entry.bubbleText.height + BUBBLE_PADDING_Y * 2;
    entry.bubbleBg.setSize(tw, th);
    entry.bubble.setVisible(true);
    entry.bubbleHideAt = this.time.now + BUBBLE_DURATION_MS;
  }

  private applyStatus(entry: SpriteEntry, status: PlayerStatus): void {
    if (entry.status === status) return;
    entry.status = status;
    entry.container.setAlpha(status === 'active' ? 1 : 0.5);
    entry.zzz.setVisible(status === 'sleeping' || status === 'disconnected');
  }

  override update(_time: number, delta: number): void {
    // 입력 감지: 한 번에 한 방향
    let dir: InputDirection = 'stop';
    if (this.cursors.up.isDown || this.wKey.isDown) dir = 'up';
    else if (this.cursors.down.isDown || this.sKey.isDown) dir = 'down';
    else if (this.cursors.left.isDown || this.aKey.isDown) dir = 'left';
    else if (this.cursors.right.isDown || this.dKey.isDown) dir = 'right';

    if (dir !== this.currentInputDir) {
      this.currentInputDir = dir;
      this.socket?.emit('player:input', { dir, t: Date.now() });
    }

    // 부드러운 보간 + 말풍선 만료 처리
    const lerp = Math.min(1, delta / 80);
    const now = this.time.now;
    for (const entry of this.sprites.values()) {
      const c = entry.container;
      c.x += (entry.targetX - c.x) * lerp;
      c.y += (entry.targetY - c.y) * lerp;
      if (entry.bubbleHideAt && now > entry.bubbleHideAt) {
        entry.bubble.setVisible(false);
        entry.bubbleHideAt = 0;
      }
    }
  }
}
