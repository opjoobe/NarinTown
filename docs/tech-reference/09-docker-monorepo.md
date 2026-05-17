# 09 — Docker / Monorepo

## 한 줄 요약
컨테이너로 일관된 실행 환경을 보장. 모노레포(pnpm workspace)로 여러 앱·라이브러리를 한 저장소에서 관리.

## 왜 존재하는가
- "내 컴퓨터에선 되는데..." 문제 → 컨테이너가 OS·런타임을 픽스
- 여러 앱(web, game-server)이 공유 타입을 쓰면 패키지 매니저 관리가 복잡 → 모노레포로 한 곳에서

## Docker 핵심 개념
- **이미지**: 변경 불가능한 파일 시스템 + 명령 묶음
- **컨테이너**: 이미지의 실행 인스턴스
- **Dockerfile**: 이미지 빌드 레시피
- **Multi-stage build**: 빌드 단계와 런타임 단계 분리 → 최종 이미지 가벼움
- **BuildKit**: 캐시·병렬 빌드. `DOCKER_BUILDKIT=1`
- **Docker Compose**: 여러 컨테이너 한 번에 (Postgres + Redis + 앱)

## 모노레포 (pnpm workspace) 핵심
- 한 루트에 `pnpm-workspace.yaml`로 패키지 묶음 선언
- `apps/web`, `apps/game-server`, `packages/shared` 등이 모두 한 저장소
- 내부 패키지 참조: `import { ... } from '@narintown/shared'` — 심볼릭 링크로 직접 연결
- `pnpm -r` (recursive)로 모든 패키지에 명령 실행
- `pnpm --filter <pkg>`로 특정 패키지만 대상

## 대안과 트레이드오프
- **npm workspaces / yarn workspaces**: 비슷. pnpm은 디스크 효율(content-addressable store)·속도 우위
- **Lerna**: 오래된 모노레포 도구. Nx로 흡수
- **Nx / Turborepo**: 빌드 캐싱·태스크 그래프 강력. 본 규모엔 과도
- **멀티 레포**: 각 앱별 저장소. 공유 코드 패키징·릴리스 비용 큼

## NarinTown 활용
- 로컬: `pnpm docker:up`으로 Postgres + Redis + MailHog 띄움
- 앱: 로컬 `pnpm dev`로 직접 실행 (개발 속도)
- 운영용: `apps/web/Dockerfile`, `apps/game-server/Dockerfile` 멀티스테이지
- 공유 타입: `packages/shared` → 두 앱 모두 빌드 시 함께 컴파일

## 추가 학습
- Docker 공식: https://docs.docker.com/
- Multi-stage best practices: https://docs.docker.com/build/building/multi-stage/
- pnpm workspaces: https://pnpm.io/workspaces
- Monorepo 비교: https://monorepo.tools/
