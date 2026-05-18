# 02 — Phaser 3 / 게임 루프

## 한 줄 요약
2D 게임 엔진. Canvas/WebGL을 추상화해 스프라이트·타일맵·물리·씬을 게임 친화적 API로 제공.

## 왜 존재하는가
- 게임은 매 프레임 상태 갱신·렌더링을 반복하는 **루프(loop)** 구조 — 일반 React/DOM 패턴과 결이 다름
- 충돌·애니메이션·카메라·타일맵을 직접 구현은 비용 큼
- Phaser는 이걸 다 빌트인

## 핵심 개념
- **Game**: 최상위 인스턴스, Canvas 컨텍스트 보유
- **Scene**: 화면 단위 (예: 로딩, 메인, 컷씬). 동시 활성 가능
- **GameObject**: 스프라이트·텍스트·그래픽 등 화면에 그릴 단위
- **Game Loop**:
  - `preload()`: 에셋 로드
  - `create()`: 초기 GameObject 배치
  - `update(time, delta)`: 매 프레임 호출, 게임 로직
- **Tilemap**: Tiled 에디터의 `.tmj` JSON 로드, 충돌 레이어 지정
- **Tween / Animation**: 시간 기반 보간, 스프라이트 시트 프레임

## 대안과 트레이드오프
- **PixiJS**: 더 가벼움, 렌더만 담당. 게임 시스템 직접 구현
- **Three.js**: 3D 강력하지만 2D엔 오버킬
- **Canvas API 직접**: 학습엔 좋지만 프로덕션엔 비용 큼

## NarinTown 활용
- `OfficeScene`: 메인 게임 씬. 타일맵·캐릭터·이동·충돌
- `OnboardingCelebrationScene`: 5초 케이크 컷씬
- 다이내믹 임포트로 Next 페이지에서 로드 (`next/dynamic({ ssr: false })`)
- 서버 권위라 클라는 보간(interpolation)만, 위치 계산은 하지 않음

## 추가 학습
- 공식 문서: https://newdocs.phaser.io/docs/3.85.0
- 예제: https://phaser.io/examples
- Tiled 에디터: https://www.mapeditor.org/
- Phaser + Next.js 통합: 공식 템플릿 https://github.com/phaserjs/template-nextjs
