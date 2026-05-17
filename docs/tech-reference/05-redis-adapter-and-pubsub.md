# 05 — Redis Adapter / Pub-Sub

## 한 줄 요약
여러 게임 서버 노드 간 Socket.IO 이벤트를 동기화. Redis Pub/Sub을 백본으로 사용.

## 왜 존재하는가
- 단일 노드: `socket.emit`이 같은 프로세스 안에서 라우팅 → 문제 없음
- 다중 노드: A 노드의 사용자가 B 노드의 사용자에게 이벤트 보내야 함 → 노드 간 다리 필요
- Redis Pub/Sub이 그 다리 역할

## 핵심 개념
- **Pub/Sub**: 발행자가 채널에 publish, 구독자가 subscribe — 메시지 큐의 가장 단순한 형태
- **Redis Adapter for Socket.IO**: `socket.emit`이 자동으로 Redis 채널에 발행 → 모든 노드가 구독해 자기 사용자에게 전달
- **TTL**: 키 만료 시간. 세션·캐시에 활용
- **Streams**: 순서·내구성 있는 메시지 큐 (Pub/Sub과 다름). 채팅 히스토리에 유용

## 대안과 트레이드오프
- **Sticky session**: 같은 사용자 항상 같은 노드. 적은 노드엔 가능하지만 룸/브로드캐스트 동기화는 별도 필요
- **NATS / Kafka**: 더 강력하지만 무거움. 본 규모에 과도
- **PostgreSQL LISTEN/NOTIFY**: 가능하지만 부하 한계
- Redis가 표준적·가벼움·빠름

## NarinTown 활용
- 40명 단일 노드라 처음엔 필요 없음
- 그러나 **처음부터 Redis Adapter를 두면** 노드 추가가 코드 변경 없이 가능
- 무중단 배포 시에도 유용 (구버전·신버전 노드가 동시 운영 가능)
- 채팅 히스토리: Redis Streams `XADD/XRANGE`로 최근 200개 보존
- 실시간 위치 캐시: 메모리 + Redis 미러

## 추가 학습
- Redis 공식: https://redis.io/docs/
- Socket.IO Redis Adapter: https://socket.io/docs/v4/redis-adapter/
- Streams 가이드: https://redis.io/docs/data-types/streams/
