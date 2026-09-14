# 사용자 스토리 — 단어콕(가칭)

상태 표기: `[ ]` 미착수 / `[~]` 진행 중 / `[x]` 완료. 2026-09-14 기준 전부 미착수(Phase 0).

---

## 에픽 1. 사진 등록 & OCR

### US-1.1 사진 업로드
- [ ] 부모 또는 자녀(PIN 로그인 상태)가 학원 단어장을 카메라/갤러리로 촬영·업로드한다.
- 근거: [PRD.md](PRD.md) 2장 스토리 1, 4.5(카메라 캡처)

### US-1.2 OCR 자동 추출
- [ ] 업로드된 사진에서 Azure Document Intelligence로 한글-영어 단어쌍을 자동 추출해 목록으로 보여준다.
- 근거: [PRD.md](PRD.md) 2장 스토리 2, 4.2(OCR 파이프라인)

### US-1.3 추출 결과 확인/수정 + 발음 미리듣기
- [ ] 등록자가 추출된 각 항목을 수정/삭제/추가할 수 있고, 항목별 "🔊 발음 듣기"로 등록 전에 스펠링-발음 일치를 확인할 수 있다.
- 근거: [PRD.md](PRD.md) 2장 스토리 3, 4.6(발음 재생)

### US-1.4 배치 등록 (upsert)
- [ ] 확인이 끝난 단어 묶음을 해당 자녀 프로필의 `vocab_batches`/`vocab_words`/`vocab_batch_items`로 저장한다. 동일 단어(child_id+korean+english)는 자동 병합된다.
- 근거: [PRD.md](PRD.md) 2장 스토리 4, 3장(데이터 모델)

### US-1.5 부분 실패 복구
- [ ] Blob 업로드 성공 후 OCR이 실패하면 원본 재업로드 없이 재시도할 수 있다. OCR 성공 후 확인 화면 진입 전 저장이 끊기면 `pending_review` 상태로 서버에 남아 새로고침해도 결과가 유지된다.
- 근거: [PRD.md](PRD.md) 4.2.1

---

## 에픽 2. 스펠링 점검 모드 (Phase 1)

### US-2.1 응답 방식 선택
- [ ] 자녀가 점검 세션 시작 시 "타이핑" 또는 "보기 선택" 중 응답 방식을 고른다(기본값은 마지막 선택 기억).
- 근거: [PRD.md](PRD.md) 2장 스토리 5, 4.3

### US-2.2 타이핑 응답 채점
- [ ] 한글 단어를 순서대로 제시하고, 입력한 영어 스펠링을 trim + 대소문자 무시로 즉시 채점한다. 오답은 정답을 보여준 뒤 다음 단어로 넘어간다.
- 근거: [PRD.md](PRD.md) 2장 스토리 6, 4.3

### US-2.3 보기 선택(4지선다) 응답 + 디스트랙터 생성
- [ ] 한글 단어와 함께 정답 + 유사 스펠링 오답 3개(편집거리 기반 실제 유사 단어 우선, 부족하면 규칙 기반 합성)를 보기로 제시하고 탭으로 채점한다.
- 근거: [PRD.md](PRD.md) 2장 스토리 6, 4.3.1(디스트랙터 생성 로직)

### US-2.4 정답 발음 듣기
- [ ] 제출 전후 모두 "🔊 발음 듣기"로 정답 발음을 들을 수 있다(`SpeakButton` 공통 컴포넌트).
- 근거: [PRD.md](PRD.md) 2장 스토리 6, 4.6

### US-2.5 세션 요약 & 오답 다시보기
- [ ] 세션 종료 시 정답/오답 개수 요약을 보여주고, 오답 목록을 별도로 다시 볼 수 있다.
- 근거: [PRD.md](PRD.md) 2장 스토리 7

### US-2.6 시도 기록
- [ ] 모든 제출(정답/오답, 입력값, 응답 방식, 시각)을 `vocab_attempts`에 기록한다.
- 근거: [PRD.md](PRD.md) 2장 스토리 8, 3장

---

## 에픽 3. 인증/프로필 (자매 프로젝트 재사용)

### US-3.1 자녀 PIN 프로필 로그인 재사용
- [ ] 리딩버디의 부모 계정 + 자녀 PIN 프로필 인증을 코드/계정 모두 그대로 재사용한다(신규 가입 불필요).
- 구현: 리딩버디 `src/lib/supabase/{client,server,admin}.ts`, `src/middleware.ts`, `src/lib/childAuth.ts`, `src/lib/currentProfile.ts`, `src/app/api/auth/{login,logout}/route.ts`, `src/app/api/children/[id]/pin/route.ts`를 그대로 복사. `CHILD_AUTH_SECRET` 값과 `childProfileEmail()` 이메일 포맷은 절대 변경 금지(리딩버디와 달라지면 기존 자녀 계정 로그인 불가).
- 근거: [PRD.md](PRD.md) 4.1, 7장 / [ARCHITECTURE.md](ARCHITECTURE.md) 4장

### US-3.2 자녀 간 데이터 격리 (RLS)
- [ ] 자녀 PIN 세션은 자기 자신의 `child_id` 행만 쓰기 가능하다(쌍둥이 형제/자매 단어장 상호 침범 방지).
- 구현: 리딩버디 기존 헬퍼 함수 `public.my_family_id()`/`public.my_role()`/`public.my_profile_id()` 재사용(새로 안 만듦). `vocab_*` 4개 테이블 모두 `family_id` 컬럼 보유.
- 근거: [PRD.md](PRD.md) 4.1 RLS 정책 메모 / [ARCHITECTURE.md](ARCHITECTURE.md) 6장

---

## 에픽 4. 랜덤 단어 게임 (Phase 2)

### US-4.1 단어은행 누적
- [ ] 여러 날짜에 걸쳐 등록된 단어가 자녀별 단어은행(`vocab_words` 전체)으로 누적되고, 동일 단어는 자동 병합된다.
- 근거: [PRD.md](PRD.md) 2장 스토리 9

### US-4.2 가중 랜덤 출제
- [ ] 전체 단어은행 대상으로 무작위 출제하되, 최근 오답/오답 빈도가 높은 단어일수록 더 자주 나온다(간단 가중치 함수).
- 근거: [PRD.md](PRD.md) 2장 스토리 10~11, 4.4

### US-4.3 게임 모드에서도 점검 모드 UI 재사용
- [ ] 타이핑/보기 선택 응답 방식, 디스트랙터 생성, 발음 듣기를 점검 모드와 동일한 컴포넌트로 재사용한다. 결과도 `vocab_attempts(mode='game')`로 동일하게 기록된다.
- 근거: [PRD.md](PRD.md) 4.4

### US-4.4 누적 통계 표시
- [ ] 자녀별 누적 정답률, 연속 정답(streak) 등을 표시한다.
- 근거: [PRD.md](PRD.md) 2장 스토리 12

---

## 에픽 5. 반응형/PWA (Phase 1)

### US-5.1 아이폰 미니/아이패드 미니 반응형 레이아웃
- [ ] 375px 기준 1열 모바일 퍼스트, 768px 이상에서 2열 확장. 터치 타겟 44×44pt 이상.
- 근거: [PRD.md](PRD.md) 4.5

### US-5.2 PWA 설치 흐름 확인
- [ ] iOS Safari "홈 화면에 추가" 흐름을 두 기기 모두에서 확인(아이콘, 스플래시, standalone 상태바).
- 근거: [PRD.md](PRD.md) 4.5

---

## 에픽 6. 기존 오디오 단어장 일괄 가져오기 (1회성, `MP3_stt` 작업 디렉터리)

### US-6.1 오디오 STT 파싱
- [x] faster-whisper(medium)로 능률보카 중등기본 DAY_01~06 mp3를 전사·파싱해 리뷰 CSV 생성 — 완료 (2026-09-14).
- 근거: [PRD.md](PRD.md) 4.7

### US-6.2 PDF 정답지 대조 검증
- [x] `compare_with_answer_key.py`로 PDF 답안지의 영어 표제어 집합과 리뷰 CSV를 대조해 누락/오류 자동 검출 — DAY_01~06 완료.
- 근거: [PRD.md](PRD.md) 4.7 "핵심 업데이트"

### US-6.3 나머지 44개 파일 처리
- [ ] DAY_07~50 오디오 파싱 + (선택적) PDF 대조 검증.
- 근거: [PRD.md](PRD.md) 9장 열린 질문

### US-6.4 Supabase upsert 스크립트
- [ ] 검수 완료 CSV를 읽어 `vocab_batches`(status='confirmed')/`vocab_words`/`vocab_batch_items`로 upsert하는 로컬 스크립트 작성(이 저장소 `scripts/`).
- 근거: [PRD.md](PRD.md) 4.7 흐름 4단계
