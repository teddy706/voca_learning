# 사용자 스토리 — 단어콕(가칭)

상태 표기: `[ ]` 미착수 / `[~]` 진행 중 / `[x]` 완료 / `[보류]` 이번 Phase 스코프 제외.

---

## 에픽 1. 사진 등록 & OCR — [보류] 이번 Phase 제외 (2026-09-14)

능률보카 중등기본 DAY 01~50 CSV(에픽 6)로 등록을 대신하기로 해서, 이 에픽 전체를 이번 Phase에서 뺐다. 학원이 다른 책으로 바뀌거나 사진으로만 얻을 수 있는 새 단어장이 생기면 재검토 — 그때 필요한 Azure Blob Storage/Document Intelligence 리소스는 이미 만들어져 있음([PRD.md](PRD.md) 4.8).

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

## 에픽 2. 스펠링 점검 모드 (Phase 1, 2026-09-14 재설계·완료)

### US-2.0 복습(암기) 모드
- [x] 시험 도전 전에 채점 없이 한글→탭→영어 플래시카드로 훑어볼 수 있다. `vocab_attempts`에 기록 없음.
- 근거: [PRD.md](PRD.md) 4.9 / `ReviewSession.tsx`

### US-2.1 응답 방식(시험 유형) 선택
- [x] DAY 단어장 하나를 고르면 모드 허브(`/check/[batchId]`)에서 복습 또는 시험 도전(타이핑/4지선다/글자 배열) 중 고른다. 각 시험 유형별 누적 별 개수도 함께 보임.
- 근거: [PRD.md](PRD.md) 2장 스토리 5, 4.3, 4.9

### US-2.2 타이핑 응답 채점
- [x] 한글 단어를 순서대로 제시하고, 입력한 영어 스펠링을 서버가 trim + 대소문자 무시로 채점한다. 오답은 정답을 보여준 뒤 다음 단어로 넘어간다.
- 근거: [PRD.md](PRD.md) 2장 스토리 6, 4.3 / `CheckSession.tsx`

### US-2.3 보기 선택(4지선다) 응답 + 디스트랙터 생성
- [x] 한글 단어와 함께 정답 + 유사 스펠링 오답 3개(편집거리 기반 실제 유사 단어 우선, 부족하면 규칙 기반 합성)를 보기로 제시하고 탭으로 채점한다.
- 근거: [PRD.md](PRD.md) 2장 스토리 6, 4.3.1(디스트랙터 생성 로직) / `src/lib/distractors.ts`, `ChoiceSession.tsx`

### US-2.3b 글자 배열 응답 (신규, 2026-09-14)
- [x] 정답 스펠링을 섞은 글자 타일을 탭해서 순서대로 빈칸을 채운다. 공백 포함 단어("come from")는 공백을 고정 칸으로 둔다.
- 근거: [PRD.md](PRD.md) 4.9 / `ArrangeSession.tsx`

### US-2.4 정답 발음 듣기
- [ ] 제출 전후 모두 "🔊 발음 듣기"로 정답 발음을 들을 수 있다(`SpeakButton` 공통 컴포넌트) — 아직 미구현(Phase 1 남은 항목).
- 근거: [PRD.md](PRD.md) 2장 스토리 6, 4.6

### US-2.5 세션 요약 & 오답 다시보기
- [x] 세션 종료 시 정답/오답 개수 요약을 보여주고, 오답 목록을 별도로 다시 볼 수 있다(3개 시험 유형 공용 `SessionSummary.tsx`).
- 근거: [PRD.md](PRD.md) 2장 스토리 7

### US-2.6 시도 기록
- [x] 모든 제출(정답/오답, 입력값, 응답 방식, 시각)을 `vocab_attempts`에 기록한다(`/api/vocab-attempts`, 서버가 채점 authoritative).
- 근거: [PRD.md](PRD.md) 2장 스토리 8, 3장

### US-2.7 별 보상 (신규, 2026-09-14)
- [x] 시험 도전에서 오답 없이 만점을 받으면 별 1개, 반복해서 만점을 받을 때마다 계속 쌓인다(`vocab_stars`, `child_id`+`batch_id`+`mode`당 카운터, DB 영구 저장).
- 근거: [PRD.md](PRD.md) 4.9 / `SessionSummary.tsx`, `/api/vocab-stars`

### US-2.8 부모 계정 미리보기 (신규, 2026-09-14)
- [x] 부모가 PIN 없이 `/profiles`의 "점검 미리보기" 링크로 특정 자녀의 복습/시험 화면을 그대로 써볼 수 있다.
- 근거: [PRD.md](PRD.md) 4.9 / `src/lib/vocabAuth.ts`의 `resolveActingChild`

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

## 에픽 6. 기존 오디오 단어장 일괄 가져오기 — 사진 등록을 대신하는 이번 Phase의 실제 등록 경로

### US-6.1 오디오 STT 파싱
- [x] faster-whisper(medium)로 능률보카 중등기본 DAY_01~50 mp3 전체를 전사·파싱해 리뷰 CSV 생성 — 완료 (2026-09-14, `MP3_stt` 작업 디렉터리).
- 근거: [PRD.md](PRD.md) 4.7

### US-6.2 PDF 정답지 대조 검증
- [x] `compare_with_answer_key.py`로 PDF 답안지의 영어 표제어 집합과 리뷰 CSV를 대조해 누락/오류 자동 검출 — 전체 일치율 86.2%로 `MP3_stt/VOCAB_AUDIT_REPORT.md`에 기록됨. 완벽하지 않은 데이터라는 걸 인지하고 그대로 가져옴(9장 열린 질문 참고, 정확도 개선은 이 저장소 책임 밖).
- 근거: [PRD.md](PRD.md) 4.7 "핵심 업데이트"

### US-6.3 나머지 44개 파일 처리
- [x] DAY_07~50 오디오 파싱 완료 — 전체 50개 파일 리뷰 CSV 확보.
- 근거: [PRD.md](PRD.md) 9장 열린 질문

### US-6.4 Supabase upsert 스크립트
- [x] [`scripts/import_vocab_csv.py`](../scripts/import_vocab_csv.py) 작성 및 실행 완료 (2026-09-14, 이후 캐릭터 4명으로 확장) — `MP3_stt/voca_mp3/*_review.csv` 50개 파일을 읽어 이 family의 role=child 캐릭터 전원(고아린/황유니/아빠/정보라)에게 `vocab_batches`(status='confirmed')/`vocab_words`/`vocab_batch_items`로 upsert. 결과: 캐릭터당 고유 단어 876개, 배치 200개, batch_item 3504개. 하드코딩 목록 대신 family_id로 role=child를 동적 조회 — 재실행해도 안전(idempotent)하고 새 캐릭터도 자동 포함.
- 구현 메모: 원본 CSV 일부(DAY_10 등)에 (영어,한글) 완전 동일 중복 행이 남아있어 `ON CONFLICT` 에러가 났음 — 스크립트가 파싱 단계에서 완전 동일 쌍만 제거하도록 방어 처리함.
- 근거: [PRD.md](PRD.md) 4.7 흐름 4단계, 4.8
