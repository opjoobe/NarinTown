import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1. 초대 코드 시드 (40명 분량 + 약간의 여유)
  const codes = [
    'NARIN-WELCOME',
    'NARIN-2NDANV',
    'NARIN-LV3UP',
    'NARIN-1784',
    ...Array.from({ length: 36 }, (_, i) => `NARIN-${String(i + 1).padStart(3, '0')}`),
  ];

  for (const code of codes) {
    await prisma.inviteCode.upsert({
      where: { code },
      update: {},
      create: {
        code,
        createdBy: 'seed',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30일
      },
    });
  }
  console.log(`✅ Seeded ${codes.length} invite codes`);

  // 2. 가입 허용 이메일 화이트리스트 (시작 멤버 1명만 — 나머지는 /admin에서 추가)
  const bootstrapEmails = ['joobe.lee@navercorp.com'];
  for (const email of bootstrapEmails) {
    await prisma.allowedEmail.upsert({
      where: { email },
      update: {},
      create: { email, createdBy: 'seed' },
    });
  }
  console.log(`✅ Seeded ${bootstrapEmails.length} allowed email(s) — 추가는 /admin에서`);

  console.log('ℹ️  Admin 마킹은 첫 사용자가 가입한 후 별도 SQL 또는 prisma studio로');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
