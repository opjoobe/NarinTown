# 01 — Next.js / React

## 한 줄 요약
React 기반 풀스택 프레임워크. NarinTown의 인증·프로필·대시보드 UI 담당.

## 왜 존재하는가
- React 단독은 라우팅·SSR·번들링·서버 사이드 데이터 페칭 등이 없음
- Next.js가 이걸 통합 제공 → 풀스택 앱을 한 곳에서

## 핵심 개념
- **App Router** (Next 13+): `app/` 디렉토리 기반 파일 라우팅
- **Server Component** (기본): 서버에서 렌더, 브라우저 JS 없음. 인증·DB 접근에 적합
- **Client Component** (`'use client'`): 브라우저에서 실행, 상태/이벤트/Phaser 같은 브라우저 API 사용
- **Route Handlers** (`route.ts`): API 엔드포인트 만들 때
- **Dynamic Import** (`next/dynamic`): Phaser 같은 클라전용 라이브러리 SSR 비활성화

## 대안과 트레이드오프
- **Vite + React Router**: 가볍지만 인증·SSR·API를 직접 조합
- **Remix**: 비슷한 풀스택, 폼 중심 철학
- **Astro**: 정적 사이트 우선, 멀티프레임워크
- Next는 학습 자료·생태계 가장 풍부

## NarinTown 활용
- `/login`, `/onboarding`, `/dashboard`, `/admin`: Server Component로 인증·DB 접근
- `/play`: Phaser 캔버스 — `next/dynamic({ ssr: false })`로 클라전용 로드
- Route Handlers: 매직링크 검증, 프로필 CRUD
- 세션은 `cookies()`로 HTTP only 쿠키 접근

## 추가 학습
- 공식 문서: https://nextjs.org/docs/app
- Server vs Client Components: https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns
- Dynamic import: https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading
