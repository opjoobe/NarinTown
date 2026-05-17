'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  LeaderboardUpdatePayload,
  ScoreUpdatePayload,
} from '@narintown/shared/events';

interface AttemptRow {
  id: string;
  targetNickname: string;
  result: 'correct' | 'wrong' | 'forfeited';
  pointsDelta: number;
  attemptedAt: string;
}

interface LeaderboardRow {
  rank: number;
  userId: string;
  nickname: string;
  avatarKey: string;
  points: number;
}

interface Props {
  selfId: string;
  nickname: string;
  points: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  totalAttempts: number;
  accuracy: number;
  attempts: AttemptRow[];
  initialTop: LeaderboardRow[];
  isAdmin: boolean;
  gameServerUrl: string;
}

function medalFor(rank: number): { icon: string; bg: string } {
  if (rank === 1) return { icon: '🥇', bg: 'from-yellow-300 to-yellow-100' };
  if (rank === 2) return { icon: '🥈', bg: 'from-slate-300 to-slate-100' };
  if (rank === 3) return { icon: '🥉', bg: 'from-amber-300 to-amber-100' };
  return { icon: `#${rank}`, bg: 'from-white to-white' };
}

function resultLabel(r: AttemptRow['result']): { icon: string; label: string; color: string } {
  if (r === 'correct') return { icon: '✅', label: '정답', color: 'text-narin-green' };
  if (r === 'wrong') return { icon: '❌', label: '오답', color: 'text-red-500' };
  return { icon: '⏰', label: '기권', color: 'text-narin-ink/60' };
}

export default function DashboardClient(props: Props) {
  const {
    selfId,
    nickname,
    correctCount,
    totalAttempts,
    accuracy,
    attempts,
    initialTop,
    isAdmin,
    gameServerUrl,
  } = props;

  const [stats, setStats] = useState({
    points: props.points,
    currentStreak: props.currentStreak,
    bestStreak: props.bestStreak,
  });
  const [top, setTop] = useState<LeaderboardRow[]>(initialTop);

  useEffect(() => {
    // 실시간 구독: 자신의 점수 + 리더보드 변동
    // 별도 소켓 인스턴스로 잠깐 연결 (게임 화면 아님)
    type IOSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
    const socket: IOSocket = io(gameServerUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('score:update', (s: ScoreUpdatePayload) => {
      if (s.userId === selfId) {
        setStats({
          points: s.points,
          currentStreak: s.currentStreak,
          bestStreak: s.bestStreak,
        });
      }
    });
    socket.on('leaderboard:update', (l: LeaderboardUpdatePayload) => {
      setTop(l.top);
    });

    return () => {
      socket.disconnect();
    };
  }, [selfId, gameServerUrl]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📊 대시보드</h1>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/play" className="underline opacity-70">
            ← 게임으로
          </a>
          {isAdmin && (
            <a href="/admin" className="underline opacity-70">
              관리자
            </a>
          )}
        </nav>
      </header>

      <section className="rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">내 점수 — {nickname}</h2>
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-5">
          <Stat label="누적 점수" value={stats.points} />
          <Stat label="정답 수" value={correctCount} />
          <Stat label="총 도전" value={totalAttempts} />
          <Stat label="현재 콤보" value={stats.currentStreak} suffix={stats.currentStreak >= 2 ? ' 🔥' : ''} />
          <Stat label="최고 콤보" value={stats.bestStreak} />
        </div>
        <div className="mt-3 text-center text-sm opacity-70">
          정답률 <span className="font-semibold">{accuracy}%</span>
        </div>
      </section>

      <section className="rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">🏆 실시간 랭킹 (Top 5)</h2>
        {top.length === 0 ? (
          <p className="text-sm opacity-50">아직 점수 기록이 없습니다.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {top.map((row) => {
              const m = medalFor(row.rank);
              const isMe = row.userId === selfId;
              const isPodium = row.rank <= 3;
              return (
                <li
                  key={row.userId}
                  className={`flex items-center justify-between rounded-lg border ${
                    isPodium ? 'border-narin-green/30' : 'border-narin-ink/10'
                  } ${isPodium ? `bg-gradient-to-r ${m.bg}` : 'bg-narin-paper'} ${
                    isMe ? 'ring-2 ring-narin-green' : ''
                  } px-4 py-3`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 text-xl font-bold">{m.icon}</div>
                    <div>
                      <div className="font-semibold">
                        {row.nickname} {isMe && <span className="text-xs text-narin-green">(나)</span>}
                      </div>
                      <div className="text-xs opacity-60">{row.avatarKey}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold tabular-nums">{row.points.toLocaleString()}</div>
                    <div className="text-xs opacity-60">pt</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">🎯 내 도전 기록</h2>
        {attempts.length === 0 ? (
          <p className="text-sm opacity-50">아직 도전한 기록이 없습니다. 맵에서 다른 사람을 만나보세요.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {attempts.map((a) => {
              const r = resultLabel(a.result);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md bg-narin-paper px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span>{r.icon}</span>
                    <span className={`font-semibold ${r.color}`}>{r.label}</span>
                    <span className="opacity-60">·</span>
                    <span>
                      <span className="font-medium">{a.targetNickname}</span>
                      <span className="opacity-50">의 퀴즈</span>
                    </span>
                  </div>
                  <div className="text-xs opacity-60">
                    {a.pointsDelta > 0 ? `+${a.pointsDelta}pt · ` : ''}
                    {new Date(a.attemptedAt).toLocaleString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs opacity-40">실제 O/X 답안은 플레이어 간 공유 방지를 위해 노출되지 않습니다.</p>
      </section>
    </main>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tabular-nums">
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs opacity-60">{label}</div>
    </div>
  );
}
