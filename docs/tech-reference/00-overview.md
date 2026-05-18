# Tech Reference — Overview

NarinTown에서 사용한 기술마다 "개발자가 알아두면 좋을 기본 정보 + 본 프로젝트에서의 활용 방식"을 정리한 학습용 문서 모음.

> 새로운 멤버 온보딩 + 본인 CS 학습용. 구현 진행하며 점진적으로 채워나간다.

## 문서 공통 구조

```
1. 한 줄 요약
2. 왜 존재하는가 (해결하는 문제)
3. 핵심 개념 / 작동 원리
4. 대안과 트레이드오프
5. NarinTown에서의 활용 포인트
6. 추가 학습 링크
```

## 문서 목록

| 번호 | 주제 | 무엇을 배우나 |
|---|---|---|
| [01](01-nextjs-react.md) | Next.js / React | App Router, Server vs Client Component, 다이내믹 임포트, 세션 |
| [02](02-phaser-game-loop.md) | Phaser 3 / 게임 루프 | requestAnimationFrame, Scene, GameObject, 타일맵 |
| [03](03-fastify.md) | Fastify | 훅, 스키마 검증, 플러그인, vs Express |
| [04](04-socketio-and-websockets.md) | Socket.IO / WebSocket | 핸드셰이크, 룸, 폴백, 재연결, vs raw WS |
| [05](05-redis-adapter-and-pubsub.md) | Redis Adapter / Pub-Sub | 멀티 노드 이벤트 동기화, Streams |
| [06](06-prisma-postgresql.md) | Prisma / PostgreSQL | 마이그레이션, 트랜잭션, 유니크 제약 |
| [07](07-authoritative-server-model.md) | Authoritative Server Model | 권위 모델, lag compensation, 보간 |
| [08](08-aoi-interest-management.md) | AOI (Area of Interest) | 시야 기반 필터링, 공간 분할 |
| [09](09-docker-monorepo.md) | Docker / Monorepo | Multi-stage, BuildKit, pnpm workspace |

## 학습 순서 추천

- **풀스택 입문**: 01 → 03 → 06 → 04 → 02 → 09
- **게임/실시간 집중**: 04 → 07 → 08 → 02 → 05
- **인프라/배포**: 09 → 06 → 05 → 03

각 문서는 1~2페이지 분량으로 핵심만 정리하는 것이 목표. 본격적인 학습은 각 문서 하단의 외부 링크 활용.
