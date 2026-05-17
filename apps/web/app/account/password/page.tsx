import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';

async function setPassword(formData: FormData): Promise<void> {
  'use server';
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password !== confirm) {
    redirect('/account/password?error=mismatch');
  }
  if (password.length < 8) {
    redirect('/account/password?error=too_short');
  }

  const { ok, error } = await apiFetch('/auth/password/set', {
    method: 'POST',
    auth: true,
    json: { password },
  });
  if (!ok) {
    redirect(`/account/password?error=${encodeURIComponent(error ?? 'unknown')}`);
  }
  redirect('/account/password?ok=1');
}

const ERRORS: Record<string, string> = {
  mismatch: '비밀번호 확인이 일치하지 않습니다.',
  too_short: '비밀번호는 최소 8자 이상이어야 합니다.',
  unauthorized: '세션이 만료되었습니다. 다시 로그인해주세요.',
};

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect('/login');

  const params = await searchParams;
  const err = params.error ? ERRORS[params.error] ?? params.error : null;
  const success = params.ok === '1';

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <header>
        <h1 className="text-2xl font-bold">🔐 비밀번호 설정</h1>
        <p className="mt-1 text-sm opacity-70">
          {me.email} · {me.nickname}
        </p>
      </header>

      {success && (
        <div className="rounded-md bg-narin-green/10 p-3 text-sm text-narin-green">
          ✅ 비밀번호가 설정되었습니다. 이제 매직링크 외에 비밀번호로도 로그인할 수 있어요.
        </div>
      )}
      {err && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      <form action={setPassword} className="flex flex-col gap-3 rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">새 비밀번호 (8자 이상)</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            className="rounded-md border border-narin-ink/20 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">비밀번호 확인</span>
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            maxLength={128}
            className="rounded-md border border-narin-ink/20 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-narin-green px-4 py-2 font-semibold text-white"
        >
          저장
        </button>
      </form>

      <nav className="flex gap-3 text-sm">
        <a href="/play" className="underline opacity-70">← 게임</a>
        <a href="/dashboard" className="underline opacity-70">대시보드</a>
      </nav>
    </main>
  );
}
