import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';

interface OnboardingError {
  error?: string;
}

async function submitOnboarding(formData: FormData): Promise<void> {
  'use server';
  const nickname = String(formData.get('nickname') ?? '').trim();
  const avatarKey = String(formData.get('avatarKey') ?? '').trim();
  const skillsRaw = String(formData.get('skills') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();
  const quizQuestion = String(formData.get('quizQuestion') ?? '').trim();
  const quizAnswer = String(formData.get('quizAnswer') ?? '') === 'O';

  const skills = skillsRaw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  const { ok, error } = await apiFetch<OnboardingError>('/onboarding', {
    method: 'POST',
    auth: true,
    json: {
      nickname,
      avatarKey,
      skills,
      bio: bio || undefined,
      quizQuestion,
      quizAnswer,
    },
  });

  if (!ok) {
    redirect(`/onboarding?error=${encodeURIComponent(error ?? 'unknown')}`);
  }
  redirect('/onboarding/celebration');
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_nickname: '닉네임은 한글·영문·숫자·언더스코어 2~16자로 입력해주세요.',
  invalid_avatar_key: '아바타 선택이 올바르지 않습니다.',
  nickname_taken: '이미 사용 중인 닉네임입니다.',
  unauthorized: '세션이 만료되었습니다. 다시 로그인해주세요.',
};

const PRESET_AVATARS = [
  { key: 'preset:pokemon_025', label: '⚡ 피카츄' },
  { key: 'preset:pokemon_001', label: '🌱 이상해씨' },
  { key: 'preset:pokemon_004', label: '🔥 파이리' },
  { key: 'preset:pokemon_007', label: '💧 꼬부기' },
  { key: 'preset:pokemon_039', label: '🎤 푸린' },
  { key: 'preset:pokemon_133', label: '🐾 이브이' },
];

const LAYERED_AVATARS = [
  { key: 'layered:base=0|hair=0|outfit=0|acc=0', label: '🧑 캐릭터 A' },
  { key: 'layered:base=0|hair=1|outfit=1|acc=0', label: '👨 캐릭터 B' },
  { key: 'layered:base=1|hair=2|outfit=0|acc=1', label: '👩 캐릭터 C' },
  { key: 'layered:base=1|hair=3|outfit=2|acc=0', label: '👧 캐릭터 D' },
];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (me.isOnboarded) redirect('/play');

  const params = await searchParams;
  const errMsg = params.error ? ERROR_MESSAGES[params.error] ?? params.error : null;

  return (
    <main className="flex min-h-screen items-start justify-center p-6">
      <div className="w-full max-w-xl rounded-xl border border-narin-ink/10 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">🎈 입장 준비</h1>
        <p className="mb-6 text-sm opacity-70">
          닉네임 · 아바타 · 자기소개 명함 · OX 퀴즈를 설정하면 입장할 수 있어요.
        </p>

        {errMsg && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errMsg}</div>
        )}

        <form action={submitOnboarding} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">닉네임</span>
            <input
              type="text"
              name="nickname"
              required
              minLength={2}
              maxLength={16}
              placeholder="한글·영문·숫자 2~16자"
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">아바타</legend>
            <p className="text-xs opacity-60">
              MVP에서는 라벨만 표시. Phase 2에서 시각적 미리보기로 교체 예정.
            </p>
            <select
              name="avatarKey"
              required
              defaultValue=""
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            >
              <option value="" disabled>
                — 아바타를 선택하세요 —
              </option>
              <optgroup label="캐릭터 선택 (Preset)">
                {PRESET_AVATARS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="레이어 조합 (Layered)">
                {LAYERED_AVATARS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">스킬 (명함 태그)</span>
            <input
              type="text"
              name="skills"
              placeholder="React, Backend, DevOps (쉼표로 구분, 최대 10개)"
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">자기소개 (선택)</span>
            <textarea
              name="bio"
              maxLength={200}
              rows={2}
              placeholder="한 줄 소개 (선택)"
              className="rounded-md border border-narin-ink/20 px-3 py-2"
            />
          </label>

          <fieldset className="flex flex-col gap-2 rounded-md border border-narin-green/30 bg-narin-green/5 p-4">
            <legend className="px-2 text-sm font-semibold text-narin-green">
              나의 OX 퀴즈
            </legend>
            <p className="text-xs opacity-60">
              다른 사용자가 나와 만났을 때 풀게 될 문제입니다. 상대별 1회, 15초 제한.
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">질문</span>
              <input
                type="text"
                name="quizQuestion"
                required
                minLength={4}
                maxLength={200}
                placeholder="예: 나는 커피보다 차를 더 자주 마신다."
                className="rounded-md border border-narin-ink/20 px-3 py-2"
              />
            </label>
            <div className="mt-1 flex gap-6">
              <label className="flex items-center gap-2">
                <input type="radio" name="quizAnswer" value="O" required /> O (참)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="quizAnswer" value="X" /> X (거짓)
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            className="rounded-md bg-narin-green px-4 py-3 font-semibold text-white"
          >
            🎂 입장하기
          </button>
        </form>
      </div>
    </main>
  );
}
