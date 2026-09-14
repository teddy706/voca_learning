# CLAUDE.md — 단어콕(가칭, 영단어 스펠링 암기 앱)

**지금은 Phase 0(착수 준비)을 진행 중입니다.** Phase 1 코드는 Phase 0 체크리스트(아래)가 끝난 뒤 시작하세요. Phase 2, Phase 3은 이 시점에 손대지 마세요.

## 프로젝트 개요
초등 3학년 자녀의 학원 영단어 시험 대비 암기 점검 앱. 학원 단어장을 사진으로 등록(OCR)하고,
한글→영어 스펠링 점검을 대체한다. 데이터는 누적되어 이후 랜덤 단어 게임에 쓰인다.

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
| 기존 mp3 단어장 가져오기 | 이 저장소가 아니라 별도 작업 디렉터리 `/Users/gwanghee/Documents/110_Github/MP3_stt`에서 진행 — 완성된 CSV만 이 저장소로 가져와 upsert |

> **재검토 중이 아닌 이상 위 표는 그대로 믿고 진행.**

## Phase 0 체크리스트 (착수 준비, Phase 1 시작 전 완료할 것)
- [x] 리딩버디/twin-choice Supabase 무료 슬롯 확인 → 2/2 소진 확인, 리딩버디 프로젝트 공유로 결정 (2026-09-14)
- [x] `docs/{PRD,BRIEF,STORIES,ARCHITECTURE}.md` + 이 파일 스캐폴딩 (2026-09-14)
- [x] 리딩버디 CLAUDE.md/인증 코드를 먼저 읽고 재사용 가능한 부분 목록화 (2026-09-14) — 결과는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 4장·6장, 요약은 바로 아래 섹션
- [x] `supabase/migrations/0001_vocab_schema.sql`~`0003_vocab_grants.sql` 작성 완료 (2026-09-14) — **아직 실제 DB에는 미적용**. 사용자가 리딩버디 Supabase 프로젝트 SQL Editor에서 0001→0002→0003 순서대로 직접 실행해야 반영됨(리딩버디 관례 그대로, `supabase db push` 아님). 0002 실행 후 select 테스트로 anon/authenticated 접근이 되는지 확인 — 안 되면 0003 실행
- [x] 리딩버디 `.env.local`에서 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `CHILD_AUTH_SECRET`을 그대로 복사해 `.env.local` 생성 완료 (2026-09-14). `AZURE_DOCUMENT_INTELLIGENCE_*`도 리딩버디 리소스를 우선 재사용하도록 반영. `AZURE_STORAGE_*`(Blob)는 아직 빈 값 — 컨테이너 생성 후 채울 것
- [ ] Azure Blob Storage 컨테이너(비공개) 생성 + SAS 토큰 발급 API
- [ ] 학원 단어장 사진 1~2장으로 Document Intelligence 모델(`prebuilt-layout` vs `prebuilt-read`) 선택 테스트 — 리딩버디 `reading-buddy-docintel` 리소스 재사용 여부도 이때 결정

### 리딩버디에서 확인한 재사용 자산 (2026-09-14 코드 확인 완료)
아래 파일은 **재작성하지 않고 그대로 복사**해 온다 (자세한 표는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 4장):
`src/lib/supabase/{client,server,admin}.ts`, `src/middleware.ts`, `src/lib/childAuth.ts`, `src/lib/currentProfile.ts`, `src/app/api/auth/{login,logout}/route.ts`, `src/app/api/children/[id]/pin/route.ts`.
이미 존재하는 DB 자산(새로 안 만듦): `families`/`profiles` 테이블, RLS 헬퍼 함수 `public.my_family_id()`/`public.my_role()`/`public.my_profile_id()`(`0002_functions_triggers.sql`).
OCR은 `src/lib/documentIntelligence.ts`의 `analyzeImage()` REST 폴링 패턴을 포팅(단, `prebuilt-layout` 지원은 아직 없어 필요 시 추가).

## Phase 1 진행 순서
번호 순서대로 진행. 앞 번호가 안 끝났으면 뒷 번호에 먼저 손대지 말 것.
- [ ] 1. 리딩버디 Supabase 프로젝트에 vocab_ 스키마 추가 (vocab_words/batches/batch_items/attempts, answer_mode 포함)
- [ ] 2. 사진 업로드(Blob) + Azure OCR 연동
- [ ] 3. OCR 결과 확인/수정 UI
- [ ] 4. 배치 등록(upsert) 로직
- [ ] 5. 점검 모드 — 타이핑 응답
- [ ] 6. 점검 모드 — 보기 선택 응답(디스트랙터 생성 로직)
- [ ] 7. 자녀 PIN 프로필 로그인 연동(리딩버디 계정 그대로 재사용)
- [ ] 8. SpeakButton(Web Speech API) 컴포넌트 + 등록/점검 화면 적용
- [ ] 9. 아이폰 미니/아이패드 미니 실기기 테스트(카메라, 레이아웃, PWA 설치)

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
