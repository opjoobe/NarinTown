export type Direction = 'up' | 'down' | 'left' | 'right';
export type InputDirection = Direction | 'stop';

export type PlayerStatus = 'active' | 'sleeping' | 'disconnected';

export interface PlayerState {
  id: string;
  nickname: string;
  avatarKey: string;
  x: number;
  y: number;
  dir: Direction;
  status: PlayerStatus;
}

export interface SelfState extends PlayerState {
  points: number;
  currentStreak: number;
  bestStreak: number;
}

export type QuizResult = 'correct' | 'wrong' | 'forfeited';

// 매 tick마다 보내는 경량 위치 페이로드
export interface PlayerTickState {
  id: string;
  x: number;
  y: number;
  dir: Direction;
  status: PlayerStatus;
}
