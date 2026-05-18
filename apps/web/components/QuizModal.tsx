'use client';

import { useEffect, useState } from 'react';
import type { QuizResult } from '@narintown/shared/types';

export interface ActiveQuiz {
  pairId: string;
  partnerNickname: string;
  question: string;
  timeLimit: number; // seconds
  startedAt: number; // ms
  // resolve 도착 시 채워짐
  result?: QuizResult;
  pointsDelta?: number;
  currentStreak?: number;
}

interface Props {
  quiz: ActiveQuiz | null;
  onAnswer: (pairId: string, guess: boolean) => void;
  onTimeout: () => void;
  onCloseResult: () => void;
}

export default function QuizModal({ quiz, onAnswer, onTimeout, onCloseResult }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const showingResult = !!quiz?.result;

  useEffect(() => {
    if (!quiz) {
      setSubmitted(false);
      return;
    }
    if (showingResult) return; // 결과 표시 중이면 카운트다운 멈춤
    const tick = (): void => {
      const elapsed = (Date.now() - quiz.startedAt) / 1000;
      const r = Math.max(0, quiz.timeLimit - elapsed);
      setRemaining(r);
      if (r <= 0) onTimeout();
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [quiz, showingResult, onTimeout]);

  if (!quiz) return null;

  const pct = Math.max(0, Math.min(100, (remaining / quiz.timeLimit) * 100));

  const handleAnswer = (guess: boolean): void => {
    if (submitted) return;
    setSubmitted(true);
    onAnswer(quiz.pairId, guess);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-2 text-xs opacity-60">
          🎯 <span className="font-medium">{quiz.partnerNickname}</span>님의 OX 퀴즈
        </div>
        <div className="mb-4 text-lg font-semibold leading-snug">{quiz.question}</div>

        {showingResult ? (
          <ResultView
            result={quiz.result!}
            pointsDelta={quiz.pointsDelta ?? 0}
            currentStreak={quiz.currentStreak ?? 0}
            onClose={onCloseResult}
          />
        ) : (
          <>
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded bg-narin-ink/10">
              <div
                className="h-full bg-narin-green transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mb-4 flex items-center justify-between text-xs opacity-70">
              <span>{Math.ceil(remaining)}초 남음</span>
              <span>상대별 1회 · 한 번만 도전 가능</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={submitted}
                onClick={() => handleAnswer(true)}
                className="rounded-lg bg-narin-green py-4 text-3xl font-bold text-white shadow-sm disabled:opacity-40"
              >
                O
              </button>
              <button
                type="button"
                disabled={submitted}
                onClick={() => handleAnswer(false)}
                className="rounded-lg bg-narin-ink/80 py-4 text-3xl font-bold text-white shadow-sm disabled:opacity-40"
              >
                X
              </button>
            </div>
            {submitted && (
              <p className="mt-3 text-center text-xs opacity-50">응답 전송됨 · 결과 대기 중…</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface ResultViewProps {
  result: QuizResult;
  pointsDelta: number;
  currentStreak: number;
  onClose: () => void;
}

function ResultView({ result, pointsDelta, currentStreak, onClose }: ResultViewProps) {
  let icon = '⏰';
  let title = '시간 초과';
  let titleColor = 'text-narin-ink/70';
  let detail = '기권 처리 · 콤보 리셋';

  if (result === 'correct') {
    icon = '✅';
    title = '정답!';
    titleColor = 'text-narin-green';
    detail =
      currentStreak >= 2
        ? `+${pointsDelta} · 🔥 ${currentStreak} 콤보`
        : `+${pointsDelta} 점수 획득`;
  } else if (result === 'wrong') {
    icon = '❌';
    title = '오답';
    titleColor = 'text-red-500';
    detail = '콤보 리셋 · 다음 만남을 기약';
  } else if (result === 'forfeited') {
    icon = '⏰';
    title = '기권 처리';
    titleColor = 'text-narin-ink/70';
    detail = '시간 안에 응답하지 못함 · 콤보 리셋';
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="text-6xl">{icon}</div>
      <div className={`text-2xl font-bold ${titleColor}`}>{title}</div>
      <div className="text-sm opacity-70">{detail}</div>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 rounded-md bg-narin-ink/80 px-6 py-2 text-sm font-semibold text-white hover:bg-narin-ink"
      >
        확인
      </button>
    </div>
  );
}
