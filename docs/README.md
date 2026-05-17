# NarinTown 문서

공동 작업자가 빠르게 컨텍스트를 잡을 수 있는 진입점.

## 한눈에 보기

- **무엇을 만드는가**: 게더타운형 2D 가상 오피스 (40명, 1784 컨셉, OX 퀴즈 미션)
- **핵심 결정**: [`plans/`](plans/) 최신본 → [`decisions/`](decisions/) ADR 순서대로
- **어떻게 돌리는가**: [`runbook.md`](runbook.md)
- **공부할 거리**: [`tech-reference/`](tech-reference/)

## 폴더 구조

| 폴더/파일 | 목적 |
|---|---|
| `plans/` | 플랜 버전 누적 (`plan-YYYY-MM-DD-HH-MM-라벨.md`) |
| `decisions/` | ADR — 의사결정 기록 (`NNNN-주제.md`) |
| `qna/` | 플래닝 세션 Q&A 로그 (`YYYY-MM-DD-HH-MM-주제.md`) |
| `tech-reference/` | 사용 기술별 CS 학습 자료 (입문/리뷰) |
| `architecture.md` | 시스템 다이어그램·데이터 흐름 |
| `data-model.md` | Prisma 스키마 해설 |
| `realtime-protocol.md` | Socket.IO 이벤트 명세 |
| `runbook.md` | 로컬 실행/배포 가이드 |
| `TODO.md` | 미래 작업 (다중 맵 등) |

## 문서화 규칙

- **파일명 시각**: `YYYY-MM-DD-HH-MM-제목.md` — 같은 날 여러 세션도 구분 가능
- **ADR 번호**: `0001`부터 단조 증가, 의사결정 단위
- **플랜은 여러 번 작성 가능**: 새 버전은 `plans/`에 신규 파일로 추가, 이전 파일은 삭제하지 않음
- **모든 디자인 결정**은 ADR 또는 Q&A 로그에 흔적을 남길 것
