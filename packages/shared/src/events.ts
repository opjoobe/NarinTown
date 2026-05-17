import type {
  InputDirection,
  PlayerState,
  PlayerTickState,
  SelfState,
  QuizResult,
} from './types.js';

// ===== Client → Server =====

export interface PlayerInputPayload {
  dir: InputDirection;
  t: number; // 클라 timestamp (ms)
}

export interface QuizAnswerPayload {
  pairId: string;
  guess: boolean; // O=true, X=false
}

export interface ChatGlobalPayload {
  text: string;
}

// ===== Server → Client =====

export interface RoomJoinPayload {
  self: SelfState;
  players: PlayerState[];
  mapId: string;
}

export interface StateTickPayload {
  players: PlayerTickState[];
  t: number; // 서버 timestamp
}

export interface PlayerJoinedPayload {
  player: PlayerState;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface QuizPromptPayload {
  pairId: string;
  partnerId: string;
  partnerNickname: string;
  question: string;
  timeLimit: number; // seconds, default 15
}

export interface QuizResolvePayload {
  pairId: string;
  result: QuizResult;
  pointsDelta: number;
  points: number;
  currentStreak: number;
}

export interface ScoreUpdatePayload {
  userId: string;
  points: number;
  currentStreak: number;
  bestStreak: number;
}

export interface LeaderboardUpdatePayload {
  top: Array<{
    rank: number;
    userId: string;
    nickname: string;
    avatarKey: string;
    points: number;
  }>;
}

export interface ChatMessagePayload {
  from: string;
  fromNickname: string;
  text: string;
  t: number;
}

export interface ChatHistoryPayload {
  messages: ChatMessagePayload[];
}

export interface SystemErrorPayload {
  code: string;
  message: string;
}

// ===== Event Map =====

export interface ClientToServerEvents {
  'player:input': (payload: PlayerInputPayload) => void;
  'quiz:answer': (payload: QuizAnswerPayload) => void;
  'chat:global': (payload: ChatGlobalPayload) => void;
}

export interface ServerToClientEvents {
  'room:join': (payload: RoomJoinPayload) => void;
  'room:player:joined': (payload: PlayerJoinedPayload) => void;
  'room:player:left': (payload: PlayerLeftPayload) => void;
  'state:tick': (payload: StateTickPayload) => void;
  'quiz:prompt': (payload: QuizPromptPayload) => void;
  'quiz:resolve': (payload: QuizResolvePayload) => void;
  'score:update': (payload: ScoreUpdatePayload) => void;
  'leaderboard:update': (payload: LeaderboardUpdatePayload) => void;
  'chat:global': (payload: ChatMessagePayload) => void;
  'chat:history': (payload: ChatHistoryPayload) => void;
  'system:error': (payload: SystemErrorPayload) => void;
}
