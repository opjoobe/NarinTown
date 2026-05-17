'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  nickname: string;
}

export default function CelebrationClient({ nickname }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200), // 케이크 등장
      setTimeout(() => setPhase(2), 1500), // 아바타 등장
      setTimeout(() => setPhase(3), 2700), // 후~ + 촛불 끄기
      setTimeout(() => setPhase(4), 3700), // Level-Up 텍스트
      setTimeout(() => router.replace('/play'), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-narin-paper to-white p-8">
      <div className="text-center">
        {/* 2nd Anniversary 텍스트 */}
        <div
          className={`mb-2 text-xs font-bold tracking-[0.3em] text-narin-green transition-opacity duration-500 ${
            phase >= 1 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          2ND ANNIVERSARY
        </div>

        {/* 케이크 */}
        <div
          className={`relative inline-block transition-all duration-500 ${
            phase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="text-[120px] leading-none">🎂</div>
          {/* 촛불 — 3페이즈에서 꺼짐 */}
          <div
            className={`absolute left-1/2 top-2 -translate-x-1/2 text-[28px] transition-all ${
              phase >= 3 ? 'translate-y-2 opacity-0' : 'opacity-100'
            }`}
          >
            🕯️
          </div>
          {/* 연기 */}
          <div
            className={`absolute left-1/2 -top-2 -translate-x-1/2 text-2xl transition-opacity duration-700 ${
              phase >= 3 ? 'opacity-70' : 'opacity-0'
            }`}
          >
            💨
          </div>
        </div>

        {/* 아바타 + 후~ */}
        <div
          className={`mt-2 flex items-center justify-center gap-3 transition-all duration-500 ${
            phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="text-3xl">🧑</div>
          <div
            className={`text-sm font-medium text-narin-green transition-opacity ${
              phase >= 3 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            후~
          </div>
        </div>

        {/* Level-Up 텍스트 */}
        <div
          className={`mt-8 transition-all duration-700 ${
            phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="text-2xl font-bold">
            <span className="text-narin-green">{nickname}</span>님,
          </div>
          <div className="mt-1 text-2xl font-bold">3년차로 Level-Up을 축하합니다! 🎉</div>
        </div>
      </div>
    </main>
  );
}
