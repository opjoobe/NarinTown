# 06 — Prisma / PostgreSQL

## 한 줄 요약
TypeScript-first ORM. 스키마 파일 한 곳에서 DB 구조·타입·마이그레이션 관리.

## 왜 존재하는가
- 손으로 SQL은 타입 안 맞아 런타임 오류 자주 발생
- TypeORM·Sequelize는 클래스 기반, 데코레이터 복잡
- Prisma는 별도 DSL(`schema.prisma`)로 한 곳에 모델 정의 → 클라이언트·타입·마이그 모두 자동 생성

## 핵심 개념
- **schema.prisma**: 모델·관계·인덱스·DB 연결 정의
- **`prisma generate`**: 스키마에서 TS 클라이언트(`@prisma/client`) 자동 생성
- **`prisma migrate dev`**: 스키마 변경 → SQL 마이그 파일 생성 + 적용
- **`prisma migrate deploy`**: 운영 환경에 마이그 적용 (자동 생성은 안 함)
- **유니크 제약**: `@unique`, `@@unique([a, b])` — DB 레벨 무결성 강제
- **트랜잭션**: `prisma.$transaction([...])`

## PostgreSQL 핵심
- ACID, 관계형, 강력한 타입 시스템
- 동시성: MVCC — reader가 writer를 차단하지 않음
- 인덱스: B-tree, GIN, GIST 등. compound index 가능

## 대안과 트레이드오프
- **Drizzle ORM**: 더 SQL스러움, 가벼움. 마이그·DX는 Prisma가 성숙
- **TypeORM**: 클래스 데코레이터 기반. 자유롭지만 일관성 약함
- **Kysely**: 타입 안전 쿼리 빌더, ORM은 아님
- **raw SQL + Postgres.js**: 학습엔 좋지만 타입 매핑 직접

## NarinTown 활용
- 9개 모델: `User`, `Profile`, `Quiz`, `Attempt`, `Score`, `LastPosition`, `InviteCode`, `MagicLink`, `AdminUser`
- 핵심: `Attempt.@@unique([challengerId, targetId])` — 상대별 1회 도전 DB 강제
- 로컬: Docker로 PostgreSQL 15
- 마이그 파일은 `apps/game-server/prisma/migrations/`에 커밋

## 추가 학습
- Prisma 공식: https://www.prisma.io/docs
- PostgreSQL 튜토리얼: https://www.postgresqltutorial.com/
- 인덱스 가이드: https://use-the-index-luke.com/
