# Runbook

## 사전 요구

- Node.js 20+
- pnpm 9+
- Docker / Docker Compose

## 최초 1회 셋업

```bash
pnpm install

cp .env.example .env
# .env의 SESSION_SECRET을 실제 랜덤 값으로 교체 (필수)
#   openssl rand -hex 32 으로 생성

pnpm docker:up     # postgres + redis + mailhog
pnpm db:migrate    # Prisma 초기 마이그레이션
pnpm db:seed       # 초대 코드 40개 시드
```

## 일상 개발

```bash
pnpm dev            # web :3000 + game-server :3001
```

- **Web**: http://localhost:3000
- **Game server**: http://localhost:3001
- **MailHog UI**: http://localhost:8025

```bash
# 특정 앱만 실행
pnpm --filter @narintown/web dev
pnpm --filter @narintown/game-server dev
```

## 관리자 권한 부여

본인이 가입한 후, `AdminUser` 테이블에 직접 등록:

```bash
# 방법 A: Prisma Studio (GUI)
pnpm db:studio
# http://localhost:5555 에서 User 찾아 id 복사 → AdminUser 추가

# 방법 B: SQL
docker exec -it narintown-postgres psql -U narintown -d narintown -c \
  "INSERT INTO \"AdminUser\" (\"userId\") VALUES ('<user_id_here>');"
```

이후 사용자가 다시 로그인하면 `/admin` 라우트에 접근 가능.

## 매직링크 메일 확인

매직링크 발송 시 MailHog UI(http://localhost:8025)에서 즉시 확인.

`@navercorp.com` 헬스체크: [`decisions/0002-auth-magic-link.md`](decisions/0002-auth-magic-link.md) 참조.

## 빌드 / 검증

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

## 부하 테스트

40명 동시접속 시뮬레이션 (실제 봇 유저로 DB 자동 생성됨):

```bash
pnpm dev   # game-server와 인프라가 떠있어야 함

# 다른 터미널에서
pnpm load-test       # 기본: 40 봇 × 60초
# 또는 인자 지정:
pnpm --filter @narintown/game-server run load-test 40 120
```

출력 예시:
```
[load-test] target=http://localhost:3001, count=40, duration=60s
[load-test] all bots connected, running…
===== Results =====
bots:          40
duration:      60s
inputs sent:   1200 (avg 30.0/bot)
ticks recv:    47800 (avg 1195.0/bot)
avg interval:  50.2ms (expected ~50ms)
chats recv:    8
```

- `avg interval`이 50ms 근처면 tick 루프 건강
- 봇 유저는 `bot-{i}@narintown.local` 이메일로 DB에 남음. 정리하려면 SQL `DELETE FROM "User" WHERE email LIKE 'bot-%'`

## Docker 이미지 빌드 (운영용)

```bash
# 모노레포 루트에서 빌드
docker build -f apps/web/Dockerfile -t narintown-web .
docker build -f apps/game-server/Dockerfile -t narintown-game-server .

# 실행 (예시 — 같은 .env 사용)
docker run --env-file .env -p 3000:3000 narintown-web
docker run --env-file .env -p 3001:3001 narintown-game-server
```

운영 환경에서는 `.env` 대신 환경변수를 직접 주입하거나 secret manager 사용 권장.

## 운영 환경변수 가이드

| 변수 | 로컬 | 운영 |
|---|---|---|
| `SESSION_SECRET` | 32+ hex random | 32+ hex random, 시크릿 매니저로 |
| `DATABASE_URL` | `postgresql://narintown:narintown@localhost:5432/narintown` | 운영 PG URL (SSL 필수) |
| `REDIS_URL` | `redis://localhost:6379` | 운영 Redis URL (TLS 권장) |
| `GAME_SERVER_PORT` | `3001` | `3001` 또는 컨테이너 내부 |
| `GAME_SERVER_ORIGIN` | `http://localhost:3000` | web 운영 도메인 (CORS) |
| `GAME_SERVER_URL` | `http://localhost:3001` | game-server 운영 도메인 (web SSR fetch) |
| `NEXT_PUBLIC_GAME_SERVER_URL` | `http://localhost:3001` | game-server 운영 도메인 (브라우저 Socket.IO) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | MailHog | 운영 SMTP (예: 사내 릴레이, Resend) |
| `SMTP_FROM` | `NarinTown <noreply@narintown.local>` | 운영 발신 도메인 (SPF/DKIM 설정 필수) |
| `MAGIC_LINK_TTL_MINUTES` | `15` | 운영도 15분 권장 |
| `INVITE_CODE_REQUIRED` | `true` | `true` 권장 |

`@navercorp.com` 발송 가능성 검증: 본 운영 시 외부 SMTP 사용 시 SPF/DKIM 설정 필수. 사내 SMTP 릴레이가 가용하면 그쪽이 가장 안정적. 자세히는 [`decisions/0002-auth-magic-link.md`](decisions/0002-auth-magic-link.md).

## 트러블슈팅

| 증상 | 확인 |
|---|---|
| 매직링크 메일 안 옴 | `pnpm docker:up`으로 MailHog 떠 있는지, 8025 UI 확인 |
| DB 연결 실패 | `pnpm docker:up`, `.env`의 `DATABASE_URL` |
| Socket.IO 연결 안 됨 | CORS 설정, `GAME_SERVER_ORIGIN` |
| Prisma client 못 찾음 | `pnpm db:generate` |
| `SESSION_SECRET must be at least 16 chars` | `.env`의 시크릿 32+ 문자 랜덤으로 |
| game-server에서 `Environment variable not found: DATABASE_URL` | 모노레포 root `.env` 사용 — `pnpm db:migrate` 처럼 root 스크립트 사용 권장 (dotenv-cli로 주입) |
| `invite_code_exhausted` 로그인 안 됨 | 같은 이메일의 기존 사용자면 OK. 새 이메일은 새 invite code 필요 (`/admin`에서 발급) |
