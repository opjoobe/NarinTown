# Realtime Protocol (Socket.IO Events)

권위 모델 기반. 클라는 입력 인텐트만 보내고, 위치/매칭 결정은 모두 서버.

이벤트 페이로드 타입은 [`packages/shared/src/events.ts`](../packages/shared/src/events.ts) 정본.

## 연결 / 인증

| 이벤트 | 방향 | 페이로드 | 비고 |
|---|---|---|---|
| `connection` | C→S | `auth: { token }` 핸드셰이크 | 세션 쿠키에서 추출한 토큰 |
| `room:join` | S→C | `{ self, players, mapId, mapData }` | 입장 응답 |
| `room:transfer` | S→C | `{ mapId }` | (Future) 다중 맵 전환 |

## 이동

| 이벤트 | 방향 | 페이로드 | 비고 |
|---|---|---|---|
| `player:input` | C→S | `{ dir: 'up'\|'down'\|'left'\|'right'\|'stop', t: number }` | rate-limit 60Hz |
| `state:tick` | S→C 브로드캐스트 | `{ players: [{ id, x, y, dir, status }], t }` | 20Hz, AOI 필터링 |

`status`: `'active' | 'sleeping' | 'disconnected'`

## 퀴즈

| 이벤트 | 방향 | 페이로드 | 비고 |
|---|---|---|---|
| `quiz:prompt` | S→C | `{ pairId, partnerId, partnerNickname, question, timeLimit: 15 }` | 양쪽에 동시 송신 |
| `quiz:answer` | C→S | `{ pairId, guess: boolean }` | 15초 내 |
| `quiz:resolve` | S→C | `{ pairId, result: 'correct'\|'wrong'\|'forfeited', score, combo }` | 본인 결과 |

### 15초 타임아웃 처리
- 유발자(이동해서 접근한 쪽): 미응답 → 기권 처리 (`Attempt(guess=null, forfeited=true)`, 점수 0, 콤보 리셋)
- 잠든/끊긴 대상: 미응답 → `Attempt` 미생성, 기회 유지

자세한 매칭 로직은 [`plans/`](plans/) 최신 플랜 "퀴즈 매칭 (근접 자동 팝업)" 섹션 참조.

## 채팅

| 이벤트 | 방향 | 페이로드 | 비고 |
|---|---|---|---|
| `chat:global` | C→S, S→C 브로드캐스트 | `{ from, text, t }` | Redis Stream에 최근 200개 보존 |
| `chat:proximity` | C→S, S→C AOI 브로드캐스트 | `{ from, text, t }` | 휘발성 |

## 점수 / 랭킹

| 이벤트 | 방향 | 페이로드 | 비고 |
|---|---|---|---|
| `score:update` | S→C 브로드캐스트 | `{ userId, points, currentStreak, bestStreak }` | 점수 변동 시 |
| `leaderboard:update` | S→C 브로드캐스트 | `{ top5: [...] }` | Top 5 변동 시 |

## 에러 / 시스템

| 이벤트 | 방향 | 페이로드 |
|---|---|---|
| `system:error` | S→C | `{ code, message }` |
| `system:kick` | S→C | `{ reason }` |
