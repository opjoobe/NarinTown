import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getCurrentUser, setSessionCookie } from '@/lib/session';
import LoginTabs from './LoginTabs';

interface MagicLinkVerifyResp {
  sessionToken: string;
  isOnboarded: boolean;
}

async function requestMagicLink(formData: FormData): Promise<void> {
  'use server';
  const email = String(formData.get('email') ?? '').trim();
  const inviteCode = String(formData.get('inviteCode') ?? '').trim();

  const { ok, error } = await apiFetch('/auth/magic-link/request', {
    method: 'POST',
    json: { email, inviteCode },
  });

  if (!ok) {
    const reason = error ?? 'unknown';
    redirect(`/login?error=${encodeURIComponent(reason)}&email=${encodeURIComponent(email)}&mode=magic`);
  }
  redirect(`/login/check?email=${encodeURIComponent(email)}`);
}

async function loginWithPassword(formData: FormData): Promise<void> {
  'use server';
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const { ok, data, error } = await apiFetch<MagicLinkVerifyResp>('/auth/password/login', {
    method: 'POST',
    json: { email, password },
  });

  if (!ok || !data) {
    const reason = error ?? 'unknown';
    redirect(`/login?error=${encodeURIComponent(reason)}&email=${encodeURIComponent(email)}&mode=password`);
  }
  await setSessionCookie(data.sessionToken);
  redirect(data.isOnboarded ? '/play' : '/onboarding');
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: '이메일 형식이 올바르지 않습니다.',
  email_domain_not_allowed: '@navercorp.com 이메일만 가입 가능합니다.',
  email_not_in_whitelist: '가입 허용 명단에 없는 이메일입니다. 관리자에게 추가 요청해주세요.',
  invite_code_required: '초대 코드가 필요합니다.',
  invalid_invite_code: '존재하지 않는 초대 코드입니다.',
  invite_code_exhausted: '이미 다른 사용자가 사용한 초대 코드입니다.',
  token_required: '잘못된 매직링크입니다.',
  invalid_token: '존재하지 않는 매직링크입니다. 다시 요청해주세요.',
  token_already_used: '이미 사용된 매직링크입니다. 다시 요청해주세요.',
  token_expired: '매직링크가 만료되었습니다. 다시 요청해주세요.',
  invite_code_expired: '초대 코드가 만료되었습니다.',
  invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; mode?: 'magic' | 'password' }>;
}) {
  const me = await getCurrentUser();
  if (me) redirect(me.isOnboarded ? '/play' : '/onboarding');

  const params = await searchParams;
  const errMsg = params.error ? ERROR_MESSAGES[params.error] ?? params.error : null;
  const initialMode = params.mode === 'password' ? 'password' : 'magic';

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-narin-ink/10 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">🌳 NarinTown 입장</h1>
        <p className="mb-6 text-sm opacity-70">
          @navercorp.com 가입 허용 명단에 등록된 분만 입장 가능합니다.
        </p>

        {errMsg && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errMsg}</div>
        )}

        <LoginTabs
          initialMode={initialMode}
          initialEmail={params.email ?? ''}
          requestMagicLink={requestMagicLink}
          loginWithPassword={loginWithPassword}
        />
      </div>
    </main>
  );
}
