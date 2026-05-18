'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessagePayload,
  LeaderboardUpdatePayload,
  ScoreUpdatePayload,
} from '@narintown/shared/events';
import ChatPanel from '@/components/ChatPanel';
import QuizModal, { type ActiveQuiz } from '@/components/QuizModal';
import QuizResultToast, { type QuizResultData } from '@/components/QuizResultToast';

type IOSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  sessionToken: string;
  gameServerUrl: string;
  initialNickname: string;
  initialPoints: number;
  initialStreak: number;
  initialBestStreak: number;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const MAX_CHAT_KEEP = 200;

export default function GameCanvas({
  sessionToken,
  gameServerUrl,
  initialNickname,
  initialPoints,
  initialStreak,
  initialBestStreak,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<IOSocket | null>(null);
  const selfIdRef = useRef<string>('');

  const [chat, setChat] = useState<ChatMessagePayload[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);
  const [score, setScore] = useState({
    points: initialPoints,
    currentStreak: initialStreak,
    bestStreak: initialBestStreak,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUpdatePayload['top']>([]);

  useEffect(() => {
    const socket: IOSocket = io(gameServerUrl, {
      auth: { token: sessionToken },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => console.error('[socket] connect_error', err.message));

    socket.on('room:join', (payload) => {
      selfIdRef.current = payload.self.id;
      setScore({
        points: payload.self.points,
        currentStreak: payload.self.currentStreak,
        bestStreak: payload.self.bestStreak,
      });
    });

    socket.on('chat:global', (m) => {
      setChat((prev) => {
        const next = [...prev, m];
        return next.length > MAX_CHAT_KEEP ? next.slice(-MAX_CHAT_KEEP) : next;
      });
    });
    socket.on('chat:history', ({ messages }) => {
      setChat((prev) => [...messages, ...prev].slice(-MAX_CHAT_KEEP));
    });

    socket.on('quiz:prompt', (p) => {
      setActiveQuiz({
        pairId: p.pairId,
        partnerNickname: p.partnerNickname,
        question: p.question,
        timeLimit: p.timeLimit,
        startedAt: Date.now(),
      });
    });
    socket.on('quiz:resolve', (r) => {
      setActiveQuiz((prev) => {
        if (prev && prev.pairId === r.pairId) {
          // 모달이 떠 있으면 그 안에 결과를 표시
          return {
            ...prev,
            result: r.result,
            pointsDelta: r.pointsDelta,
            currentStreak: r.currentStreak,
          };
        }
        // 모달이 없으면(예: 타임아웃으로 사용자가 닫음) 토스트로
        setQuizResult({
          result: r.result,
          pointsDelta: r.pointsDelta,
          currentStreak: r.currentStreak,
          key: Date.now(),
        });
        return prev;
      });
      setScore((prev) => ({
        ...prev,
        points: r.points,
        currentStreak: r.currentStreak,
      }));
    });

    socket.on('score:update', (s: ScoreUpdatePayload) => {
      if (s.userId === selfIdRef.current) {
        setScore({
          points: s.points,
          currentStreak: s.currentStreak,
          bestStreak: s.bestStreak,
        });
      }
    });
    socket.on('leaderboard:update', (l: LeaderboardUpdatePayload) => {
      setLeaderboard(l.top);
    });

    let game: import('phaser').Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import('phaser')).default;
      const { OfficeScene } = await import('./scenes/OfficeScene');
      if (cancelled || !parentRef.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: parentRef.current,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#eef0e8',
        scene: [OfficeScene],
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        },
        callbacks: {
          preBoot: (g) => {
            g.registry.set('socket', socket);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      socket.disconnect();
    };
  }, [sessionToken, gameServerUrl]);

  const sendChat = (text: string): void => {
    socketRef.current?.emit('chat:global', { text });
  };

  const handleAnswer = (pairId: string, guess: boolean): void => {
    socketRef.current?.emit('quiz:answer', { pairId, guess });
  };

  const handleQuizTimeout = (): void => {
    // 시간 초과: 클라는 modal만 닫음. 결과는 서버 resolve를 통해 도착 (토스트)
    setActiveQuiz(null);
  };

  // 결과 표시 후 자동 닫기는 제거 — 사용자가 직접 "확인" 버튼으로 닫음
  // (느긋하게 결과 확인 가능)
  const handleCloseResult = (): void => {
    setActiveQuiz(null);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-3">
          <ScoreHud
            nickname={initialNickname}
            points={score.points}
            currentStreak={score.currentStreak}
            bestStreak={score.bestStreak}
            leaderboard={leaderboard}
            selfId={selfIdRef.current}
          />
          <div
            ref={parentRef}
            className="overflow-hidden rounded-xl border border-narin-ink/10 bg-white shadow-sm"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          />
        </div>
        <ChatPanel messages={chat} onSend={sendChat} connected={connected} />
      </div>

      <QuizModal
        quiz={activeQuiz}
        onAnswer={handleAnswer}
        onTimeout={handleQuizTimeout}
        onCloseResult={handleCloseResult}
      />
      <QuizResultToast data={quizResult} />
    </>
  );
}

interface HudProps {
  nickname: string;
  points: number;
  currentStreak: number;
  bestStreak: number;
  leaderboard: LeaderboardUpdatePayload['top'];
  selfId: string;
}

function medalFor(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function ScoreHud({
  nickname,
  points,
  currentStreak,
  bestStreak,
  leaderboard,
  selfId,
}: HudProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border border-narin-ink/10 bg-white px-4 py-2 shadow-sm"
      style={{ width: CANVAS_WIDTH }}
    >
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-xs opacity-50">나</span>{' '}
          <span className="font-semibold">{nickname}</span>
        </div>
        <div>
          <span className="text-xs opacity-50">점수</span>{' '}
          <span className="font-bold tabular-nums">{points.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-xs opacity-50">콤보</span>{' '}
          <span className="font-bold tabular-nums text-narin-green">
            {currentStreak > 0 ? `🔥 ${currentStreak}` : '–'}
          </span>
          {bestStreak > 0 && (
            <span className="ml-1 text-xs opacity-50">(최고 {bestStreak})</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="opacity-50">랭킹</span>
        {leaderboard.length === 0 ? (
          <span className="opacity-40">아직 없음</span>
        ) : (
          <div className="flex gap-2">
            {leaderboard.map((row) => (
              <span
                key={row.userId}
                className={`rounded-md px-2 py-0.5 ${
                  row.userId === selfId
                    ? 'bg-narin-green/15 text-narin-green'
                    : 'bg-narin-ink/5'
                }`}
                title={`${row.nickname} · ${row.points}pt`}
              >
                {medalFor(row.rank)} {row.nickname} {row.points}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
