# 04 — Socket.IO / WebSocket

## 한 줄 요약
실시간 양방향 통신 라이브러리. raw WebSocket 위에 룸·재연결·폴백 등 게임에 필요한 기능을 얹음.

## 왜 존재하는가
- HTTP는 클라가 요청해야 서버가 응답 — 서버가 자발적으로 푸시 불가
- WebSocket이 표준이지만 raw API는 너무 저수준 (재연결·이벤트 라우팅·룸 등 직접 구현)
- Socket.IO가 그 갭을 메움

## 핵심 개념
- **WebSocket**: HTTP 핸드셰이크(Upgrade 헤더)로 시작 → TCP 위 양방향 프레임 통신
- **이벤트 모델**: `socket.on('event', handler)`, `socket.emit('event', data)`
- **Room**: 여러 소켓을 묶어 한 번에 broadcast. NarinTown에선 맵/룸 단위
- **Namespace**: 논리적 분리. `/admin`, `/game` 등
- **자동 재연결 + 폴링 폴백**: 네트워크 끊김·WS 차단 환경 자동 회복
- **Acknowledgement (ack)**: `socket.emit('event', data, callback)` — 응답 수신 확인

## 대안과 트레이드오프
- **raw WebSocket / `ws` 라이브러리**: 가볍고 빠름, 직접 구현 비용. 40명 규모엔 오버킬
- **SSE (Server-Sent Events)**: 서버→클라만, 단방향. 채팅엔 부적합
- **Long polling**: HTTP 기반 폴백, Socket.IO가 자동으로 함
- **µWebSockets.js**: 극한 성능. 학습 자료·생태계는 Socket.IO가 우위

## NarinTown 활용
- 게임 서버에 Fastify와 같은 HTTP 위에 마운트
- 클라는 Next.js의 `/play` 페이지에서 연결, `auth: { token }`으로 핸드셰이크
- 이벤트: `player:input`, `state:tick`, `quiz:prompt`, `chat:global` 등 ([Realtime Protocol](../realtime-protocol.md))
- Redis Adapter로 멀티 노드 지원

## 추가 학습
- 공식 문서: https://socket.io/docs/v4/
- WebSocket 표준 (MDN): https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- Cheat sheet: https://socket.io/docs/v4/emit-cheatsheet/
