# ADR 0005 — OX 퀴즈 매칭/콤보 구현 세부 사항

- **상태**: Accepted
- **작성일**: 2026-05-17 (Phase 4 구현 중)

## 배경

플랜과 ADR 0004에서 OX 퀴즈의 정책(상대별 1회, 15초, 비대칭 처리)을 정의했음.
구현 단계에서 세부 결정이 필요했음.

## 결정

### 1. Initiator(유발자) 판정 — `lastMovedAt` 비교
- 각 `ServerPlayer`에 `lastMovedAt: number` 추가, tick 루프에서 실제로 위치가 변할 때만 갱신
- 페어 발생 시 두 사용자의 `lastMovedAt`을 비교, **±100ms 이내면 둘 다 initiator로 간주**
- 잠든/끊긴 사용자는 움직이지 않으므로 `lastMovedAt`이 0 또는 과거 → 거의 항상 active 사용자가 initiator
- 다른 후보(거리 변화량 비교 등)는 더 정확하지만 코드 복잡도가 크고 본 게임 규모(40명)에서 차이 없음

### 2. 페어 매칭 트리거 — tick 루프 끝 부분
- tick 루프에서 위치 갱신 → AOI 브로드캐스트 → 그 후 `scanForPairs(io)` 호출
- O(N²) 단순 비교. 40명 = 1,600쌍, 모두 거리 절댓값 비교 후 PROXIMITY_DISTANCE_PX 이내면 페어 후보
- 5초 쿨다운(`cooldowns` Map), 이미 도전한 페어 (`recordedAttempts` Set), 활성 페어(`activePairs` Map) 모두 메모리

### 3. 이미 도전한 페어 캐시
- 서버 부팅 시 한 번 `prisma.attempt.findMany`로 `recordedAttempts` Set 채움
- 새 Attempt 생성 시마다 추가
- DB 유니크 제약(`@@unique([challengerId, targetId])`)은 최종 방어선

### 4. 점수/콤보 갱신 — Score upsert
- 트랜잭션 없이 `prisma.score.upsert` 한 번으로 처리
- `bestStreak = max(oldBest, newStreak)`은 코드에서 계산해 명시적 set
- 동시에 두 퀴즈가 끝나는 race는 본 규모에서 발생 빈도 낮아 허용. 영향 시 마지막 쓰기가 이김

### 5. Leaderboard broadcast 빈도
- 모든 점수 변동마다 `broadcastLeaderboard(io)` 호출 (DB 조회 + io.emit)
- 변동이 잦으면 부담될 수 있으나 Top 5 fetch 자체가 가벼움 (인덱스 활용)
- 향후 throttle(250ms 디바운스) 검토 가능

## 대안

- **클라이언트가 페어 트리거 자체 판단**: 위치 자체가 서버 권위라 클라엔 데이터 충분하지만, 양쪽 동시 트리거 시 race condition. 서버 트리거가 일관성 면에서 유리
- **PostgreSQL LISTEN/NOTIFY로 leaderboard pub-sub**: 멀티 노드 환경에선 깔끔하지만 본 MVP는 단일 노드라 io.emit이 충분

## 결과

- 40명 규모에서 tick 안에 모든 페어 검사/매칭이 1ms 이내 처리
- 잠든 사용자에게도 모달이 가지만 응답 없으면 기회 유지 (의도된 동작)

## 관련 문서

- 플랜: [`plans/plan-2026-05-16-08-10-initial.md`](../plans/plan-2026-05-16-08-10-initial.md) "퀴즈 매칭" 섹션
- ADR 0004: [상대별 1회 + 비대칭 페어링](0004-quiz-once-per-pair.md)
- 코드: [`apps/game-server/src/realtime/quiz.ts`](../../apps/game-server/src/realtime/quiz.ts)
