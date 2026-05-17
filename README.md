# NarinTown

게더타운형 2D 가상 오피스. 네이버 1784 사옥 분위기, 40명 동시접속, OX 퀴즈 미션 기반 인터랙션.

> 본 프로젝트는 입사 2주년 → 3년차 진입 축하 사내 이벤트 컨텍스트로 제작.

## 빠른 시작

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수 준비
cp .env.example .env

# 3. 인프라 띄우기 (Postgres, Redis, MailHog)
pnpm docker:up

# 4. DB 마이그레이션
pnpm db:migrate

# 5. 개발 서버
pnpm dev
```

- Web: http://localhost:3000
- Game server: http://localhost:3001
- MailHog (이메일 미리보기): http://localhost:8025

## 모노레포 구조

```
apps/
  web/            Next.js 15 + Phaser 3 (게임 캔버스 + 인증/대시보드 UI)
  game-server/    Fastify + Socket.IO + Prisma (권위 서버, 실시간 게임 루프)
packages/
  shared/         Socket 이벤트 페이로드 등 공유 타입
docs/             모든 설계 문서 (플랜, ADR, Q&A, 기술 참고)
```

## 문서

핵심 진입점:

- **[docs/plans/](docs/plans/)** — 플랜 버전 누적 (가장 최신본부터 보기)
- **[docs/decisions/](docs/decisions/)** — 아키텍처 의사결정 기록 (ADR)
- **[docs/qna/](docs/qna/)** — 플래닝 세션 Q&A 로그
- **[docs/tech-reference/](docs/tech-reference/)** — 사용 기술별 CS 학습 자료
- **[docs/architecture.md](docs/architecture.md)** — 시스템 다이어그램
- **[docs/data-model.md](docs/data-model.md)** — Prisma 스키마 해설
- **[docs/realtime-protocol.md](docs/realtime-protocol.md)** — Socket.IO 이벤트 명세
- **[docs/runbook.md](docs/runbook.md)** — 로컬 실행/배포 가이드
- **[docs/TODO.md](docs/TODO.md)** — 미래 작업 (다중 맵 등)

## 핵심 결정 요약

| 항목 | 결정 |
|---|---|
| 동시접속 | 40명 (서버 권위 모델, Socket.IO + Redis adapter) |
| 인증 | 초대 코드 + 이메일 매직링크 (@navercorp.com 검증 필요) |
| 게임 메커니즘 | 근접 시 OX 퀴즈 자동 팝업, 상대별 1회, 15초 제한 |
| 점수 | 정답 +10, 콤보 보너스(+5/+10/+15) |
| 스킬 | 자기소개 명함 텍스트 (게임 능력치 효과 없음) |
| WebRTC | 미구현 |
| 배포 | Docker Compose (로컬) + Multi-stage Dockerfile |
