# ADR 0002 — 인증: 초대 코드 + 이메일 매직링크

- **상태**: Accepted (구현 전 헬스체크 필수)
- **작성일**: 2026-05-16
- **결정자**: 초기 플래닝 세션 (joobe)

## 배경

40명 지인/사내 그룹용 폐쇄형 가상 오피스. 누구나 가입할 수 있는 공개 서비스가 아님. 따라서:
- 별도 회원가입 폼·비밀번호 관리는 과한 비용
- OAuth 도입은 빠르지만 사내 환경에서 추가 설정 필요
- 게스트 + 닉네임만은 무단 입장 위험 + 동일인 식별 불가

## 결정

**초대 코드 + 이메일 매직링크** 조합 채택.

### 흐름
1. 관리자가 `/admin`에서 초대 코드 발급
2. 사용자가 `/login` 페이지에서 초대 코드 + 이메일 입력
3. 매직링크 발송 (`MagicLink` 토큰 생성, TTL 15분)
4. 메일에서 링크 클릭 → 토큰 검증 → 세션 발급
5. 미가입자라면 `/onboarding`으로 리다이렉트 (닉네임·아바타·스킬·OX 퀴즈)

### 데이터 모델
- `InviteCode { code, usedBy, expiresAt, createdBy }`
- `MagicLink { token, email, expiresAt, consumedAt }`
- 토큰 일회용 (`consumedAt` 셋되면 재사용 차단)

## @navercorp.com 이메일 도달 헬스체크 (Phase 0 필수)

매직링크 인증은 SMTP 발송이 핵심. 사내 이메일 도메인이 로컬 개발 환경에서 발송 가능한지 사전 검증 필수.

### 검증 시나리오

1. **로컬 (MailHog)**
   - 발송지 도메인 무관 — MailHog는 SMTP를 가로채 UI에 표시만 함
   - `joobe.lee@navercorp.com`을 To로 발송 → MailHog UI(`http://localhost:8025`)에서 도착 확인
   - 로컬 개발 단계는 이걸로 충분

2. **실제 메일박스 도달 (선택)**
   - 외부 SMTP(예: Gmail SMTP / Mailgun / Resend) 경유로 `joobe.lee@navercorp.com` 메일함에 도달하는지
   - **옵션 A**: 사내 SMTP 릴레이 사용 (방화벽/접근권한 확인 필요)
   - **옵션 B**: 외부 SMTP 사용 → 네이버 수신 측에서 스팸 분류·차단 여부 확인 (SPF/DKIM 미설정 시 거의 스팸)
   - **옵션 C**: 사내망 운영만 한다면 사내 SMTP 한 옵션으로 단순화

### Phase 0 체크리스트
- [ ] `joobe.lee@navercorp.com`으로 MailHog 테스트 메일 도착 확인
- [ ] 외부 SMTP 경유 시 `joobe.lee@navercorp.com` 실제 수신함 도착 확인
- [ ] 스팸 분류 여부 확인
- [ ] 결과를 본 문서 하단 "헬스체크 결과" 섹션에 기록

### 헬스체크 결과 (실제 테스트 후 채울 것)

| 시나리오 | 결과 | 비고 |
|---|---|---|
| 로컬 MailHog → @navercorp.com | (대기) | |
| 외부 SMTP → @navercorp.com 메일함 | (대기) | SPF/DKIM, 스팸 여부 |
| 사내 SMTP 릴레이 가용성 | (대기) | 접근권한·도메인 정책 |

### 헬스체크 실패 시 대안

위 검증이 모두 실패하면 다음 중 하나로 전환:
- **사내 SSO** (네이버 사내 계정 OAuth)
- **닉네임 + 초대 코드만** (이메일 검증 생략, 동일인 식별은 닉네임 유일성으로)
- **관리자가 직접 임시 비밀번호 발급**

## 결과

- **장점**: 비밀번호 부담 없음, 본인 메일 소유 검증, 사내 도메인이므로 익명 가입 차단
- **위험**: SMTP 인프라 의존. 헬스체크 통과가 전제. 미통과 시 인증 방식 재검토

## 관련 문서

- [Realtime Protocol](../realtime-protocol.md) — `auth` 핸드셰이크 토큰 전달
- [Data Model](../data-model.md) — `MagicLink`, `InviteCode` 모델
