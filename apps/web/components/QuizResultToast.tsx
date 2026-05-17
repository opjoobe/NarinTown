'use client';

import { useEffect, useState } from 'react';
import type { QuizResult } from '@narintown/shared/types';

export interface QuizResultData {
  result: QuizResult;
  pointsDelta: number;
  currentStreak: number;
  key: number; // 갱신 트리거용 (같은 결과여도 새 토스트로)
}

interface Props {
  data: QuizResultData | null;
}

export default function QuizResultToast({ data }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(id);
  }, [data]);

  if (!data || !visible) return null;

  let icon = '⏰';
  let label = '시간 초과';
  let color = 'bg-narin-ink/80';
  if (data.result === 'correct') {
    icon = '✅';
    const combo = data.currentStreak >= 2 ? ` · ${data.currentStreak} 콤보` : '';
    label = `정답! +${data.pointsDelta}${combo}`;
    color = 'bg-narin-green';
  } else if (data.result === 'wrong') {
    icon = '❌';
    label = '오답 (콤보 리셋)';
    color = 'bg-red-500';
  } else if (data.result === 'forfeited') {
    icon = '⏰';
    label = '기권 처리 (콤보 리셋)';
    color = 'bg-narin-ink/80';
  }

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md ${color} px-4 py-2 text-sm font-semibold text-white shadow-lg`}
    >
      {icon} {label}
    </div>
  );
}
