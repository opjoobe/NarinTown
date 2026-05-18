import { cookies } from 'next/headers';
import { apiFetch, SESSION_COOKIE } from './api';

export interface MeResponse {
  id: string;
  email: string;
  nickname: string;
  avatarKey: string;
  isOnboarded: boolean;
  isAdmin: boolean;
  profile: { skills: string[]; bio: string | null } | null;
  quiz: { question: string } | null;
  score: { points: number; correctCount: number; currentStreak: number; bestStreak: number };
}

export async function getCurrentUser(): Promise<MeResponse | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)) return null;
  const { data } = await apiFetch<MeResponse>('/me', { auth: true });
  return data;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30일
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
