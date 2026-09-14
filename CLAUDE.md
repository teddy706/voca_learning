# CLAUDE.md — 단어콕(가칭, 영단어 스펠링 암기 앱)

**Phase 0(착수 준비)은 사실상 끝났고, 지금은 Phase 1(앱 코드 작성) 진행 중입니다.** 단, **사진 촬영 → OCR 등록 경로는 이번 Phase에서 제외**(2026-09-14 사용자 결정, 아래 표 참고) — Blob/Document Intelligence 관련 API·UI는 지금 만들지 마세요. Phase 2, Phase 3도 이 시점에 손대지 마세요.

## 프로젝트 개요
초등 3학년 쌍둥이 자녀(고아린, 황유니)의 학원 영단어 시험 대비 암기 점검 앱. 원래는 학원 단어장을
사진으로 등록(OCR)하는 걸 목표로 했으나, 능률보카 중등기본(DAY 01~50) 단어를 이미 CSV로 정리해둔
상태라 이번 Phase는 그 CSV를 가져오는 것으로 등록을 대신한다. 한글→영어 스펠링 점검을 기존 수작업
대체가 핵심이고, 데이터는 누적되어 이후 랜덤 단어 게임에 쓰인다.

## 확정된 기술 결정 (재논의 불필요)
| 항목 | 결정 |
|---|---|
| 배포 형태 | PWA |
| 인증/DB | 리딩버디와 **동일 Supabase 프로젝트 공유**, `vocab_` 접두사 테이블 추가. 계정(부모/자녀 PIN)도 그대로 재사용 — 신규 가입 불필요 |
| 사진 저장소 | **Azure Blob Storage** (Supabase Storage 미사용) — Document Intelligence와 같은 클라우드라 Blob URL 직접 참조 |
| OCR/AI | Azure Document Intelligence |
| 타겟 디바이스 | 아이폰 미니 / 아이패드 미니 — 반응형(375px 기준 1열, 768px↑ 2열), 터치 타겟 44pt↑ |
| 단어 등록 권한 | 부모 + 자녀(PIN) 모두 가능 — RLS는 자기 child_id만 쓰기 가능하도록 스코프 |
| 발음 재생 | Web Speech API(브라우저 내장) 우선, 음질 문제 시에만 Azure TTS 캐싱으로 전환 |
| 응답 방식 | 타이핑 입력 + 유사 스펠링 객관식 선택, 두 방식 모두 지원(세션 시작 시 선택) |
| 개발 도구 | Claude Code |
| **단어 등록 경로 (이번 Phase)** | **사진 촬영 → OCR 등록은 이번 Phase에서 제외.** 능률보카 중등기본 DAY 01~50 단어를 CSV로 이미 정리해뒀고(`MP3_stt/voca_mp3/*_review.csv`), `scripts/import_vocab_csv.py`로 Supabase에 일괄 가져오기 완료(2026-09-14). 학원이 다른 책으로 바뀌거나 새 단어장이 사진으로만 생기면 그때 OCR 경로를 다시 검토 — Blob Storage/Document Intelligence 리소스는 이미 만들어져 있으니 재검토는 코드 작성만 하면 됨 |
| 기존 mp3 단어장 가져오기 | 이 저장소가 아니라 별도 작업 디렉터리 `/Users/gwanghee/Documents/110_Github/MP3_stt`에서 진행 — 완성된 CSV만 이 저장소로 가져와 upsert |

> **재검토 중이 아닌 이상 위 표는 그대로 믿고 진행.**

## Phase 0 체크리스트 (착수 준비, Phase 1 시작 전 완료할 것)
- [x] 리딩버디/twin-choice Supabase 무료 슬롯 확인 → 2/2 소진 확인, 리딩버디 프로젝트 공유로 결정 (2026-09-14)
- [x] `docs/{PRD,BRIEF,STORIES,ARCHITECTURE}.md` + 이 파일 스캐폴딩 (2026-09-14)
- [x] 리딩버디 CLAUDE.md/인증 코드를 먼저 읽고 재사용 가능한 부분 목록화 (2026-09-14) — 결과는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 4장·6장, 요약은 바로 아래 섹션
- [x] `supabase/migrations/0001_vocab_schema.sql`~`0003_vocab_grants.sql` 작성 완료 (2026-09-14). **0001/0002는 사용자가 리딩버디 Supabase SQL Editor에서 실행 완료(2026-09-14, 에러 없음)** — `vocab_words`/`vocab_batches`/`vocab_batch_items`/`vocab_attempts` 테이블 + RLS 정책 적용됨. `0003_vocab_grants.sql`은 아직 미실행 — 앱 코드에서 실제 쿼리 시 `permission denied`가 나면 그때 실행(Phase 1 코드 작성 단계에서 확인)
- [x] 리딩버디 `.env.local`에서 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `CHILD_AUTH_SECRET`을 그대로 복사해 `.env.local` 생성 완료 (2026-09-14). `AZURE_DOCUMENT_INTELLIGENCE_*`도 리딩버디 리소스를 우선 재사용하도록 반영. `AZURE_STORAGE_*`(Blob)는 아직 빈 값 — 컨테이너 생성 후 채울 것
- [x] Azure Blob Storage 계정/컨테이너 생성 완료 (2026-09-14) — 계정 `vocakokphotos`, 컨테이너 `vocab-photos`(비공개, public access off), `RG-reading-buddy`/Korea Central, Standard_LRS/Hot. 값은 `.env.local`에 반영됨. **SAS 토큰 발급 API는 아직 미구현**(Phase 1 코드 작성 단계, 2번 항목)
- [x] **CSV 일괄 가져오기 완료 (2026-09-14)** — `scripts/import_vocab_csv.py`로 `MP3_stt/voca_mp3/*_review.csv`(능률보카 중등기본 DAY 01~50) 전체를 두 자녀 모두에게 등록. 결과: 자녀당 고유 단어 876개, `vocab_batches` 100개(50일×2명), `vocab_batch_items` 1752개. 재실행해도 안전(이미 있는 배치는 건너뜀). `permission denied` 없이 service_role 기본 권한으로 바로 됨 — `0003_vocab_grants.sql`은 결국 불필요했음(그래도 안전장치로 남겨둠)
- [보류] 학원 단어장 사진 1~2장으로 Document Intelligence 모델(`prebuilt-layout` vs `prebuilt-read`) 선택 테스트 — **이번 Phase에서 제외**(위 "단어 등록 경로" 표 참고). 학원이 다른 책으로 바뀌거나 사진으로만 얻을 수 있는 단어장이 생기면 재검토

### 실제 계정 정보 (2026-09-14 확인 — 테스트/시딩 데이터와 혼동 주의)
리딩버디 공유 Supabase 프로젝트의 `profiles` 테이블에는 개발 중 만들어진 테스트 데이터도 섞여 있다(다른 family의 "민준", 같은 family인데 role이 잘못 들어간 "아빠", 그리고 "정보라" 등 — 실제 자녀인지 불확실). **이 앱이 다루는 실제 자녀는 아래 둘뿐이다**:
- `family_id = d60d0acc-88b4-41ce-940b-b2f9fe375932`
- 자녀 고아린 (`id = 62f98c6a-2b80-4bb2-bb09-e2c6c3f223e2`), 황유니 (`id = 8e0cd81f-47d9-42ff-8b08-f80aae9bef93`)
새 스크립트나 시드 데이터를 만들 때 이 ID를 하드코딩할 경우, "정보라"/"아빠" 같은 다른 프로필에 실수로 데이터를 넣지 않도록 항상 이 목록과 대조할 것.

### 리딩버디에서 확인한 재사용 자산 (2026-09-14 코드 확인 완료)
아래 파일은 **재작성하지 않고 그대로 복사**해 온다 (자세한 표는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 4장):
`src/lib/supabase/{client,server,admin}.ts`, `src/middleware.ts`, `src/lib/childAuth.ts`, `src/lib/currentProfile.ts`, `src/app/api/auth/{login,logout}/route.ts`, `src/app/api/children/[id]/pin/route.ts`.
이미 존재하는 DB 자산(새로 안 만듦): `families`/`profiles` 테이블, RLS 헬퍼 함수 `public.my_family_id()`/`public.my_role()`/`public.my_profile_id()`(`0002_functions_triggers.sql`).
OCR은 `src/lib/documentIntelligence.ts`의 `analyzeImage()` REST 폴링 패턴을 포팅(단, `prebuilt-layout` 지원은 아직 없어 필요 시 추가).

## Phase 1 진행 순서
번호 순서대로 진행. 앞 번호가 안 끝났으면 뒷 번호에 먼저 손대지 말 것. **사진 업로드/OCR 관련 항목은 이번 Phase 스코프에서 빠졌다** — 등록은 이미 `scripts/import_vocab_csv.py`로 끝났으므로, Phase 1의 남은 일은 "이미 등록된 단어로 점검하는 기능"부터다.
- [x] 1. 리딩버디 Supabase 프로젝트에 vocab_ 스키마 추가 (vocab_words/batches/batch_items/attempts, answer_mode 포함) — 완료, 위 Phase 0 체크리스트 참고
- [x] 1.5. CSV 일괄 가져오기로 단어 등록 완료 (사진 OCR 등록의 대체 경로) — 완료, 위 참고
- [x] 1.7. **Next.js 앱 스캐폴딩 완료 (2026-09-14)** — 아래 "앱 스캐폴딩 현황" 참고
- [x] 2. 점검 모드 — 타이핑 응답 — **사용자 확인 완료(2026-09-14)**, 아래 "점검 모드 전면 재설계" 참고
- [x] 3. 점검 모드 — 보기 선택 응답(4지선다) — 완료, 디스트랙터 로직은 PRD 4.3.1 그대로 구현
- [x] 4. 자녀 PIN 프로필 로그인 연동(리딩버디 계정 그대로 재사용) — **사용자가 실제 계정으로 로그인→프로필 선택→PIN→홈 화면(단어 개수 표시)까지 확인 완료(2026-09-14)**
- [ ] 5. 공통 `SpeakButton`(Web Speech API 발음 재생) 컴포넌트 + 점검 화면 적용
- [ ] 6. 아이폰 미니/아이패드 미니 실기기에서 반응형 레이아웃·PWA 설치 확인(카메라 테스트는 제외 — 사진 등록 없음)
- [x] 7. (추가 항목) 복습(암기) 모드 + 글자 배열 시험 유형 + 별 보상 — 2026-09-14 사용자 요청으로 범위 추가, 아래 참고
- [x] 8. (추가 항목) 부모 계정으로 자녀 화면 미리보기(PIN 없이) — 2026-09-14 사용자 요청

### 점검 모드 전면 재설계 (2026-09-14)
최초엔 타이핑 응답만 만들었으나, 사용자가 실제로 써본 뒤 아래처럼 요구사항을 구체화해서 전면 재구성했다:
- **DAY 선택 → 모드 허브** (`/check/[batchId]`): "복습하기" 카드 + 시험 도전 3종(⭐ 누적 개수 표시) 카드로 구성.
- **복습(암기) 모드** (`/check/[batchId]/review`, `ReviewSession`): 한글 카드를 탭하면 영어로 뒤집힌다. 채점 없음 — `vocab_attempts`에 아무것도 기록하지 않는 순수 암기용.
- **시험 도전 3종** (`/check/[batchId]/{typing,choice,arrange}`):
  1. **타이핑**(`CheckSession`) — 기존 그대로.
  2. **4지선다**(`ChoiceSession` + `src/lib/distractors.ts`) — PRD 4.3.1 그대로 구현: 편집거리(Levenshtein) 1~2인 실제 유사 단어 우선, 부족하면 인접 글자 교환/한 글자 삭제/흔한 혼동 철자 치환으로 합성. 유닛 테스트(`distractors.test.ts`) 포함.
  3. **글자 배열**(`ArrangeSession`) — 정답 스펠링을 섞은 글자 타일을 순서대로 탭해서 빈칸을 채운다(사용자가 "글자 타일 드래그/탭" 선택). 구동사 등 공백 포함 단어("come from")는 공백을 고정 칸으로 두고 글자만 타일로 만든다.
  - 세 유형 모두 채점은 서버(`/api/vocab-attempts`)가 authoritative. 결과 화면은 공용 `SessionSummary` 컴포넌트.
- **별(⭐) 보상**: 한 세션에서 오답 없이 만점을 받으면 별 1개, 반복해서 만점 받으면 계속 누적(`vocab_stars` 테이블, `child_id`+`batch_id`+`mode`당 카운터, `POST /api/vocab-stars`). 새 마이그레이션 `0004_vocab_arrange_mode.sql`(`vocab_attempts.answer_mode`에 `'arrange'` 추가), `0005_vocab_stars.sql` — **사용자가 SQL Editor에서 실행 완료, 실제 insert로 재검증까지 마침(2026-09-14)**.

### 부모 계정으로 자녀 화면 미리보기 (2026-09-14)
사용자가 "아빠 계정으로도 테스트할 수 있게" 요청 — PIN 없이 부모 계정으로 특정 자녀의 점검 화면을 그대로 써볼 수 있게 했다.
- `src/lib/vocabAuth.ts`의 `resolveActingChild(childId)`가 핵심: 요청자가 그 자녀 본인이거나, 같은 가족의 부모면 통과시킨다(리딩버디의 "부모는 가족 전체 대신 조회/수정 가능" 패턴 확장 — RLS의 `my_role()='parent'` 조건과 그대로 대응).
- `/check`, `/check/[batchId]`, 그리고 `/api/vocab-attempts`·`/api/vocab-stars`가 전부 이 함수로 권한을 확인하도록 바뀜(기존 `requireChildProfile()`/`requireChildProfileForApi()` 직접 호출은 이 경로에서는 더 안 씀 — 로그인 여부 확인만 `requireProfile()`로 유지).
- `/profiles`의 자녀 카드 아래에 "점검 미리보기" 링크 추가 → `/check?childId={id}`로 바로 진입.
- ⚠️ 이후 이 앱에 자녀 전용 라우트를 새로 추가할 때는 `requireChildProfile()`을 그대로 쓸지, `resolveActingChild` 패턴으로 부모 접근도 허용할지 매번 판단할 것 — 기본값은 후자(부모도 볼 수 있게) 쪽으로 통일하는 게 일관적이다.

### 앱 스캐폴딩 현황 (2026-09-14)
Next.js 14.2.35(App Router) + TS + Tailwind로 초기화, `npm install`/`npm run build`/`npx tsc --noEmit` 전부 통과 확인. 만든 것:
- **인프라**: `package.json`(리딩버디와 동일 핵심 의존성), `tsconfig.json`/`next.config.mjs`/`tailwind.config.ts`(자체 accent 컬러 `#4C6EF5`)/`postcss.config.mjs`/`.eslintrc.json`/`vitest.config.mts`/`vercel.json`(`regions: ["icn1"]`)/`.claude/launch.json`(dev 서버 프리뷰용)
- **인증(리딩버디에서 그대로 복사, 4장 표 그대로)**: `src/lib/supabase/{client,server,admin}.ts`, `src/middleware.ts`, `src/lib/childAuth.ts`(diff 없음 확인), `src/lib/currentProfile.ts`, `src/app/api/auth/{login,logout}/route.ts`, `src/app/api/children/[id]/pin/route.ts`
- **UI 컴포넌트(리딩버디 패턴 포팅, 사진 아바타 등 불필요한 부분은 단순화)**: `Avatar`(emoji만), `LogoutButton`, `PinKeypad`/`PinConfirmButton`/`PinDots`, `PinEntry`. `globals.css`의 `app-shell`/`card`/`input`/`btn*`/`profile-card` 컴포넌트 클래스도 색상만 바꿔 그대로 포팅(PRD 4.5 반응형/터치타겟 요건을 이미 만족하는 검증된 패턴)
- **페이지**: `/`(role별 리다이렉트) → `/login`(부모 로그인) → `/profiles`(자녀 선택) → `/profiles/[id]/pin`(PIN) → `/home`(자녀 홈, `vocab_words`/`vocab_batches` 개수를 실제로 조회해 보여줌 — DB 연결까지 검증됨)
- **브라우저 확인**: `/login` 페이지 렌더링 확인(스타일 정상 적용). **부모 실제 로그인·PIN 입력은 비밀번호/PIN을 에이전트가 모르므로 테스트 못 함 — 사용자가 직접 `npm run dev` 후 `http://localhost:3000`에서 로그인→프로필 선택→PIN 입력→홈까지 확인 필요**
- **미완성/TODO**: `public/manifest.json`의 `icons: []`(아이콘 세트 없음, 리딩버디도 초기엔 이랬음 — 나중에 채울 것)

점검 모드 상세는 위 "점검 모드 전면 재설계"·"부모 계정으로 자녀 화면 미리보기" 절 참고.

### 보류 (이번 Phase 제외, 필요해지면 재검토)
- 사진 업로드(Blob) + Azure OCR 연동
- OCR 결과 확인/수정 UI
- 배치 등록(upsert) 확인 UI — CSV 가져오기는 스크립트로 이미 끝냈으므로 앱 안에 등록 UI가 당장 필요 없음

## 데이터 모델
전체 SQL은 [docs/PRD.md](docs/PRD.md) 3장 참고. 핵심: `vocab_words`(캐논, child_id+korean+english 유니크) / `vocab_batches`(등록 배치) / `vocab_batch_items`(N:M) / `vocab_attempts`(mode: check/game, answer_mode: **typing/choice/arrange** — `arrange`는 0004에서 추가) / `vocab_stars`(child_id+batch_id+mode당 누적 별 개수, 0005에서 추가). 전 테이블 `family_id`를 직접 보관(리딩버디 기존 테이블과 동일 패턴, RLS를 `my_family_id()` 한 줄로 단순화하기 위함).

## Supabase/Azure 셋업 중 발견한 함정
리딩버디에서 이 프로젝트에도 재발 가능성이 높은 것만 미리 옮겨둠 (전체 목록은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 12장):
- `SUPABASE_SERVICE_ROLE_KEY`는 반드시 legacy JWT 형식(`sb_secret_...` 새 형식 아님) — 아니면 admin 클라이언트의 PostgREST 호출이 전부 `permission denied`.
- 이 프로젝트는 "Automatically expose new tables"가 꺼진 프로젝트에 새 테이블을 추가하는 것인데, **실제로 겪어보니 문제없었다**(0001~0005 전부 GRANT 정상, `0003_vocab_grants.sql` 실행 불필요했음) — 그래도 새 `vocab_*` 마이그레이션을 또 추가하면 한 번은 select로 확인해볼 것.
- 자녀 로그인은 `CHILD_AUTH_SECRET`/`childProfileEmail()`이 리딩버디와 정확히 일치해야 동작 (위 참고).
- **`npm run dev`가 떠 있을 때 `npm run build`를 돌리면 `.next` 캐시가 깨져서 dev 서버가 500 에러를 낸다**(2026-09-14 두 번 겪음) — 코드 검증은 `tsc --noEmit`/`vitest run`/`next lint`로 하고, `npm run build`는 dev 서버를 멈춘 뒤에만 실행할 것. 이미 걸렸다면 dev 프로세스 종료 → `.next` 삭제 → `npm run dev` 재시작 + 브라우저 강제 새로고침.
(그 외 새로 겪는 함정은 실제로 발생하는 대로 이어서 채운다)

## 참고 문서
- [docs/PRD.md](docs/PRD.md) / [docs/BRIEF.md](docs/BRIEF.md) / [docs/STORIES.md](docs/STORIES.md) / [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/NEW_APP_TOKEN_EFFICIENCY_GUIDE.md](docs/NEW_APP_TOKEN_EFFICIENCY_GUIDE.md) — 세션 운영 메타 가이드
- 자매 프로젝트: `../reading-buddy/CLAUDE.md`, `../twin_choice/CLAUDE.md`
- 1회성 오디오 가져오기 작업: `/Users/gwanghee/Documents/110_Github/MP3_stt` (별도 저장소/디렉터리)

## 코딩 시 주의사항
1. OCR 파싱 실패/부분 실패는 조용히 삼키지 말고 항상 console.error로 로그를 남길 것.
2. 이 프로젝트는 리딩버디와 **같은 Supabase 프로젝트**를 쓰므로, 마이그레이션은 리딩버디 기존 테이블에 영향 없는지 반드시 확인 후 SQL Editor에서 실행할 것.
3. 새 API 라우트를 만들기 전에 리딩버디에 비슷한 패턴(PIN 인증)이 있는지 먼저 확인.
4. `speechSynthesis.speak()`는 반드시 버튼 클릭 핸들러 내부에서 직접 호출할 것(iOS Safari 자동재생 제한).
5. 자녀 PIN 세션의 RLS는 자기 자신의 child_id만 쓰기 가능한지 새 마이그레이션마다 재확인(쌍둥이 간 데이터 침범 방지, 리딩버디 데이터와도 침범 없는지 함께 확인).
6. 사진 URL은 절대 클라이언트에 영구 공개 URL로 노출하지 말 것 — 항상 서버에서 짧은 만료시간의 SAS 토큰을 발급해서 전달.
