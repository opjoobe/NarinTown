import { cookies } from 'next/headers';

const GAME_SERVER = process.env.GAME_SERVER_URL ?? 'http://localhost:3001';
export const SESSION_COOKIE = 'narintown_session';

type FetchOptions = RequestInit & {
  auth?: boolean;
  json?: unknown;
};

export async function apiFetch<T = unknown>(
  path: string,
  { auth = false, json, headers, ...init }: FetchOptions = {},
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };
  if (auth) {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (session) finalHeaders['authorization'] = `Bearer ${session}`;
  }
  if (json !== undefined) {
    finalHeaders['content-type'] = 'application/json';
    init.body = JSON.stringify(json);
  }

  const res = await fetch(`${GAME_SERVER}${path}`, {
    ...init,
    headers: finalHeaders,
    cache: 'no-store',
  });

  let data: T | null = null;
  let error: string | null = null;
  try {
    const body = await res.json();
    if (res.ok) {
      data = body as T;
    } else {
      error = (body && typeof body === 'object' && 'error' in body
        ? (body as { error: string }).error
        : `http_${res.status}`) ?? `http_${res.status}`;
    }
  } catch {
    error = `http_${res.status}`;
  }

  return { ok: res.ok, status: res.status, data, error };
}
