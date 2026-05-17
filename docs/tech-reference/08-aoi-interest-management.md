# 08 — AOI (Area of Interest) / Interest Management

## 한 줄 요약
한 사용자에게 관련 있는 객체만 전송하는 기법. 모든 사용자에게 모든 상태를 보내면 비용 폭증 → 시야/거리 기반으로 필터링.

## 왜 존재하는가
- N명 사용자, 각자에게 N-1명 상태 송신 → O(N²) 트래픽
- 화면 밖 사용자 정보는 사실 불필요
- AOI로 평균 k명만 송신 → O(N×k)로 축소

## 핵심 개념
- **AOI**: 시야 반경. 게더타운류는 보통 화면 ±400~600px
- **Naive 비교**: 모든 쌍 거리 계산 — O(N²). 40명 정도면 OK
- **공간 분할 (Grid)**: 맵을 셀로 나눠 같은/인접 셀만 비교 — O(N×k)
- **Quadtree / R-tree**: 더 정교한 공간 인덱스. 대규모(수백+) 게임에 적합
- **Subscription model**: 클라가 "이 영역 관심 있어요" 구독, 서버가 영역 단위로 발행

## 대안과 트레이드오프
- AOI 없이 전체 브로드캐스트: 단순하지만 사용자 수 늘면 망함
- 너무 좁은 AOI: 캐릭터가 갑자기 나타남 (팝인)
- 너무 넓은 AOI: 트래픽 절약 효과 작음
- 일반적으로 화면 사이즈의 1.2~1.5배

## NarinTown 활용
- 40명 규모라 naive O(N²)도 무리 없음 (1600쌍 거리 계산은 마이크로초)
- 그래도 grid 기반 분할로 두면 100명까지도 확장 용이
- AOI 반경: 화면 폭의 1.3배 정도 (예상 화면 800px → AOI 1040px)
- `state:tick`에서 각 사용자별로 AOI 안의 player 목록만 보냄
- 채팅 근접(`chat:proximity`)도 AOI와 같은 반경 사용

## 추가 학습
- Glenn Fiedler — "Networked Physics" 시리즈
- "Massively Multiplayer Online Game Development" — Thor Alexander 책
- 게더타운 엔지니어링 블로그: https://www.gather.town/blog
