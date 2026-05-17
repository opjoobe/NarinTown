# ADR 0006 — 케이크 컷씬을 Next 페이지로 구현

- **상태**: Accepted
- **작성일**: 2026-05-17 (Phase 5 구현 중)

## 배경

플랜에서는 "Phaser 별도 씬(`OnboardingCelebrationScene`)으로 처리"라고 적혀있음.
실제 구현 단계에서, 케이크 컷씬에 필요한 것은:
- 정적 일러스트(이모지/이미지)와 텍스트
- 단순 페이드인/페이드아웃 애니메이션
- 5초 후 자동 페이지 전환

Phaser는 게임 캔버스용 — 컷씬을 위해 Phaser game 인스턴스를 한 번 더 만드는 건 과한 비용.

## 결정

**별도 Next.js 페이지 `/onboarding/celebration` 으로 구현.**

- Server component (`page.tsx`): `cookies()`로 nickname 가져와 client component에 전달
- Client component (`CelebrationClient.tsx`): React state + Tailwind transition으로 단계별 페이드인
- 5초 후 `router.replace('/play')`로 자동 이동

## 대안

- **Phaser 씬**: 플랜 원안. 게임 자체에 컷씬 시스템이 있다면 자연스럽지만, 본 MVP는 게임 화면에 들어가기 전 단계라 React가 더 가벼움
- **Modal in /play**: /play에 컷씬을 띄우고 끝나면 닫기. 페이지 전환 없어 부드럽지만, 게임 캔버스 로딩과 컷씬이 겹쳐 첫 인상이 산만해짐

## 결과

- 5초간 정적 케이크 + 아바타(이모지) + Level-Up 텍스트 시퀀스
- 케이크: 🎂 + 🕯️ → 💨 (촛불 꺼지는 단순 전환)
- "2nd Anniversary" + "{닉네임}님, 3년차로 Level-Up을 축하합니다! 🎉"
- 자동 `/play` 이동

## 향후 개선 여지

- 실제 일러스트 이미지로 교체 (현재는 이모지)
- 사운드 효과 추가 (생일 축하 짧은 음원)

## 관련 문서

- 코드: [`apps/web/app/onboarding/celebration/`](../../apps/web/app/onboarding/celebration/)
