import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/api';
import GameCanvas from '@/lib/game/GameCanvas';

async function logout(): Promise<void> {
  'use server';
  const { clearSessionCookie } = await import('@/lib/session');
  await clearSessionCookie();
  redirect('/');
}

export default async function PlayPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (!me.isOnboarded) redirect('/onboarding');

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value ?? '';
  const gameServerUrl =
    process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001';

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-6">
      <header className="flex w-full max-w-6xl items-center justify-between">
        <div>
          <div className="text-xs opacity-50">NarinTown · {me.nickname}</div>
          <div className="text-xs opacity-50">
            상대와 가까이 가면 OX 퀴즈가 자동으로 떠요. 15초 안에 응답!
          </div>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <a href="/dashboard" className="underline opacity-70">
            대시보드
          </a>
          <a href="/account/password" className="underline opacity-70">
            비밀번호
          </a>
          {me.isAdmin && (
            <a href="/admin" className="underline opacity-70">
              관리자
            </a>
          )}
          <form action={logout}>
            <button type="submit" className="underline opacity-60">
              로그아웃
            </button>
          </form>
        </nav>
      </header>

      <GameCanvas
        sessionToken={sessionToken}
        gameServerUrl={gameServerUrl}
        initialNickname={me.nickname}
        initialPoints={me.score.points}
        initialStreak={me.score.currentStreak}
        initialBestStreak={me.score.bestStreak}
      />

      <p className="text-xs opacity-50">
        WASD / 방향키로 이동 · 다른 캐릭터와 가까이 가면 OX 퀴즈가 자동 시작됩니다
      </p>
    </main>
  );
}
