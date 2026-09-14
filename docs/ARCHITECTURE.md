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

## 2. 기술 스택 (계획)

리딩버디와 동일한 스택을 따를 예정 — 구현 착수 시 리딩버디 `package.json`/설정을 먼저 확인하고 그대로 포팅한다.

| 레이어 | 계획 |
|---|---|
| 프레임워크 | 리딩버디와 동일(확인 필요 — Next.js 추정) |
| 배포 | PWA, Vercel(리딩버디와 동일 리전으로 고정) |
| DB/인증 | Supabase (리딩버디 프로젝트 공유) |
| 사진 저장 | Azure Blob Storage |
| OCR | Azure Document Intelligence |
| 발음 재생 | Web Speech API (`SpeechSynthesisUtterance`), 업그레이드 시 Azure Speech TTS |
| 테스트 | Vitest (리딩버디/twin-choice 인프라 재사용) |

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

## 4. 인증 구조 (계획)

리딩버디 인증을 코드·계정 모두 그대로 재사용(신규 가입 없음):
- 부모: Supabase Auth 이메일 로그인 (리딩버디 기존 계정)
- 자녀: PIN → synthetic 계정 → Supabase Auth 세션 (리딩버디의 기존 패턴 그대로 포팅)

착수 시 리딩버디의 인증 관련 코드(미들웨어, PIN 검증 로직 등)를 `Glob`으로 재귀 탐색해 실제 위치를 먼저 확인할 것 — 특정 위치만 보고 "없다"고 단정하지 않는다([NEW_APP_TOKEN_EFFICIENCY_GUIDE.md](NEW_APP_TOKEN_EFFICIENCY_GUIDE.md) 2.3).

## 5. 데이터 모델

전체 스키마는 [PRD.md](PRD.md) 3장 참고. 핵심 테이블 4개, 모두 `vocab_` 접두사로 리딩버디 프로젝트에 추가:

- `vocab_words` — 자녀별 캐논 단어 (child_id, korean, english 유니크)
- `vocab_batches` — 등록 배치(사진 1장 = 배치 1개), `status`: pending_review → confirmed
- `vocab_batch_items` — 배치 ↔ 단어 N:M, 순서 보존
- `vocab_attempts` — 점검/게임 공통 시도 기록 (`mode`: check/game, `answer_mode`: typing/choice)

통계/오답노트는 별도 테이블 없이 `vocab_attempts` 집계 뷰로 처리(가이드 2.4 원칙).

## 6. RLS 정책 (계획)

- 부모 계정: 자기 자녀 전체(쌍둥이 둘 다)의 `child_id` 행에 쓰기 가능.
- 자녀 PIN 세션: **자기 자신의 `child_id`에만** 쓰기 가능.
- 마이그레이션 적용 전 리딩버디 기존 테이블(특히 `profiles`)에 이름 충돌/외래키 영향이 없는지 반드시 확인.

## 7. AI/외부 서비스 통합 (계획)

### 7.1 Azure Document Intelligence
- 리딩버디와 같은 Azure 구독 사용 예정 — TPM/쿼터 공유 여부 착수 시 확인.
- `prebuilt-layout` vs `prebuilt-read` 중 실제 단어장 사진으로 테스트 후 선택([PRD.md](PRD.md) 4.2).

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

착수 후 실제로 겪는 대로 이 섹션을 채운다 (비워두고 시작). 예시 형식:

> - `<날짜>` — `<증상>`: `<원인>`. `<대응>`.
