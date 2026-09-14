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
- [ ] 리딩버디 CLAUDE.md/인증 코드를 먼저 읽고 재사용 가능한 부분 목록화 (PIN 인증, 미들웨어 위치 등 — `Glob`으로 재귀 확인)
- [ ] 리딩버디 Supabase 프로젝트에 `vocab_*` 마이그레이션 추가 — 기존 테이블 영향 없는지 확인 후 SQL Editor에서 실행
- [ ] Azure Blob Storage 컨테이너(비공개) 생성 + SAS 토큰 발급 API
- [ ] 학원 단어장 사진 1~2장으로 Document Intelligence 모델(`prebuilt-layout` vs `prebuilt-read`) 선택 테스트

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
전체 SQL은 [docs/PRD.md](docs/PRD.md) 3장 참고. 핵심: `vocab_words`(캐논, child_id+korean+english 유니크) / `vocab_batches`(등록 배치) / `vocab_batch_items`(N:M) / `vocab_attempts`(mode: check/game, answer_mode: typing/choice).

## Supabase/Azure 셋업 중 발견한 함정
(비워두고 시작 — 실제로 겪는 대로 채운다)

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
