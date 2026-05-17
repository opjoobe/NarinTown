export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold">🌳 NarinTown</h1>
      <p className="text-lg opacity-70">
        게더타운형 가상 오피스 · 1784 컨셉 · 2nd Anniversary
      </p>
      <div className="mt-4 flex gap-4">
        <a
          href="/login"
          className="rounded-md bg-narin-green px-5 py-2 font-semibold text-white"
        >
          입장하기
        </a>
        <a
          href="/dashboard"
          className="rounded-md border border-narin-ink px-5 py-2 font-semibold"
        >
          대시보드
        </a>
      </div>
      <p className="mt-12 text-xs opacity-50">Phase 0 부트스트랩 · 곧 본격 구현 시작 🚀</p>
    </main>
  );
}
