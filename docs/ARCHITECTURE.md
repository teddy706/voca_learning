# 아키텍처 문서 — 단어콕(가칭)

> **주의**: 2026-09-14 앱 스캐폴딩(인증 배관)까지는 as-built로 갱신됨. 점검 모드 등 이후 기능은 아직 계획 단계 — 구현될 때마다 **코드가 진실이라는 원칙**에 따라 이 문서를 실제 구현에 맞춰 갱신할 것([NEW_APP_TOKEN_EFFICIENCY_GUIDE.md](NEW_APP_TOKEN_EFFICIENCY_GUIDE.md) 4장 원칙).

## 1. 개요

한글→영어 스펠링을 점검·게임 형태로 반복 학습시키는 PWA. 원래 구상은 학원 단어장 사진을 OCR로 등록하는 것이었지만, 실제 시험 범위가 시판 교재(능률보카 중등기본)와 같아서 **이번 Phase는 오디오+PDF 정답지로 이미 만들어둔 CSV를 가져오는 것으로 등록을 대신한다**(2026-09-14 결정, [PRD.md](PRD.md) 4.8). 사진 OCR 등록은 제거가 아니라 보류 — 인프라(Blob/Document Intelligence)는 이미 만들어져 있다. 인증/DB는 자매 프로젝트 리딩버디와 Supabase 프로젝트를 공유하고, 사진 저장/OCR은 Azure로 분리한다. 자세한 배경과 근거는 [PRD.md](PRD.md) 참고.

**현재(이번 Phase) 실제 데이터 흐름**:
```
MP3_stt/voca_mp3/*_review.csv (오디오 STT + PDF 정답지 대조로 이미 완성)
   │
   ▼
scripts/import_vocab_csv.py (이 저장소, 완료·2026-09-14)
   │
   ▼
[Supabase: vocab_words / vocab_batches(status=confirmed) / vocab_batch_items]
   │
   ▼
[점검 모드 / 랜덤 게임 모드] ──▶ [vocab_attempts 기록]
```

**보류 중인 흐름(사진 OCR 재도입 시)**:
```
[클라이언트 PWA]
   │  사진 업로드
   ▼
[Azure Blob Storage (비공개)] ──▶ [Azure Document Intelligence]
   │                                    │
   │                                    ▼
   │                          파싱된 (한글,영어) 쌍
   │                                    │
   └──────────────▶ [확인/수정 UI] ◀────┘
                          │ 확정
                          ▼
        [Supabase: vocab_words / vocab_batches / vocab_batch_items]
```

## 2. 기술 스택

리딩버디 `package.json`/설정 확인 완료(2026-09-14) — 아래 그대로 포팅한다.

| 레이어 | 결정 |
|---|---|
| 프레임워크 | Next.js 14.2.35 (App Router) + React 18 + TypeScript |
| 배포 | PWA, Vercel — `vercel.json`에 `{"regions": ["icn1"]}`(서울)로 고정. Supabase도 서울 리전이라 리전 불일치로 인한 지연을 처음부터 피함 |
| DB/인증 | Supabase (리딩버디 프로젝트 `reading-buddy`, `ap-northeast-2`, `@supabase/ssr` + `@supabase/supabase-js`) |
| 자녀 인증 보조 | `bcryptjs`(PIN 표시용 해시), `crypto`(HMAC 파생 비밀번호) — Node 내장/기존 의존성, 새로 추가할 패키지 없음 |
| 사진 저장 | Azure Blob Storage (신규) |
| OCR | Azure Document Intelligence — REST 직접 호출(SDK 미사용), `prebuilt-read` 모델 |
| 발음 재생 | Web Speech API (`SpeechSynthesisUtterance`), 업그레이드 시 Azure Speech TTS |
| 테스트 | Vitest ^2.1.9 (리딩버디/twin-choice 인프라 재사용) |
| PWA 매니페스트 | `public/manifest.json` + `public/icons/*`(192/512/maskable/apple-touch), `layout.tsx`의 `metadata.manifest`/`viewport` — 리딩버디와 동일 구조로 포팅 |

## 3. 디렉터리 구조 (2026-09-14, 앱 스캐폴딩 완료 — as-built)

```
voca_learning/
├── CLAUDE.md
├── .env.local              # 실제 값(gitignored) — Supabase/Azure 키
├── .env.local.example      # 커밋된 템플릿
├── .claude/launch.json     # dev 서버 프리뷰 설정
├── vercel.json             # regions: ["icn1"]
├── package.json / tsconfig.json / next.config.mjs / tailwind.config.ts / vitest.config.mts
├── docs/
│   ├── PRD.md / BRIEF.md / STORIES.md / ARCHITECTURE.md
│   └── NEW_APP_TOKEN_EFFICIENCY_GUIDE.md
├── scripts/
│   └── import_vocab_csv.py  # 완료 — CSV → Supabase 일괄 가져오기, 재실행 안전
├── supabase/migrations/
│   ├── 0001_vocab_schema.sql       # 적용 완료
│   ├── 0002_vocab_rls.sql          # 적용 완료
│   ├── 0003_vocab_grants.sql       # 안전장치, 미적용(불필요했음)
│   ├── 0004_vocab_arrange_mode.sql # 적용 완료 — answer_mode에 'arrange' 추가
│   ├── 0005_vocab_stars.sql        # 적용 완료 — vocab_stars 테이블
│   ├── 0006_vocab_word_marks.sql   # 적용 완료 — vocab_word_marks 테이블(복습 알아요/몰라요)
│   └── 0007_atomic_counters.sql    # 적용 완료 — record_pin_failure/increment_vocab_star 함수(11장)
├── voca_mp3/*_review.csv   # import_vocab_csv.py의 입력(mp3 원본은 gitignore)
├── test/stubs/server-only.ts
├── public/manifest.json    # 아이콘 세트 완료(accent 배경 + "ABC", 4장 참고)
└── src/
    ├── middleware.ts               # 리딩버디에서 diff 없이 그대로 복사
    ├── lib/
    │   ├── supabase/{client,server,admin}.ts  # 그대로 복사
    │   ├── childAuth.ts             # 그대로 복사(diff 없음 확인) — 절대 수정 금지, 4장 경고 참고
    │   ├── currentProfile.ts        # 그대로 복사
    │   ├── vocabAuth.ts             # 이 앱 고유 — resolveActingChild(childId): 자녀 본인 또는 같은 가족 부모만 통과
    │   ├── vocabBatch.ts            # getOwnedBatchWithWords/getChildWordPool — vocabAuth로 권한 확인 후 데이터 조회
    │   ├── distractors.ts (+.test.ts) # 4지선다 디스트랙터 생성(순수 함수, PRD 4.3.1)
    │   └── types.ts                 # Profile(리딩버디와 공유) + Vocab* 타입(이 앱 고유)
    ├── components/
    │   ├── Avatar.tsx / LogoutButton.tsx / PinKeypad.tsx / PinEntry.tsx  # 인증 UI
    │   ├── ReviewSession.tsx        # 복습(암기) 플래시카드, 채점 없음
    │   ├── CheckSession.tsx         # 시험 도전 — 타이핑
    │   ├── ChoiceSession.tsx        # 시험 도전 — 4지선다
    │   ├── ArrangeSession.tsx       # 시험 도전 — 글자 배열(탭으로 타일 배치)
    │   └── SessionSummary.tsx       # 3개 시험 유형 공용 결과 화면 — 만점이면 /api/vocab-stars 호출
    └── app/
        ├── layout.tsx / globals.css  # Pretendard 폰트 + app-shell/card/btn* 컴포넌트 클래스(리딩버디 포팅)
        ├── page.tsx                  # role별 리다이렉트(parent→/profiles, child→/home)
        ├── login/page.tsx            # 부모 이메일/비밀번호 로그인
        ├── profiles/page.tsx         # 자녀 선택 + "점검 미리보기" 링크(부모용, PIN 없이 /check?childId=)
        ├── profiles/[id]/pin/page.tsx
        ├── home/page.tsx             # 자녀 홈 — vocab_words/vocab_batches 개수 실조회 + "점검 시작하기"
        ├── check/page.tsx            # DAY(배치) 목록 — 자녀는 본인 것, 부모는 ?childId로 고른 자녀 것
        ├── check/[batchId]/page.tsx  # 모드 허브(복습/시험 3종, 유형별 ⭐ 개수)
        ├── check/[batchId]/review/page.tsx
        ├── check/[batchId]/typing/page.tsx
        ├── check/[batchId]/choice/page.tsx
        ├── check/[batchId]/arrange/page.tsx
        └── api/
            ├── auth/{login,logout}/route.ts
            ├── children/[id]/pin/route.ts
            ├── vocab-attempts/route.ts   # 서버가 채점 authoritative, vocabAuth로 권한 확인
            └── vocab-stars/route.ts      # 만점 시 별 카운터 증가, vocabAuth로 권한 확인
```

관련 1회성 작업(오디오 STT/PDF 대조)은 이 저장소가 아니라 별도 작업 디렉터리 `/Users/gwanghee/Documents/110_Github/MP3_stt`에 있다 — 완성된 CSV를 `voca_mp3/`로 복사해와 `scripts/import_vocab_csv.py`가 Supabase에 반영했다(완료).

**검증 상태**: `npm run build` / `npx tsc --noEmit` 통과. 사용자가 실제 계정(부모/자녀 PIN)으로 로그인→점검까지 전체 플로우 확인 완료. **프로덕션 배포 완료(2026-09-14)**: GitHub(`teddy706/voca_learning`, private) → Vercel(`teddy706s-projects/voca-learning`, https://voca-learning-blush.vercel.app) 연동, 환경변수 등록 후 `/` → `/login` 서버사이드 Supabase 체크까지 실제 브라우저로 확인.

## 4. 인증 구조 (2026-09-14, 리딩버디 실제 코드 확인 완료)

리딩버디 인증을 코드·계정 모두 그대로 재사용(신규 가입 없음). 아래 파일들을 **변경 없이 그대로 복사**해 온다(로직을 다시 짜지 않는다 — 가이드 2.4 원칙):

| 리딩버디 파일 | 역할 | 이식 방식 |
|---|---|---|
| `src/lib/supabase/client.ts` | 브라우저용 Supabase 클라이언트 | 그대로 복사 |
| `src/lib/supabase/server.ts` | 서버 컴포넌트/라우트용(anon key, 쿠키 기반 세션) | 그대로 복사 |
| `src/lib/supabase/admin.ts` | service-role 클라이언트(RLS 우회, 서버 전용) | 그대로 복사 |
| `src/middleware.ts` | 모든 요청에서 세션 쿠키 갱신(`supabase.auth.getUser()`) | 그대로 복사 |
| `src/lib/childAuth.ts` | PIN→synthetic 계정 이메일/비밀번호 파생, PIN 잠금 정책 | **그대로 복사, 절대 재작성하지 않음** — 아래 경고 참고 |
| `src/lib/currentProfile.ts` | `getCurrentProfile`/`requireParentProfile`/`requireChildProfile`(Api) | 그대로 복사 |
| `src/app/api/auth/login/route.ts`, `.../signup/route.ts`(참고만), `.../logout/route.ts` | 부모 로그인/로그아웃 | login/logout만 필요 — signup은 이 앱에서 신규 가입을 안 받으므로 불필요 |
| `src/app/api/children/[id]/pin/route.ts` | PIN 검증 + 자녀 세션 전환 | 그대로 복사(경로/이름만 유지) |

### ⚠️ 절대 바꾸면 안 되는 것 — `childAuth.ts`
- `CHILD_AUTH_SECRET` 환경변수 값은 리딩버디 프로젝트의 값과 **정확히 동일**해야 한다. 값이 다르면 HMAC 파생 비밀번호가 달라져 기존 자녀 synthetic 계정에 로그인할 수 없다.
- `childProfileEmail()`이 만드는 이메일 문자열(`child+{profileId}@child.reading-buddy.internal`)도 **그대로** 써야 한다 — "reading-buddy" 부분을 이 프로젝트 이름으로 바꾸지 않는다(실재 도메인이 아니라 내부 식별자일 뿐이라 바꿀 필요도 없음). 자세한 배경은 [PRD.md](PRD.md) 4.1 "⚠️ 자녀 로그인 재사용 시 반드시 지켜야 할 것".

### 이 앱에서 새로 만들 필요 없는 것
- 회원가입(`/signup`), 자녀 프로필 생성(`/profiles/new`), 가족 코드 발급(`joinCode.ts`) — 계정/프로필은 리딩버디 쪽에서 이미 관리한다. 이 앱은 로그인(부모 이메일/비밀번호, 자녀 PIN)만 있으면 된다.

### 부모의 "자녀 대신 접근" — `resolveActingChild` (2026-09-14 추가)
`currentProfile.ts`의 `requireChildProfile()`/`requireChildProfileForApi()`는 "지금 세션이 정확히 그 자녀"인지만 본다. 점검 모드는 부모가 PIN 없이 자녀 화면을 미리 써볼 수 있어야 해서(사용자 요청), `src/lib/vocabAuth.ts`에 별도 헬퍼 `resolveActingChild(childId)`를 추가했다:
- 요청자가 그 자녀 본인이면 통과.
- 요청자가 부모면, `childId`가 같은 `family_id`의 `role='child'` 프로필인지 확인 후 통과.
- 점검 관련 페이지(`/check`, `/check/[batchId]`, 그 하위 4종)와 API(`/api/vocab-attempts`, `/api/vocab-stars`)는 전부 이걸로 권한을 확인한다 — `requireChildProfile()`을 직접 쓰지 않는다.
- 이 패턴은 리딩버디 RLS의 `my_role() = 'parent'` 조건(부모는 가족 전체 자녀 대신 쓰기 가능)을 애플리케이션 레벨에서 그대로 반영한 것이다. **자녀 전용 라우트를 새로 추가할 때마다 이 패턴을 쓸지 순수 `requireChildProfile()`을 쓸지 판단할 것** — 기본은 부모도 볼 수 있게(`resolveActingChild`) 통일하는 쪽.

## 5. 데이터 모델

전체 스키마는 [PRD.md](PRD.md) 3장 참고. 핵심 테이블 6개, 모두 `vocab_` 접두사로 리딩버디 프로젝트에 추가:

- `vocab_words` — 자녀별 캐논 단어 (family_id, child_id, korean, english; child_id+korean+english 유니크)
- `vocab_batches` — 등록 배치(사진 1장 = 배치 1개), `status`: pending_review → confirmed
- `vocab_batch_items` — 배치 ↔ 단어 N:M, 순서 보존 (family_id 없음, batch_id로 조인)
- `vocab_attempts` — 점검/게임 공통 시도 기록 (`mode`: check/game, `answer_mode`: typing/choice/**arrange** — 0004에서 추가)
- `vocab_stars` — 시험 도전 만점 보상 카운터 (`child_id`+`batch_id`+`mode`당 누적, 0005에서 추가)
- `vocab_word_marks` — 복습 모드 "알아요/몰라요" 자기평가 (`child_id`+`word_id`당 최신 상태 하나, 0006에서 추가) — 채점 기록인 `vocab_attempts`와 별개 개념

전 테이블 `family_id`를 직접 들고 있다 — 리딩버디의 `reading_records` 등 기존 테이블과 동일한 비정규화 패턴(6장 참고). 통계/오답노트는 별도 테이블 없이 `vocab_attempts` 집계 뷰로 처리(가이드 2.4 원칙).

### 5.1 원자적 카운터 함수 (0007, 2026-09-14 코드 리뷰 후 추가)
"현재 값을 SELECT로 읽고 애플리케이션에서 +1 계산 후 UPDATE/INSERT"는 동시 요청에서 값이 유실되는 레이스가 있다 — 특히 PIN 실패 카운터는 이게 "5회 실패 시 잠금" 정책 자체를 무력화할 수 있어 심각했다(12장 참고). 두 Postgres 함수로 읽기+쓰기를 한 문장에 합쳐 원자적으로 만들었다:
- `public.record_pin_failure(p_profile_id, p_max_attempts, p_lock_ms)` — `profiles.pin_fail_count`를 원자적으로 +1하고, 임계값 도달 시 같은 트랜잭션에서 잠금까지 건다. `service_role`(admin 클라이언트)로만 호출 — RLS는 어차피 우회되므로 SECURITY 속성은 중요하지 않다.
- `public.increment_vocab_star(p_family_id, p_child_id, p_batch_id, p_mode)` — `vocab_stars`에 `INSERT ... ON CONFLICT (child_id, batch_id, mode) DO UPDATE`로 원자적 증가. **일부러 SECURITY INVOKER(기본값)로 만듦** — 호출자(부모/자녀)의 RLS를 그대로 적용받아야 하기 때문. SECURITY DEFINER로 만들면 함수 안의 INSERT/UPDATE가 RLS를 통째로 우회해서 "아무나 아무 자녀의 별을 조작 가능"이라는, 고치려던 레이스보다 훨씬 심각한 구멍이 새로 생긴다.

## 6. RLS 정책 (2026-09-14, 기존 헬퍼 함수 확인 후 확정)

리딩버디 `0002_functions_triggers.sql`에 이미 있는 `public.my_family_id()` / `public.my_role()` / `public.my_profile_id()`(모두 `security definer`, `auth.uid()` 기준)를 새로 만들지 않고 그대로 재사용한다:

- **select**: `family_id = my_family_id()` — 같은 가족이면 부모/자녀 상관없이 조회 가능(리딩버디 `profiles_select`와 동일 원칙).
- **insert/update/delete**: `family_id = my_family_id() and (my_role() = 'parent' or child_id = my_profile_id())`.
  - 부모 계정: 자기 가족(쌍둥이 둘 다)의 모든 행에 쓰기 가능.
  - 자녀 PIN 세션: **자기 자신의 `child_id`에만** 쓰기 가능 — 쌍둥이 형제/자매의 단어장을 서로 건드릴 수 없다.
- `vocab_batch_items`는 `family_id`가 없으므로 `batch_id`로 `vocab_batches`를 조인해 같은 조건을 검사하는 정책을 쓴다.
- `vocab_stars`도 같은 4개 테이블과 동일한 select/insert/update 정책(0005_vocab_stars.sql) — delete 정책은 없음(별을 지울 일이 없으므로).
- 정확한 SQL은 [PRD.md](PRD.md) 4.1 참고.
- 마이그레이션 적용 전 리딩버디 기존 테이블(`families`/`profiles` 등)에 이름 충돌/외래키 영향이 없는지 반드시 확인.

## 7. AI/외부 서비스 통합 (계획)

### 7.1 Azure Document Intelligence
- 리딩버디와 같은 Azure 구독/리소스 그룹(`RG-reading-buddy`, Korea Central) 사용 예정 — 착수 시 같은 리소스(`reading-buddy-docintel`)를 재사용할지, 별도 리소스를 팔지 결정. 재사용 시 새 리소스 생성/키 관리가 통째로 생략됨.
- `src/lib/documentIntelligence.ts`의 `analyzeImage(imageUrl)` 패턴을 그대로 포팅 가능: REST 직접 호출(SDK 미사용), `POST .../documentModels/prebuilt-read:analyze` → `Operation-Location` 헤더를 1초 간격 최대 15회 폴링 → `analyzeResult.content` 반환. `urlSource`에 Blob의 SAS URL을 그대로 넣으면 됨(리딩버디는 Supabase Storage 서명 URL을 넣었던 자리).
- `prebuilt-layout`(표 인식)이 필요하면 이 함수는 아직 없음 — 새로 추가해야 함. `prebuilt-layout` vs `prebuilt-read` 중 실제 단어장 사진으로 테스트 후 선택([PRD.md](PRD.md) 4.2).
- 환경변수명은 리딩버디와 동일하게: `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`.

### 7.2 Azure Blob Storage
- **생성 완료(2026-09-14)**: 계정 `vocakokphotos`, 컨테이너 `vocab-photos`(비공개, `--public-access off`), `RG-reading-buddy`/Korea Central(Document Intelligence와 동일 리전), `Standard_LRS`/Hot 티어. Azure CLI(`az storage account create`/`az storage container create`)로 생성, 계정 키는 `.env.local`의 `AZURE_STORAGE_ACCOUNT_NAME`/`AZURE_STORAGE_ACCOUNT_KEY`/`AZURE_STORAGE_CONTAINER_NAME`.
- 서버가 SAS 토큰을 발급하는 API는 아직 미구현(Phase 1 진행 순서 2번) — 계정 키로 직접 SAS를 만드는 `@azure/storage-blob`의 `generateBlobSASQueryParameters` 사용 예정.

### 7.3 발음 재생
- Phase 1: Web Speech API (클라이언트 전용, 서버 호출 없음).
- iOS Safari 제약: `speak()`는 반드시 버튼 클릭 핸들러 내부에서 직접 호출.

## 8. 부분 실패에 대한 방어적 설계 (계획)

크로스클라우드 경계는 "OCR 결과를 Supabase에 최종 기록하는 단계" 한 곳뿐:
- Blob 업로드 성공 + OCR 실패 → 원본은 이미 있으므로 재시도만 노출.
- OCR 성공 + Supabase 쓰기 실패 → `vocab_batches`에 `pending_review`로 우선 저장해 새로고침 내구성 확보.
- 실패는 항상 어느 단계인지 구분해 `console.error`로 로그를 남긴다(조용히 삼키지 않는다).

## 9. 실시간 동기화

Phase 1/2 범위에는 실시간 동기화 요구사항이 없음(twin-choice의 동시 공개 같은 기능 없음). 필요해지면 이 섹션을 갱신.

## 10. 성능 최적화 (계획)

- Vercel 함수 리전을 Supabase/리딩버디와 동일하게 고정.
- 발음 재생은 클라이언트 전용이라 서버 왕복 없음(Phase 1 기준).

## 11. 테스트

- Vitest 인프라를 리딩버디/twin-choice에서 그대로 포팅.
- `src/lib/distractors.test.ts` — 4지선다 디스트랙터 생성 로직(순수 함수, PRD 4.3.1) 유닛 테스트 완료(7개, 전부 통과).
- **`/code-review high` 1회 실시 (2026-09-14)** — 전체 diff를 8개 관점(정확성 3·재사용/단순화/효율성 3·구조 깊이·CLAUDE.md 준수) 병렬 에이전트로 검증, 확정 10건 전부 수정 완료(레이스 컨디션 4건, 접근 제어/일관성 2건, 방어적 코딩 4건 — 상세는 CLAUDE.md "`/code-review high` 결과 및 수정" 절 참고). 새 DB 함수 2개(`record_pin_failure`/`increment_vocab_star`)는 실제 REST API 호출로 원자적 증가 동작까지 검증함.

## 12. 알려진 함정 (재발 방지용 기록)

리딩버디 CLAUDE.md/코드에서 이 프로젝트에도 그대로 재발할 수 있는 것만 미리 옮겨둔다. 그 외 새로 겪는 함정은 실제로 발생하는 대로 이어서 채운다.

- **`SUPABASE_SERVICE_ROLE_KEY`는 반드시 legacy JWT 형식**: Supabase 대시보드 API Keys 화면의 새 형식 secret key(`sb_secret_...`)를 넣으면 `admin.from(table).insert(...)` 같은 PostgREST 호출이 전부 `permission denied`로 막힌다. "Legacy anon, service_role API keys" 탭의 JWT를 리딩버디 `.env.local`에서 그대로 복사해 올 것(같은 프로젝트이므로 같은 값).
- **"Automatically expose new tables"가 꺼져 있어 새 테이블은 GRANT를 기본으로 못 받는다**: 리딩버디는 `0006_grants.sql`의 `alter default privileges`로 이후 테이블에도 자동 적용되게 해뒀지만, 이건 그 SQL을 실행한 role 기준으로 적용되는 설정이라 **`vocab_*` 마이그레이션을 SQL Editor에서 실행한 뒤 실제로 anon/authenticated/service_role이 해당 테이블에 접근되는지(간단한 select 테스트) 반드시 확인**할 것 — 안 되면 `0006_grants.sql`과 같은 GRANT 문을 `vocab_*` 테이블에 명시적으로 한 번 더 실행한다. **(2026-09-14 실측: 실제로는 문제없었다)** — `vocab_words`~`vocab_stars`(0001~0005) 전부 service_role/anon 접근이 기본으로 됐다. `0003_vocab_grants.sql`은 안전장치로 남겨두되 실행 안 해도 됨을 확인.
- **`storage.objects`는 일반 SQL `delete`로 못 지운다**(`storage.protect_delete()` 트리거가 막음). Azure Blob은 이 트리거의 영향을 받지 않지만(Supabase Storage가 아니므로), 혹시 사진 캐시 등을 Supabase Storage에 놓게 되면 이 함정이 재발할 수 있음 — Storage REST API로 지울 것.
- **자녀 로그인은 `CHILD_AUTH_SECRET`/`childProfileEmail()`이 리딩버디와 정확히 일치해야 동작**([4장](#4-인증-구조-2026-09-14-리딩버디-실제-코드-확인-완료) 참고) — 이 프로젝트에서 겪을 가능성이 가장 높은 함정이라 별도로 강조.
- **마이그레이션은 `supabase db push`가 아니라 SQL Editor 수동 실행**으로 적용해왔다(리딩버디 관례 그대로 따름) — 새 마이그레이션을 추가할 때마다 "사용자가 SQL Editor에서 직접 실행해야 실제 DB에 반영됨"을 잊지 말 것.
- **"현재 값 SELECT → 애플리케이션에서 +1 → UPDATE/INSERT"는 동시 요청에서 값이 유실되는 레이스가 있다**(2026-09-14 코드 리뷰에서 발견 — PIN 실패 카운터가 특히 심각했다: 동시에 여러 번 틀리면 "5회 실패 시 잠금" 정책 자체가 무력화될 수 있었음). 카운터를 늘리거나 upsert하는 새 로직을 짤 때는 처음부터 단일 SQL 문(원자적 증가 DB 함수, 또는 산술이 필요 없으면 `.upsert()`)으로 만들 것 — "select 후 write"는 나중에 고치는 게 아니라 처음부터 피할 것.
- **원자적 증가 DB 함수는 SECURITY DEFINER로 만들지 말 것**(0007_atomic_counters.sql 참고) — 호출자(부모/자녀)가 RLS를 그대로 적용받아야 하는 함수(`increment_vocab_star`처럼)를 DEFINER로 만들면 함수 안 INSERT/UPDATE가 RLS를 통째로 우회해서, 고치려던 레이스 버그보다 훨씬 심각한 "아무나 아무 자녀 데이터를 조작 가능" 취약점이 새로 생긴다. `service_role` 전용으로만 호출되는 함수(`record_pin_failure`처럼, 어차피 RLS를 우회하는 role)만 이 제약에서 자유롭다.
- **PostgREST가 방금 만든 함수를 "찾을 수 없음"이라고 하면 캐시 지연이 아니라 실행이 실제로 안 됐을 가능성부터 의심할 것**: `0007_atomic_counters.sql`을 처음 실행했을 때 `record_pin_failure`는 만들어졌는데 `increment_vocab_star`는 계속 `PGRST202`(함수를 찾을 수 없음)를 냈다 — 몇 초 기다려도 그대로였다. 파일 전체를 다시 실행하니 해결됨(원인 불명, 아마 붙여넣기 일부 누락). 여러 함수/문장이 든 마이그레이션에서 일부만 반영된 것 같으면, 캐시 갱신을 기다리지 말고 전체 파일을 통째로 재실행해볼 것(`create or replace`는 재실행해도 안전).
- **`npm run dev`가 떠 있는 상태에서 `npm run build`를 돌리면 `.next` 캐시가 깨진다** (2026-09-14 두 번 실제로 겪음): 둘 다 같은 `.next/` 디렉터리를 쓰는데 프로덕션 빌드가 그 안의 dev 전용 파일을 덮어써서, dev 서버가 `Cannot find module './NNN.js'`나 `Cannot read properties of null (reading 'useContext')` 같은 에러를 내며 죽는다. 이미 브라우저에 로드된 페이지는 옛 청크를 계속 참조하니 서버를 고쳐도 브라우저 쪽엔 강제 새로고침이 필요하다. **대응**: dev 서버가 떠 있는 동안에는 `npm run build`를 돌리지 말 것 — 코드 검증은 `npx tsc --noEmit` + `npx vitest run` + `npx next lint`로 충분하다(전부 `.next`를 건드리지 않음). 정말 프로덕션 빌드를 확인해야 하면 dev 서버를 먼저 멈추고, 빌드 후 다시 `rm -rf .next && npm run dev`로 깨끗하게 재시작할 것.
- **PostgREST `.in()` 필터에 UUID를 수백 개 이상 나열하면 요청이 조용히 실패한다**(2026-09-14 실제로 겪음): `/check` 목록의 학습 이력 요약(`vocabBatch.ts#getBatchHistorySummaries`)이 자녀 전체 단어(876개)의 `word_id`를 `.in()`에 나열했는데, UUID 876개 ≈ 32,000자짜리 쿼리 문자열이 되면서 요청이 실패했다. `{ data }`만 구조분해하고 `error`를 확인하지 않아서 화면엔 그냥 "학습 이력 없음"으로만 보였고, 원인을 좁히는 데 디버그 로그를 심어 재현하는 과정이 필요했다. **대응**: (1) `.in()` 배열이 배치 하나 분량(수십 개)을 넘어설 수 있는 자리에는 ID 목록으로 좁히지 말고 `child_id`처럼 이미 작은 컬럼 하나로 통째로 가져와 애플리케이션에서 조인할 것. (2) supabase-js 호출은 항상 `{ data, error }`를 구조분해해서 `error`를 `console.error`로 남길 것 — 그래야 이런 실패가 "결과 0건"으로 위장되지 않는다.
