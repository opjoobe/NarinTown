# ADR 0001 — 기술 스택 선택

- **상태**: Accepted
- **작성일**: 2026-05-16
- **결정자**: 초기 플래닝 세션 (joobe)

## 배경

게더타운형 2D 가상 오피스. 동시접속 40명, 처음부터 고도화된 구조, 로컬 개발 우선, Docker 기반 배포 가능 형태. 멤버 한 명(joobe)이 주도하는 사내 이벤트 도구.

## 결정

| 영역 | 선택 |
|---|---|
| Frontend 프레임워크 | Next.js 15 (App Router) + TypeScript |
| 게임 엔진 | Phaser 3 |
| UI 스타일링 | Tailwind CSS |
| 상태 관리 | Zustand |
| Backend HTTP | Fastify |
| Realtime | Socket.IO + @socket.io/redis-adapter |
| ORM | Prisma |
| DB | PostgreSQL |
| 캐시/Pub-Sub | Redis |
| 메일 | Nodemailer (로컬: MailHog, 운영: 환경변수로 교체) |
| 모노레포 | pnpm workspace |
| 컨테이너 | Docker Compose + Multi-stage Dockerfile |

## 대안과 트레이드오프

### Frontend: Next.js vs Vanilla React + Vite
- **Next.js 채택**: App Router의 서버 컴포넌트로 인증/대시보드 페이지 단순화. SEO 필요 없지만 풀스택 라우팅·API Routes 활용도 높음
- 대안: Vite + React Router — 가볍지만 인증·세션 코드 자체 구현해야 함

### 게임 엔진: Phaser vs PixiJS vs Canvas 직접
- **Phaser 채택**: 타일맵·스프라이트·충돌·씬 관리 등 게임에 필요한 기능이 빌트인. 게더타운류와 가장 결이 맞음
- 대안: PixiJS — 더 가볍지만 게임 시스템(씬/충돌)을 직접 만들어야 함. 학습 비용 vs 구현 비용 트레이드오프

### Realtime: Socket.IO vs raw WebSocket vs Colyseus
- **Socket.IO 채택**: 자동 재연결·룸·바이너리 등 게임에 필요한 기능 풍부. Redis adapter로 수평 확장 옵션 명확
- 대안 1: raw WebSocket — 메시지 포맷·재연결 직접 구현. 40명 규모엔 오버킬
- 대안 2: Colyseus — 멀티플레이어 전용 권위서버 프레임워크. 강력하지만 학습 곡선이 가팔라 시간 비용

### HTTP: Fastify vs Express
- **Fastify 채택**: Express보다 빠르고 스키마 기반 검증·플러그인 시스템이 깔끔
- Express도 가능했으나 신규 프로젝트에 Fastify 선택할 합리적 이유 충분

### Auth: 매직링크 vs OAuth vs 닉네임만
- **매직링크 + 초대코드 채택**: 별도 비밀번호 없이 간편, 그러나 본인 메일 소유 검증 가능. 행사 운영에 적합
- 자세한 결정 근거는 [`0002-auth-magic-link.md`](0002-auth-magic-link.md)

## 결과 (예상되는 영향)

- **장점**: TypeScript 전 스택 통일, 모노레포 공유 타입(이벤트 페이로드), 처음부터 수평 확장 가능 구조
- **부담**: 모노레포 구성·도커 빌드 초기 설정 비용. 단일 노드면 굳이 Redis adapter 없어도 되나, 처음부터 두면 코드 변경 없이 노드 추가 가능
- **검증 필요**: Next.js 안에서 Phaser 다이내믹 임포트·SSR 비활성 처리. 일반적으로 통용되는 패턴이지만 정착 필요

## 관련 문서

- [기술 스택 학습 자료](../tech-reference/) — 사용 기술별 입문/리뷰 자료
- [아키텍처](../architecture.md) — 컴포넌트 관계·데이터 흐름
