# Data Model

Prisma 스키마는 [`apps/game-server/prisma/schema.prisma`](../apps/game-server/prisma/schema.prisma) 정본. 본 문서는 의도와 설계 결정을 해설.

## 엔티티 개요

| 엔티티 | 역할 | 핵심 제약 |
|---|---|---|
| `User` | 계정 본체 | `email` 유일, `nickname` 유일 |
| `Profile` | 자기소개 스킬·바이오 | `User`와 1:1 |
| `Quiz` | 사용자가 등록한 OX 퀴즈 1개 | `User`와 1:1 |
| `Attempt` | 도전 시도 기록 | `(challengerId, targetId)` 유니크 → 상대별 1회 정책 강제 |
| `Score` | 누적 점수·콤보 | `User`와 1:1, 정렬 인덱스 후보 |
| `LastPosition` | 마지막 위치 영속 저장 | 5초 디바운스로 저장 |
| `InviteCode` | 입장 초대코드 | `usedBy=null`이면 미사용 |
| `MagicLink` | 일회용 인증 토큰 | TTL 15분, `consumedAt`으로 재사용 차단 |
| `AdminUser` | 관리자 권한 부여 | `User.id` 참조 |

## 핵심 제약 설계

### `Attempt.@@unique([challengerId, targetId])`
**상대별 1회 도전 정책을 DB 레벨에서 강제**. 클라/서버 로직에 결함이 있어도 중복 도전 레코드가 만들어지지 않음.

- `challengerId` = 퀴즈를 푸는 사람 (도전자)
- `targetId` = 퀴즈 주인
- 양방향 매칭이라 한 페어가 만나면 두 개의 `Attempt`가 생성됨 (A→B, B→A 각각)
- `guess: null`은 기권/타임아웃 케이스, `forfeited: true` 플래그로 UI 구분

### `Score` 정렬
리더보드 정렬은 `points DESC, correctCount DESC, bestStreak DESC` 순. Postgres에서 compound index 검토.

## 위치 영속화 — 디바운스 패턴

- 사용자 이동 시마다 DB 쓰면 초당 수십~수백 회 (40명 × 60Hz × 분포) → 부담
- **메모리에만 즉시 반영, DB는 5초 디바운스 + 연결 종료 시 즉시 flush**
- 구현: 메모리 상태에 dirty flag → 타이머 또는 `setInterval`로 모아 쓰기

## 마이그레이션 정책

- 로컬 개발은 `prisma migrate dev` 사용 (자동 마이그 파일 생성)
- 운영 배포는 `prisma migrate deploy` 사용
- 마이그 파일은 `apps/game-server/prisma/migrations/`에 커밋
