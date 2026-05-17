# Architecture

## 시스템 다이어그램

```
┌─────────────────────┐         ┌──────────────────────┐
│  Next.js (web)      │  HTTP   │  Fastify API         │
│  - 인증/프로필 UI    │ ──────▶ │  - 매직링크/세션      │
│  - Phaser 캔버스     │         │  - 프로필/리더보드 CRUD │
│  - Socket.IO client │ ──┐     └──────────┬───────────┘
└─────────────────────┘   │                │
                          │ WSS            │ SQL
                          ▼                ▼
                ┌─────────────────┐  ┌──────────────┐
                │  game-server    │  │  PostgreSQL  │
                │  Socket.IO + IO │  │  (Prisma)    │
                │  - 권위 상태 루프 │  └──────────────┘
                │  - 충돌/AOI 처리 │
                │  - 퀴즈 매칭     │
                └────────┬────────┘
                         │ Pub/Sub + 캐시
                         ▼
                  ┌────────────┐
                  │   Redis    │
                  └────────────┘
```

## 핵심 설계 원칙

1. **서버 권위(authoritative)**: 클라이언트는 입력 인텐트만 보내고 위치는 서버가 결정·브로드캐스트. 치팅과 일관성 문제 차단.
2. **Tick 기반 동기화**: 20Hz(50ms)로 위치 스냅샷 브로드캐스트. AOI(시야 반경)에 들어온 사용자만 전송.
3. **이벤트 권한 분리**: 클라→서버 / 서버→클라 / 서버 브로드캐스트 이벤트를 명확히 구분 (자세한 명세는 `realtime-protocol.md`).
4. **재접속 복원**: 클라가 토큰으로 재연결 → 서버가 마지막 위치/점수/도전 기록 복원.

## 컴포넌트별 역할

### apps/web (Next.js + Phaser)
- 페이지: `/login`, `/onboarding`, `/play`, `/dashboard`, `/admin`
- Phaser 게임 캔버스는 `/play`에서 다이내믹 임포트 (SSR 비활성)
- Socket.IO 클라이언트로 game-server에 연결, 인증 토큰 전달

### apps/game-server (Fastify + Socket.IO)
- HTTP API: 인증, 프로필, 리더보드 등 동기 요청
- Socket.IO 핸들러: 이동 입력, 위치 브로드캐스트, 퀴즈 페어 매칭
- Redis adapter로 수평 확장 대비
- Prisma로 PostgreSQL 접근

### packages/shared
- Socket 이벤트 페이로드 타입, DTO, 상수
- 클라/서버 양쪽에서 import

## 데이터 흐름 예시: 사용자 이동

```
[브라우저] WASD 키 입력
   │ player:input { dir: 'right', t: 12345 }
   ▼
[game-server tick (20Hz)]
   1. 입력 큐 처리 → x++
   2. 충돌 검사 (벽/가구)
   3. AOI 계산 (각 사용자의 시야 ±400px)
   4. 페어 매칭 후보 평가 (퀴즈 트리거)
   │ state:tick { players: [{ id, x, y, dir, status }, ...] }
   ▼
[모든 클라 (각 AOI에 맞게)]
   캐릭터 위치 보간(interpolation) 렌더
```

## 확장성

- **40명 → 단일 노드 충분**: tick 처리 CPU 1~3%, 메모리 4KB+소켓
- **500~1000명까지**: 단일 노드 한계
- **그 이상**: Redis adapter 활용한 다중 노드. 본 구조는 처음부터 호환
- **다중 맵 확장**: `TODO.md` 1번 항목 참조

자세한 부하 분석은 [`plans/`](plans/)의 최신 플랜 문서 "동시접속 40명 처리 — 서버 부담 분석" 섹션 참조.
