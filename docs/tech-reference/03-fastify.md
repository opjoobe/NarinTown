# 03 — Fastify

## 한 줄 요약
Node.js HTTP 프레임워크. Express보다 빠르고 스키마 기반 검증·플러그인 시스템을 표준화.

## 왜 존재하는가
- Express는 사실상 표준이지만 미들웨어 체인이 자유로워 일관성 떨어짐
- 검증·직렬화·플러그인이 표준화돼 있지 않음
- Fastify는 처음부터 성능·스키마·플러그인을 일관되게 설계

## 핵심 개념
- **Routes**: `fastify.get('/path', schema, handler)`. 스키마로 요청/응답 자동 검증·직렬화
- **Hooks**: 요청 생명주기 단계별 훅 (`onRequest`, `preHandler`, `onSend` 등). 미들웨어와 비슷하지만 단계 명확
- **Plugins**: 캡슐화된 기능 단위. `fastify.register(plugin, opts)`로 등록. 의존성 그래프
- **Schema-based validation**: JSON Schema로 요청/응답 정의 → 자동 검증·타입 생성

## 대안과 트레이드오프
- **Express**: 가장 널리 쓰임, 자료 풍부. 성능·표준화는 Fastify가 우위
- **Koa**: async 기반 미들웨어, 가볍지만 생태계 작음
- **Hapi**: 기능 풍부하지만 코드 무거움
- **NestJS**: OOP·DI 강력하지만 학습곡선 가팔

## NarinTown 활용
- 게임 서버의 HTTP 엔드포인트: 매직링크, 프로필, 리더보드
- Socket.IO와 같은 HTTP 인스턴스 위에 마운트
- 스키마로 매직링크 토큰·이메일 형식 검증
- 플러그인: `@fastify/cookie`, `@fastify/cors`

## 추가 학습
- 공식 문서: https://fastify.dev/docs/latest/
- Plugins guide: https://fastify.dev/docs/latest/Reference/Plugins/
- Express에서 마이그 가이드: https://fastify.dev/docs/latest/Guides/Migration-Guide-V4/
