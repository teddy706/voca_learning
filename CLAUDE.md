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
- [ ] 2. 점검 모드 — 타이핑 응답(한글→영어 스펠링, 채점, 요약)
- [ ] 3. 점검 모드 — 보기 선택 응답(디스트랙터 생성 로직 + 4지선다 UI)
- [ ] 4. 자녀 PIN 프로필 로그인 연동(리딩버디 계정 그대로 재사용)
- [ ] 5. 공통 `SpeakButton`(Web Speech API 발음 재생) 컴포넌트 + 점검 화면 적용
- [ ] 6. 아이폰 미니/아이패드 미니 실기기에서 반응형 레이아웃·PWA 설치 확인(카메라 테스트는 제외 — 사진 등록 없음)

### 보류 (이번 Phase 제외, 필요해지면 재검토)
- 사진 업로드(Blob) + Azure OCR 연동
- OCR 결과 확인/수정 UI
- 배치 등록(upsert) 확인 UI — CSV 가져오기는 스크립트로 이미 끝냈으므로 앱 안에 등록 UI가 당장 필요 없음

## 데이터 모델
전체 SQL은 [docs/PRD.md](docs/PRD.md) 3장 참고. 핵심: `vocab_words`(캐논, child_id+korean+english 유니크) / `vocab_batches`(등록 배치) / `vocab_batch_items`(N:M) / `vocab_attempts`(mode: check/game, answer_mode: typing/choice). 4개 테이블 모두 `family_id`를 직접 보관(리딩버디 기존 테이블과 동일 패턴, RLS를 `my_family_id()` 한 줄로 단순화하기 위함).

## Supabase/Azure 셋업 중 발견한 함정
리딩버디에서 이 프로젝트에도 재발 가능성이 높은 것만 미리 옮겨둠 (전체 목록은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 12장):
- `SUPABASE_SERVICE_ROLE_KEY`는 반드시 legacy JWT 형식(`sb_secret_...` 새 형식 아님) — 아니면 admin 클라이언트의 PostgREST 호출이 전부 `permission denied`.
- 이 프로젝트는 "Automatically expose new tables"가 꺼진 프로젝트에 새 테이블을 추가하는 것 — `vocab_*` 마이그레이션 실행 후 anon/authenticated/service_role이 실제로 접근되는지 select로 확인할 것. 안 되면 `0006_grants.sql`과 같은 GRANT를 다시 실행.
- 자녀 로그인은 `CHILD_AUTH_SECRET`/`childProfileEmail()`이 리딩버디와 정확히 일치해야 동작 (위 참고).
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
