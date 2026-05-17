# 07 — Authoritative Server Model

## 한 줄 요약
멀티플레이어 게임에서 "진실(state)"을 서버가 소유하는 모델. 클라는 입력만 보내고, 결과는 서버 판정.

## 왜 존재하는가
- 클라가 위치를 보고하면 → 치팅 (벽 통과, 순간이동 등)
- 같은 시간에 두 클라가 서로 다른 상태를 보면 → 일관성 깨짐
- 한 자원(예: 퀴즈 매칭)에 동시 접근하면 → race condition

서버가 권위를 가지면 위 세 가지 문제를 한 번에 해결.

## 핵심 개념
- **Input intent**: 클라 → 서버에 "이동하고 싶다" 같은 의도만 송신
- **Server tick**: 서버는 일정 주기(예: 20Hz)로 입력 처리·시뮬레이션·브로드캐스트
- **State snapshot**: 서버 → 클라에 "현재 상태는 이렇다" 송신
- **Interpolation**: 클라가 받은 snapshot 사이를 부드럽게 렌더
- **Client prediction** (선택): 클라가 미리 자기 입력 결과를 예측·렌더, 서버 응답 받으면 보정 (lag 감추기)
- **Server reconciliation**: 예측이 빗나가면 서버 권위로 강제 보정

## 대안과 트레이드오프
- **Client authoritative**: 클라가 위치 계산. 단순, 응답 빠름, 치팅 가능
- **Lockstep**: 모든 클라가 같은 시뮬, 입력만 동기화. 격투/RTS류
- **Hybrid**: 위치는 클라, 점수는 서버. 일부 차이만 강제

## NarinTown 활용
- 클라 이벤트: `player:input { dir }` — 의도만
- 서버 tick(20Hz): 입력 큐 처리 → 충돌 → AOI → 브로드캐스트
- 클라: `state:tick { players }` 수신 → 위치 보간
- 본 MVP는 client prediction 없음 (50ms 지연이면 무리 없음, 차후 추가 가능)
- 자세히: [`decisions/0003-server-authoritative.md`](../decisions/0003-server-authoritative.md)

## 추가 학습
- Gabriel Gambetta — "Fast-Paced Multiplayer" 시리즈: https://www.gabrielgambetta.com/client-server-game-architecture.html
- Valve — Source Multiplayer Networking: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- "Building a Multiplayer Game Server" (Colyseus 블로그): https://blog.colyseus.io/
