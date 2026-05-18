export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-narin-ink/10 bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-4xl">📬</div>
        <h1 className="mb-2 text-2xl font-bold">메일을 확인하세요</h1>
        <p className="mb-4 text-sm opacity-70">
          {email ? <span className="font-medium">{email}</span> : '이메일'} 으로 매직링크를 보냈습니다.
          <br />
          링크는 15분간 유효합니다.
        </p>
        <p className="text-xs opacity-50">
          로컬 개발: MailHog UI에서 메일 확인 → <a href="http://localhost:8025" className="underline">http://localhost:8025</a>
        </p>
        <a
          href="/login"
          className="mt-6 inline-block text-sm text-narin-green underline"
        >
          ← 다시 보내기
        </a>
      </div>
    </main>
  );
}
