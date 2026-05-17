import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import DashboardClient from './DashboardClient';

interface AttemptRow {
  id: string;
  targetNickname: string;
  result: 'correct' | 'wrong' | 'forfeited';
  pointsDelta: number;
  attemptedAt: string;
}
interface AttemptsResp {
  attempts: AttemptRow[];
}
interface LeaderboardRow {
  rank: number;
  userId: string;
  nickname: string;
  avatarKey: string;
  points: number;
}
interface LeaderboardResp {
  top: LeaderboardRow[];
}

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (!me.isOnboarded) redirect('/onboarding');

  const [attemptsRes, leaderboardRes] = await Promise.all([
    apiFetch<AttemptsResp>('/me/attempts', { auth: true }),
    apiFetch<LeaderboardResp>('/leaderboard'),
  ]);

  const attempts = attemptsRes.data?.attempts ?? [];
  const initialTop = leaderboardRes.data?.top ?? [];
  const totalAttempts = attempts.length;
  const corrects = attempts.filter((a) => a.result === 'correct').length;
  const accuracy = totalAttempts === 0 ? 0 : Math.round((corrects / totalAttempts) * 100);

  const gameServerUrl =
    process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001';

  return (
    <DashboardClient
      selfId={me.id}
      nickname={me.nickname}
      points={me.score.points}
      correctCount={me.score.correctCount}
      currentStreak={me.score.currentStreak}
      bestStreak={me.score.bestStreak}
      totalAttempts={totalAttempts}
      accuracy={accuracy}
      attempts={attempts}
      initialTop={initialTop}
      isAdmin={me.isAdmin}
      gameServerUrl={gameServerUrl}
    />
  );
}
