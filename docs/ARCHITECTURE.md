# 아키텍처 문서 — 단어콕(가칭)

> **주의**: 이 문서는 아직 계획 단계다(Phase 0, 코드 없음). 구현이 시작되면 **코드가 진실이라는 원칙**에 따라 이 문서를 실제 구현에 맞춰 갱신할 것 — 문서에 맞춰 코드를 짜맞추지 않는다([NEW_APP_TOKEN_EFFICIENCY_GUIDE.md](NEW_APP_TOKEN_EFFICIENCY_GUIDE.md) 4장 원칙).

## 1. 개요

학원 단어장 사진을 OCR로 등록하고, 한글→영어 스펠링을 점검·게임 형태로 반복 학습시키는 PWA. 인증/DB는 자매 프로젝트 리딩버디와 Supabase 프로젝트를 공유하고, 사진 저장/OCR은 Azure로 분리한다. 자세한 배경과 근거는 [PRD.md](PRD.md) 참고.

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
                          │
                          ▼
        [점검 모드 / 랜덤 게임 모드] ──▶ [vocab_attempts 기록]
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

## 3. 디렉터리 구조 (계획, 착수 후 갱신)

```
voca_learning/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── BRIEF.md
│   ├── STORIES.md
│   ├── ARCHITECTURE.md
│   └── NEW_APP_TOKEN_EFFICIENCY_GUIDE.md
├── scripts/            # 4.7 일회성 가져오기 upsert 스크립트 (예정)
├── supabase/
│   └── migrations/     # vocab_* 스키마 (예정)
└── src/                # 앱 코드 (착수 후 리딩버디 구조 참고해 채움)
```

관련 1회성 작업(오디오 STT/PDF 대조)은 이 저장소가 아니라 별도 작업 디렉터리 `/Users/gwanghee/Documents/110_Github/MP3_stt`에 있다 — 완성된 CSV를 이 저장소의 upsert 스크립트가 읽어 Supabase에 반영한다.

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

## 5. 데이터 모델

전체 스키마는 [PRD.md](PRD.md) 3장 참고. 핵심 테이블 4개, 모두 `vocab_` 접두사로 리딩버디 프로젝트에 추가:

- `vocab_words` — 자녀별 캐논 단어 (family_id, child_id, korean, english; child_id+korean+english 유니크)
- `vocab_batches` — 등록 배치(사진 1장 = 배치 1개), `status`: pending_review → confirmed
- `vocab_batch_items` — 배치 ↔ 단어 N:M, 순서 보존 (family_id 없음, batch_id로 조인)
- `vocab_attempts` — 점검/게임 공통 시도 기록 (`mode`: check/game, `answer_mode`: typing/choice)

4개 테이블 모두 `family_id`를 직접 들고 있다 — 리딩버디의 `reading_records` 등 기존 테이블과 동일한 비정규화 패턴(6장 참고). 통계/오답노트는 별도 테이블 없이 `vocab_attempts` 집계 뷰로 처리(가이드 2.4 원칙).

## 6. RLS 정책 (2026-09-14, 기존 헬퍼 함수 확인 후 확정)

리딩버디 `0002_functions_triggers.sql`에 이미 있는 `public.my_family_id()` / `public.my_role()` / `public.my_profile_id()`(모두 `security definer`, `auth.uid()` 기준)를 새로 만들지 않고 그대로 재사용한다:

- **select**: `family_id = my_family_id()` — 같은 가족이면 부모/자녀 상관없이 조회 가능(리딩버디 `profiles_select`와 동일 원칙).
- **insert/update/delete**: `family_id = my_family_id() and (my_role() = 'parent' or child_id = my_profile_id())`.
  - 부모 계정: 자기 가족(쌍둥이 둘 다)의 모든 행에 쓰기 가능.
  - 자녀 PIN 세션: **자기 자신의 `child_id`에만** 쓰기 가능 — 쌍둥이 형제/자매의 단어장을 서로 건드릴 수 없다.
- `vocab_batch_items`는 `family_id`가 없으므로 `batch_id`로 `vocab_batches`를 조인해 같은 조건을 검사하는 정책을 쓴다.
- 정확한 SQL은 [PRD.md](PRD.md) 4.1 참고.
- 마이그레이션 적용 전 리딩버디 기존 테이블(`families`/`profiles` 등)에 이름 충돌/외래키 영향이 없는지 반드시 확인.

## 7. AI/외부 서비스 통합 (계획)

### 7.1 Azure Document Intelligence
- 리딩버디와 같은 Azure 구독/리소스 그룹(`RG-reading-buddy`, Korea Central) 사용 예정 — 착수 시 같은 리소스(`reading-buddy-docintel`)를 재사용할지, 별도 리소스를 팔지 결정. 재사용 시 새 리소스 생성/키 관리가 통째로 생략됨.
- `src/lib/documentIntelligence.ts`의 `analyzeImage(imageUrl)` 패턴을 그대로 포팅 가능: REST 직접 호출(SDK 미사용), `POST .../documentModels/prebuilt-read:analyze` → `Operation-Location` 헤더를 1초 간격 최대 15회 폴링 → `analyzeResult.content` 반환. `urlSource`에 Blob의 SAS URL을 그대로 넣으면 됨(리딩버디는 Supabase Storage 서명 URL을 넣었던 자리).
- `prebuilt-layout`(표 인식)이 필요하면 이 함수는 아직 없음 — 새로 추가해야 함. `prebuilt-layout` vs `prebuilt-read` 중 실제 단어장 사진으로 테스트 후 선택([PRD.md](PRD.md) 4.2).
- 환경변수명은 리딩버디와 동일하게: `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`.

### 7.2 Azure Blob Storage
- 비공개 컨테이너, 서버가 SAS 토큰 발급. Document Intelligence와 같은 리전 권장.

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

## 11. 테스트 (계획)

- Vitest 인프라를 리딩버디/twin-choice에서 그대로 포팅.
- 디스트랙터 생성 로직(4.3.1)은 순수 함수라 유닛 테스트로 커버하기 좋음 — 우선 대상.

## 12. 알려진 함정 (재발 방지용 기록)

리딩버디 CLAUDE.md/코드에서 이 프로젝트에도 그대로 재발할 수 있는 것만 미리 옮겨둔다. 그 외 새로 겪는 함정은 실제로 발생하는 대로 이어서 채운다.

- **`SUPABASE_SERVICE_ROLE_KEY`는 반드시 legacy JWT 형식**: Supabase 대시보드 API Keys 화면의 새 형식 secret key(`sb_secret_...`)를 넣으면 `admin.from(table).insert(...)` 같은 PostgREST 호출이 전부 `permission denied`로 막힌다. "Legacy anon, service_role API keys" 탭의 JWT를 리딩버디 `.env.local`에서 그대로 복사해 올 것(같은 프로젝트이므로 같은 값).
- **"Automatically expose new tables"가 꺼져 있어 새 테이블은 GRANT를 기본으로 못 받는다**: 리딩버디는 `0006_grants.sql`의 `alter default privileges`로 이후 테이블에도 자동 적용되게 해뒀지만, 이건 그 SQL을 실행한 role 기준으로 적용되는 설정이라 **`vocab_*` 마이그레이션을 SQL Editor에서 실행한 뒤 실제로 anon/authenticated/service_role이 해당 테이블에 접근되는지(간단한 select 테스트) 반드시 확인**할 것 — 안 되면 `0006_grants.sql`과 같은 GRANT 문을 `vocab_*` 테이블에 명시적으로 한 번 더 실행한다.
- **`storage.objects`는 일반 SQL `delete`로 못 지운다**(`storage.protect_delete()` 트리거가 막음). Azure Blob은 이 트리거의 영향을 받지 않지만(Supabase Storage가 아니므로), 혹시 사진 캐시 등을 Supabase Storage에 놓게 되면 이 함정이 재발할 수 있음 — Storage REST API로 지울 것.
- **자녀 로그인은 `CHILD_AUTH_SECRET`/`childProfileEmail()`이 리딩버디와 정확히 일치해야 동작**([4장](#4-인증-구조-2026-09-14-리딩버디-실제-코드-확인-완료) 참고) — 이 프로젝트에서 겪을 가능성이 가장 높은 함정이라 별도로 강조.
- **마이그레이션은 `supabase db push`가 아니라 SQL Editor 수동 실행**으로 적용해왔다(리딩버디 관례 그대로 따름) — 새 마이그레이션을 추가할 때마다 "사용자가 SQL Editor에서 직접 실행해야 실제 DB에 반영됨"을 잊지 말 것.
