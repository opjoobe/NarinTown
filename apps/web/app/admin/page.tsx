import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import AutoRefresh from './AutoRefresh';

interface OnlinePlayer {
  userId: string;
  nickname: string;
  avatarKey: string;
  status: 'active' | 'sleeping' | 'disconnected';
  x: number;
  y: number;
  lastInputAgoSec: number;
}
interface OnlineResp {
  count: number;
  players: OnlinePlayer[];
}

interface InviteCodeRow {
  code: string;
  createdAt: string;
  expiresAt: string | null;
  usedBy: string | null;
  usedByNickname: string | null;
  usedByEmail: string | null;
}
interface CodesResp {
  codes: InviteCodeRow[];
}

interface StatsResp {
  userCount: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  recentAttempts24h: number;
  onlineCount: number;
  inviteCodes: { total: number; used: number; free: number };
}

interface AllowedEmailRow {
  email: string;
  createdAt: string;
  createdBy: string | null;
}
interface AllowedEmailsResp {
  emails: AllowedEmailRow[];
}

async function createCode(formData: FormData): Promise<void> {
  'use server';
  const code = String(formData.get('code') ?? '').trim() || undefined;
  const expiresInDays = Number(formData.get('expiresInDays') ?? 30) || 30;
  await apiFetch('/admin/invite-codes', {
    method: 'POST',
    auth: true,
    json: { code, expiresInDays },
  });
  redirect('/admin');
}

async function expireCode(formData: FormData): Promise<void> {
  'use server';
  const code = String(formData.get('code') ?? '').trim();
  if (!code) return;
  await apiFetch(`/admin/invite-codes/${encodeURIComponent(code)}/expire`, {
    method: 'POST',
    auth: true,
  });
  redirect('/admin');
}

async function addAllowedEmail(formData: FormData): Promise<void> {
  'use server';
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return;
  await apiFetch('/admin/allowed-emails', {
    method: 'POST',
    auth: true,
    json: { email },
  });
  redirect('/admin');
}

async function removeAllowedEmail(formData: FormData): Promise<void> {
  'use server';
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return;
  await apiFetch(`/admin/allowed-emails/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    auth: true,
  });
  redirect('/admin');
}

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (!me.isAdmin) redirect('/dashboard');

  const [onlineRes, codesRes, statsRes, allowedRes] = await Promise.all([
    apiFetch<OnlineResp>('/admin/online', { auth: true }),
    apiFetch<CodesResp>('/admin/invite-codes', { auth: true }),
    apiFetch<StatsResp>('/admin/stats', { auth: true }),
    apiFetch<AllowedEmailsResp>('/admin/allowed-emails', { auth: true }),
  ]);
  const online = onlineRes.data;
  const codes = codesRes.data?.codes ?? [];
  const stats = statsRes.data;
  const allowedEmails = allowedRes.data?.emails ?? [];
  const now = Date.now();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <AutoRefresh intervalMs={5000} />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🛠️ 관리자 대시보드</h1>
          <p className="text-xs opacity-50">5초마다 자동 갱신 · 본인은 /play 탭이 떠 있을 때만 active로 표시됩니다</p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/dashboard" className="underline opacity-70">
            내 대시보드
          </a>
          <a href="/play" className="underline opacity-70">
            게임
          </a>
        </nav>
      </header>

      {/* 통계 카드 */}
      {stats && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="총 가입자" value={stats.userCount} />
          <StatCard label="현재 접속" value={stats.onlineCount} />
          <StatCard label="누적 도전" value={stats.attemptCount} />
          <StatCard
            label="정답률"
            value={`${stats.accuracy}%`}
            sub={`정답 ${stats.correctCount}회`}
          />
          <StatCard label="24h 활동" value={stats.recentAttempts24h} />
          <StatCard
            label="초대 코드"
            value={`${stats.inviteCodes.used} / ${stats.inviteCodes.total}`}
            sub={`사용 / 전체 · 가용 ${stats.inviteCodes.free}`}
          />
        </section>
      )}

      {/* 현재 접속자 */}
      <section className="rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">👥 현재 접속자 ({online?.count ?? 0})</h2>
        {!online?.players.length ? (
          <p className="text-sm opacity-50">접속자 없음</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {online.players.map((p) => (
              <li
                key={p.userId}
                className="flex items-center justify-between rounded-md bg-narin-paper px-3 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={p.status} />
                  <span className="font-medium">{p.nickname}</span>
                  <span className="text-xs opacity-50">{p.avatarKey}</span>
                </div>
                <div className="text-xs opacity-60">
                  ({p.x}, {p.y}) · 입력 {p.lastInputAgoSec}s 전
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs opacity-40">5초마다 자동 갱신</p>
      </section>

      {/* 초대 코드 발급 */}
      <section className="rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">🎟️ 초대 코드 발급</h2>
        <form action={createCode} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-60">코드 (비우면 자동 생성)</span>
            <input
              name="code"
              type="text"
              placeholder="NARIN-XXXXXXXX"
              className="rounded-md border border-narin-ink/20 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-60">만료(일)</span>
            <input
              name="expiresInDays"
              type="number"
              defaultValue={30}
              min={1}
              max={365}
              className="w-24 rounded-md border border-narin-ink/20 px-3 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-narin-green px-4 py-1.5 text-sm font-semibold text-white"
          >
            발급
          </button>
        </form>
      </section>

      {/* 가입 허용 이메일 화이트리스트 */}
      <section className="rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">📋 가입 허용 이메일 ({allowedEmails.length})</h2>
        <p className="mb-3 text-xs opacity-60">
          @navercorp.com 중에서도 여기 등록된 이메일만 가입할 수 있습니다.
        </p>
        <form action={addAllowedEmail} className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs opacity-60">새 이메일 (@navercorp.com)</span>
            <input
              name="email"
              type="email"
              required
              placeholder="mingeun.kim@navercorp.com"
              className="rounded-md border border-narin-ink/20 px-3 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-narin-green px-4 py-1.5 text-sm font-semibold text-white"
          >
            추가
          </button>
        </form>
        {allowedEmails.length === 0 ? (
          <p className="text-sm opacity-50">등록된 이메일 없음</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {allowedEmails.map((e) => (
              <li
                key={e.email}
                className="flex items-center justify-between rounded-md bg-narin-paper px-3 py-1.5"
              >
                <span className="font-mono text-xs">{e.email}</span>
                <form action={removeAllowedEmail}>
                  <input type="hidden" name="email" value={e.email} />
                  <button type="submit" className="text-xs text-red-500 underline">
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 초대 코드 목록 */}
      <section className="rounded-xl border border-narin-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">초대 코드 목록</h2>
        {codes.length === 0 ? (
          <p className="text-sm opacity-50">초대 코드 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-narin-ink/10 text-left text-xs opacity-60">
                  <th className="py-2">코드</th>
                  <th>상태</th>
                  <th>사용자</th>
                  <th>만료</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = c.expiresAt && new Date(c.expiresAt).getTime() < now;
                  const used = !!c.usedBy;
                  const state = expired ? '만료' : used ? '사용됨' : '대기';
                  const stateColor = expired
                    ? 'text-narin-ink/40'
                    : used
                      ? 'text-narin-green'
                      : 'text-blue-500';
                  return (
                    <tr key={c.code} className="border-b border-narin-ink/5">
                      <td className="py-2 font-mono text-xs">{c.code}</td>
                      <td className={`${stateColor} text-xs font-semibold`}>{state}</td>
                      <td className="text-xs">
                        {c.usedByNickname ? (
                          <>
                            {c.usedByNickname}
                            <span className="opacity-50"> · {c.usedByEmail}</span>
                          </>
                        ) : (
                          <span className="opacity-30">—</span>
                        )}
                      </td>
                      <td className="text-xs opacity-60">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString('ko-KR')
                          : '무제한'}
                      </td>
                      <td>
                        {!expired && !used && (
                          <form action={expireCode}>
                            <input type="hidden" name="code" value={c.code} />
                            <button
                              type="submit"
                              className="text-xs text-red-500 underline"
                            >
                              만료
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-narin-ink/10 bg-white p-4 shadow-sm">
      <div className="text-xs opacity-60">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] opacity-50">{sub}</div>}
    </div>
  );
}

function StatusDot({ status }: { status: 'active' | 'sleeping' | 'disconnected' }) {
  const color =
    status === 'active' ? 'bg-narin-green' : status === 'sleeping' ? 'bg-yellow-400' : 'bg-narin-ink/30';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} title={status} />;
}
