'use client';

import { useState } from 'react';

type Mode = 'magic' | 'password';

interface Props {
  initialMode: Mode;
  initialEmail: string;
  requestMagicLink: (formData: FormData) => Promise<void>;
  loginWithPassword: (formData: FormData) => Promise<void>;
}

export default function LoginTabs({
  initialMode,
  initialEmail,
  requestMagicLink,
  loginWithPassword,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="flex flex-col gap-4">
      {/* 탭 헤더 */}
      <div className="flex gap-1 rounded-md bg-narin-ink/5 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`flex-1 rounded-md px-3 py-1.5 ${
            mode === 'magic' ? 'bg-white shadow-sm font-semibold' : 'opacity-60'
          }`}
        >
          매직링크
        </button>
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 rounded-md px-3 py-1.5 ${
            mode === 'password' ? 'bg-white shadow-sm font-semibold' : 'opacity-60'
          }`}
        >
          비밀번호
        </button>
      </div>

      {mode === 'magic' ? (
        <form action={requestMagicLink} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">초대 코드</span>
            <input
              type="text"
              name="inviteCode"
              required
              placeholder="NARIN-WELCOME"
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">이메일</span>
            <input
              type="email"
              name="email"
              required
              defaultValue={initialEmail}
              placeholder="you@navercorp.com"
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-narin-green px-4 py-2 font-semibold text-white"
          >
            매직링크 받기
          </button>
          <p className="text-xs opacity-50">
            처음 가입하시는 분은 매직링크 + 초대 코드로 시작하세요. 입장 후 비밀번호를 설정하면
            이후 비밀번호로도 로그인 가능합니다.
          </p>
        </form>
      ) : (
        <form action={loginWithPassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">이메일</span>
            <input
              type="email"
              name="email"
              required
              defaultValue={initialEmail}
              placeholder="you@navercorp.com"
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">비밀번호</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-narin-green px-4 py-2 font-semibold text-white"
          >
            로그인
          </button>
          <p className="text-xs opacity-50">
            비밀번호는 입장 후 <span className="font-medium">계정 설정</span>에서 만들 수 있습니다.
            잊으셨다면 매직링크 탭으로 다시 로그인 후 재설정하세요.
          </p>
        </form>
      )}
    </div>
  );
}
