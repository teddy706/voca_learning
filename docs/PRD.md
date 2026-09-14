# 단어장 암기 앱 (가칭: 단어콕) — 개발 기획 문서

**문서 버전:** v0.1 (기획 단계)
**작성일:** 2026-09-14
**참고:** `docs/NEW_APP_TOKEN_EFFICIENCY_GUIDE.md`의 구조(확정 결정 표 / Phase 스코프 / docs 4종)를 그대로 따름.

---

## 0. 배경 & 문제 정의

- 자녀(쌍둥이, 초등 3학년)가 학원에서 매일 영단어 시험을 본다.
- 단어장: 한글 단어 ↔ 영어 단어(스펠링까지) 매칭.
- 현재 방식: 종이 단어장을 손으로 가리고 발음시키며 스펠링을 구두/암산으로 점검 — **수작업, 기록이 남지 않음, 반복 출제 불가**.
- 단어장 원본은 디지털 백데이터로 못 받고 **사진으로만 확보 가능** → OCR 등록이 필수 경로.
- 목표: ①사진 찍어 등록 → ②한글 보고 영어 스펠링 맞추는 점검(기존 수작업 대체) → ③데이터가 계속 쌓여서 ④누적 단어은행 기반 랜덤 게임.

---

## 1. 확정된 기술 결정 (재논의 불필요)

| 항목 | 결정 | 근거 |
|---|---|---|
| 배포 형태 | PWA | 자매 프로젝트(twin-choice, reading-buddy)와 동일 패턴 |
| 인증/DB | **리딩버디와 동일 Supabase 프로젝트 공유**, `vocab_` 접두사 테이블만 추가 | 사용자 확인 완료 — Supabase 조직 무료 슬롯 2개가 이미 reading-buddy/twin-choice로 꽉 차 있음(9/14 확인). 부모 계정·자녀 PIN 인증을 코드가 아니라 **그대로 재사용** |
| 사진 저장소 | **Azure Blob Storage** (Supabase Storage 대신) | 사용자 확인 완료 — DB는 리딩버디와 공유해도 사진은 별도 클라우드라 Supabase Storage 1GB 한도와 무관, 기존 Azure 예산 내에서 소액. Document Intelligence가 Blob URL을 직접 읽을 수 있어 OCR 파이프라인도 단순해짐(4.2 참고) |
| OCR/AI 인프라 | Azure (AI Vision / Document Intelligence) | 사용자 확인 완료. 기존 Azure 구독($150/월) 및 리딩버디와 인프라 통일 |
| 개발 도구 | Claude Code | 자매 프로젝트와 동일 |
| Phase 1 범위 | 사진 등록(OCR) + 스펠링 점검 모드 | 기존 수작업을 1:1로 대체하는 게 최우선 |
| Phase 2 범위 | 누적 단어은행 기반 랜덤 게임 | 사용자 확인 완료 — 이번 문서에서 상세 설계 포함 |
| 타겟 디바이스 | 아이폰 미니(iPhone mini) / 아이패드 미니 — PWA 반응형, 터치 타겟 44pt 이상 | 사용자 확인 완료 |
| 단어 등록 권한 | **부모 + 자녀(PIN 프로필) 모두 등록 가능** | 사용자 확인 완료 — 4.1 RLS 설계에 반영 |
| 발음 재생 | **Web Speech API(브라우저 내장 TTS)** 우선 사용 | 무료·별도 백엔드 불필요·iOS Safari 지원. 음질 부족 시 Azure TTS로 업그레이드(4.6 참고) |
| 응답 방식 | **타이핑 입력 / 유사 스펠링 객관식 선택** 두 가지 모두 지원, 세션 시작 시 선택 | 사용자 확인 완료 — 점검·게임 모드 공통(4.3.1 참고) |
| 단어 등록 경로 (2026-09-14 변경) | **사진 촬영 → OCR 등록은 이번 Phase에서 제외.** 능률보카 중등기본 DAY 01~50 단어를 이미 CSV로 정리해뒀으므로, `scripts/import_vocab_csv.py`로 일괄 가져오기가 이번 Phase의 등록 경로다 | 사용자 확인 완료 — 학원 단어장이 우연히 시판 교재(능률보카)와 같아서 오디오+정답지로 이미 확보한 데이터가 있음. 사진 등록은 이 데이터가 안 통하는 새 단어장이 생길 때 재검토(4.2/4.8 참고) |

> **재검토 중이 아닌 이상 위 표는 그대로 믿고 진행.** 특히 "리딩버디와 Supabase 프로젝트 공유"는 실무상 가장 영향이 큰 결정이라(2026-09-14, 무료 슬롯 소진 확인 후 최종 확정) 4.1에서 별도로 다시 짚는다.

---

## 2. 사용자 스토리

### Phase 1 — 등록 & 점검
1. **부모 또는 자녀(PIN 로그인 상태)**가 학원 단어장을 사진으로 찍어 앱에 업로드한다.
2. OCR이 사진에서 한글-영어 단어쌍을 자동 추출해 목록으로 보여준다.
3. 등록을 진행 중인 사람(부모 또는 자녀)이 추출 결과를 확인하고, 잘못 읽힌 항목을 수정/삭제/추가한 뒤 "등록"을 누른다. 이때 항목마다 **"🔊 발음 듣기" 버튼**으로 영어 단어 발음을 먼저 들어볼 수 있다(스펠링과 발음이 맞는지 아이 스스로 확인 가능).
4. 등록된 단어 묶음(=그날 단어장)이 해당 자녀 프로필에 저장된다.
5. 자녀가 PIN으로 로그인 후, 오늘 등록된 단어장을 선택해 점검 모드로 들어간다. **이때 "타이핑으로 쓰기" 또는 "보기 중 고르기" 중 원하는 방식을 선택할 수 있다.**
6. **[타이핑 방식]** 한글 단어가 하나씩 보이고, 자녀가 영어 스펠링을 입력하면 즉시 정오답이 표시된다. **[보기 선택 방식]** 한글 단어와 함께 스펠링이 비슷한 오답 보기(예: apple/appel/aplle/apqle)가 함께 제시되고, 자녀가 맞는 것을 탭하면 즉시 정오답이 표시된다. 두 방식 모두 제출 전후 **"🔊 발음 듣기"**로 정답 발음을 들을 수 있다.
7. 세션이 끝나면 몇 개 맞았는지 요약이 뜨고, 틀린 단어는 별도로 다시 볼 수 있다.
8. 모든 시도(정답/오답, 입력한 스펠링, 시각)가 기록으로 남는다.

### Phase 2 — 누적 & 게임
9. 여러 날짜에 걸쳐 등록된 단어들이 하나의 "단어은행"으로 누적된다(동일 단어 중복 등록 시 자동 병합).
10. 자녀가 "랜덤 단어 게임" 메뉴에서 전체 단어은행을 대상으로 무작위 출제되는 게임을 한다. 여기서도 "🔊 발음 듣기"로 출제 단어의 발음을 들을 수 있다.
11. 자주 틀렸거나 최근에 틀린 단어가 더 자주 나온다(간단 가중치, 정교한 SRS는 이후 고도화).
12. 자녀별로 누적 정답률·연속 정답(streak) 등이 표시된다.

---

## 3. 데이터 모델 (초안)

핵심 원칙: **"단어장(그날 찍은 묶음)"과 "단어은행(누적 캐논)"을 분리**해야 중복 단어를 병합하면서도 어느 날 어떤 묶음으로 등록됐는지 추적할 수 있다.

```sql
-- 단어 은행 (자녀별 고유 단어 — 캐논 엔트리, 중복 등록 시 upsert)
create table vocab_words (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references profiles(id) on delete cascade,
  korean text not null,
  english text not null,
  created_at timestamptz not null default now(),
  unique (child_id, korean, english)
);
create index vocab_words_family_id_idx on vocab_words(family_id);

-- 등록 배치 (사진 한 장 = 배치 하나)
create table vocab_batches (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references profiles(id) on delete cascade,
  title text,                     -- 예: "9/15 단어시험"
  source_image_url text,          -- Azure Blob Storage 경로(비공개 컨테이너, 접근은 서버 발급 SAS 토큰으로)
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed')), -- OCR 직후=pending, 사용자 확인 완료 시=confirmed (4.2.1)
  registered_at timestamptz not null default now()
);
create index vocab_batches_family_id_idx on vocab_batches(family_id);

-- 배치 ↔ 단어 매핑 (N:M, 순서 보존)
create table vocab_batch_items (
  batch_id uuid not null references vocab_batches(id) on delete cascade,
  word_id uuid not null references vocab_words(id) on delete cascade,
  position int not null,
  primary key (batch_id, word_id)
);

-- 스펠링 시도 기록 (점검 모드 + 게임 모드 공통)
create table vocab_attempts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  word_id uuid not null references vocab_words(id) on delete cascade,
  child_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('check', 'game')),
  answer_mode text not null check (answer_mode in ('typing', 'choice')), -- 타이핑 입력 vs 유사 스펠링 보기 선택
  user_input text not null,          -- 두 방식 모두 최종 제출 문자열을 동일하게 저장(선택형도 고른 보기 텍스트)
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);
create index vocab_attempts_family_id_idx on vocab_attempts(family_id);
```

- `mode`(check/game)와 `answer_mode`(typing/choice)는 서로 독립적인 축이다 — 점검 모드에서도, 게임 모드에서도 두 방식 다 쓸 수 있다.
- `vocab_words`에 `unique(child_id, korean, english)`를 걸어 OCR로 같은 단어가 여러 번 등록돼도 자동 병합.
- 오답노트/통계는 `vocab_attempts`를 집계하는 뷰로 처리(별도 통계 테이블 없이 — 가이드 2.4 "새 테이블 없이 기존 값으로 즉석 계산" 원칙).
- **`family_id`를 `child_id`와 별도로 중복 저장(denormalize)하는 이유(2026-09-14, 리딩버디 실제 코드 확인 후 결정)**: 리딩버디의 `reading_records` 등 기존 테이블이 전부 이 패턴이고, RLS 정책도 이미 있는 `public.my_family_id()`/`public.my_role()`/`public.my_profile_id()` 헬퍼 함수로 `family_id = my_family_id() and (my_role()='parent' or child_id = my_profile_id())` 한 줄로 끝난다(4.1 참고). `family_id` 없이 `child_id`만 쓰면 부모가 "내 두 자녀 것 모두" 조회할 때마다 `child_id in (select id from profiles where family_id = my_family_id())` 서브쿼리가 필요해진다 — 기존 프로젝트 관례와 다르게 갈 이유가 없으므로 그대로 맞춘다.

---

## 4. 아키텍처

### 4.1 인증/DB — 리딩버디와 동일 Supabase 프로젝트 공유, 사진만 Azure Blob (확정)

**결정: DB/인증은 리딩버디의 기존 Supabase 프로젝트를 그대로 공유하고, `vocab_` 접두사 테이블만 추가한다. 단어장 사진 원본은 Supabase Storage가 아니라 Azure Blob Storage에 저장한다.** (2026-09-14, 사용자 확인 완료)

- **번복 사유**: 애초엔 "리딩버디와 완전 분리된 독립 프로젝트"를 확정했었으나, 실제 Supabase 대시보드를 확인한 결과 `teddy706's Org`의 **무료 프로젝트 슬롯 2개가 이미 reading-buddy·twin-choice로 소진**돼 있었다. Supabase 무료 플랜의 "2개 프로젝트" 한도는 **조직 단위가 아니라, 같은 계정이 Owner/Admin으로 있는 모든 조직을 통틀어 적용**되기 때문에 새 조직을 만들어도 우회가 안 된다(Supabase 공식 문서 기준). 따라서 처음 초안이었던 "동일 프로젝트 공유"로 복귀.
- **재사용 범위가 넓어짐**: 이전엔 "인증 코드만 재사용, 계정은 새로 생성"이었지만, 이제는 **부모 계정·자녀 PIN 프로필을 그대로 재사용**한다(같은 Supabase 프로젝트이므로 신규 가입 불필요). 리딩버디 로그인 세션 구조를 코드 레벨에서도, 실제 계정 레벨에서도 그대로 쓴다.
- **사진은 여전히 Azure Blob으로 분리**: 이 결정은 프로젝트 공유 여부와 무관하게 유지된다. DB를 공유해도 텍스트 데이터는 여전히 작지만(4.1.1), 사진은 계속 쌓이는 종류라 Supabase Storage에 얹으면 리딩버디의 Storage 쿼터까지 같이 갉아먹는다 — Azure Blob으로 분리해두면 리딩버디 쪽 자원에 전혀 영향을 주지 않는다.

#### 4.1.1 실제 사용량 확인 (2026-09-14, 대시보드 스크린샷 기준)

`teddy706's Org` (Free 플랜) 현재 사용량:

| 항목 | 현재 사용량 | 무료 한도 | 이 앱 추가 시 판단 |
|---|---|---|---|
| 활성 프로젝트 | reading-buddy, twin-choice **2/2** | 2개 | 이미 꽉 참 — 그래서 새 프로젝트 대신 리딩버디에 얹기로 결정 |
| DB 용량 | 28MB | 500MB | 여유 472MB — `vocab_*` 테이블(텍스트 위주)을 더해도 전혀 부담 없음 |
| Egress | 0.84GB | 5GB | 여유 있음 — vocab 관련 API 호출이 추가돼도 무리 없음 |
| MAU | 49명 | 50,000명 | 사실상 무제한 |
| 파일 저장 | 0.01GB | 1GB | 사진은 어차피 Azure Blob으로 분리하므로 이 한도는 거의 안 건드림(리딩버디가 이미 쓰는 0.01GB만 유지) |

**결론: 리딩버디 프로젝트에 여유가 충분해서 무료 플랜 안에서 이 앱을 그대로 얹을 수 있다.** 다만 두 앱이 같은 조직/프로젝트의 한도를 공유하므로, **앞으로 세 번째 자매 앱을 또 만들 계획이 있다면 그때는 Pro 업그레이드가 필요해질 수 있다는 점**은 염두에 둘 것(지금 당장 할 일은 아님, 9장 열린 질문 참고).

**Azure Blob Storage** (사진 전용, 변경 없음):

| 항목 | 내용 |
|---|---|
| 비용 | 무료 티어 한도 없이 **pay-as-you-go** — Hot 티어 기준 GB당 월 몇 센트 수준. 학원 단어장 사진이 수백~수천 장 쌓여도 월 비용은 무시할 만한 수준(기존 $150/월 Azure 예산에서 여유롭게 흡수됨) |
| 용량 한도 | **없음** |
| 수명주기 관리 | Blob Storage의 **Lifecycle Management**로 "N일 지난 사진은 Cool/Archive 티어로 자동 이동"(선택 사항, Phase 2 이후 고려) |
| 접근 제어 | Blob 컨테이너는 비공개(Private)로 두고 **서버(API 라우트)에서만 SAS(공유 액세스 서명) 토큰을 발급**해 클라이언트가 짧은 시간 동안만 특정 사진에 접근하게 한다 |

#### 마이그레이션/RLS 정책 메모 (2026-09-14, 리딩버디 실제 코드 확인 후 확정)

- **마이그레이션 주의**: 리딩버디와 같은 Supabase 프로젝트를 쓰므로, `vocab_*` 테이블을 추가하는 마이그레이션이 리딩버디의 기존 테이블(`families`/`profiles` 등)에 영향을 주지 않는지 SQL Editor에서 실행하기 전 반드시 확인한다(가이드 3.4 원칙). `create extension "pgcrypto"`는 이미 리딩버디 `0001_schema.sql`에서 실행돼 있으므로 우리 마이그레이션에서 다시 실행할 필요 없음(`if not exists`라 다시 실행해도 무해하긴 함).
- **기존 RLS 헬퍼 함수를 그대로 재사용한다** — 리딩버디 `supabase/migrations/0002_functions_triggers.sql`에 이미 `public.my_profile_id()` / `public.my_family_id()` / `public.my_role()` (모두 `security definer`, `auth.uid()` 기준으로 현재 세션의 profile을 찾아줌)이 정의돼 있다. `vocab_*` 마이그레이션은 이 함수들을 새로 만들지 않고 그대로 참조만 한다.
- **RLS 정책은 리딩버디 `reading_records`와 동일한 형태**로 4개 테이블(`vocab_words`/`vocab_batches`/`vocab_batch_items`/`vocab_attempts`) 모두에 적용한다:
  ```sql
  create policy vocab_words_select on vocab_words
    for select using (family_id = public.my_family_id());
  create policy vocab_words_insert on vocab_words
    for insert with check (
      family_id = public.my_family_id()
      and (public.my_role() = 'parent' or child_id = public.my_profile_id())
    );
  -- update/delete도 insert와 동일한 using() 조건. vocab_batches/vocab_attempts도 형태 동일.
  -- vocab_batch_items는 family_id가 없으므로 batch_id로 vocab_batches를 조인해 같은 조건을 검사.
  ```
  - 부모 계정: `my_role() = 'parent'`이므로 자기 가족(쌍둥이 둘 다)의 모든 행에 쓰기 가능.
  - 자녀 PIN 세션: `my_role() = 'child'`이므로 `child_id = my_profile_id()`(자기 자신)인 행만 쓰기 가능 — 쌍둥이 형제/자매의 단어장을 서로 건드릴 수 없다.
- Azure Blob의 사진 접근 제어(SAS 토큰)도 같은 `child_id` 스코프로 서버에서 발급 — 자녀 A의 세션으로 자녀 B의 사진 URL을 요청해도 SAS가 발급되지 않게 한다.

#### ⚠️ 자녀 로그인 재사용 시 반드시 지켜야 할 것 (2026-09-14, `src/lib/childAuth.ts` 확인)

리딩버디는 자녀 PIN 로그인을 "PIN + profileId + `CHILD_AUTH_SECRET`을 HMAC-SHA256으로 섞은 값"을 비밀번호로 하는 synthetic 이메일 계정(`child+{profileId}@child.reading-buddy.internal`)으로 구현했다. 이 앱은 **새 계정을 만드는 게 아니라 이미 존재하는 그 계정에 로그인**하는 것이므로:
- `CHILD_AUTH_SECRET` 환경변수 값을 리딩버디와 **정확히 동일하게** 설정해야 한다. 값이 다르면 HMAC 결과(=비밀번호)가 달라져서 이미 있는 synthetic 계정에 로그인할 수 없다.
- 이메일을 만드는 로직(`child+{profileId}@child.reading-buddy.internal`)도 **문자 그대로 동일하게** 재현해야 한다 — "reading-buddy" 부분을 이 프로젝트 이름으로 바꾸면 안 된다(실제 도메인이 아니라 내부 식별자 문자열이므로 바꿀 이유도 없다). 가장 안전한 방법은 이 함수를 새로 옮겨 적지 않고, 리딩버디의 `childAuth.ts`를 파일 그대로 복사해 오는 것.

### 4.2 OCR 파이프라인

```
사진 업로드(모바일 카메라/갤러리)
   └▶ Azure Blob Storage에 원본 저장
        └▶ Azure Document Intelligence 호출 (같은 클라우드 — Blob URL을 바로 참조, 재업/다운로드 불필요)
             └▶ 추출된 텍스트 라인을 한글/영어로 분리·매칭
                  └▶ "확인 화면"에 (한글, 영어) 쌍 리스트로 렌더 + 항목별 🔊 발음 듣기
                       └▶ 등록자(부모 또는 자녀)가 수정/삭제/추가
                            └▶ 확정 시 Supabase에 vocab_batches(사진은 Blob URL만 참조) + vocab_words upsert
```

- **Phase 1 가정**: 단어장이 "왼쪽 한글 / 오른쪽 영어" 또는 "위 한글 / 아래 영어" 형태의 정형 레이아웃이라고 가정하고 시작. 실제 학원 단어장 사진 1~2장을 먼저 테스트해서 Document Intelligence의 `prebuilt-layout`(표 인식)과 `prebuilt-read`(단순 텍스트) 중 어느 쪽이 더 정확한지 확인 후 결정.
- 한글/영어 라인 매칭 로직(줄 순서 기반 페어링)은 학원마다 포맷이 다를 수 있어 **완벽한 자동화보다 "확인 화면에서 쉽게 고치는 UX"가 더 중요** — OCR 정확도에 과도하게 투자하지 않는다.
- 확인 화면은 점검 모드 UI와 컴포넌트를 최대한 재사용(입력 필드 스타일, 🔊 발음 버튼 등).
- **자녀가 직접 등록하는 경우**를 고려해 확인 화면은 단순하게: 항목당 큰 터치 영역, 어려운 조작(전체 재업로드, 배치 삭제 등)은 부모 전용 메뉴로 분리 권장.

#### 4.2.1 Azure(사진+OCR) ↔ Supabase(메타데이터) 경계 — 부분 실패 처리

사진 저장과 OCR을 **같은 클라우드(Azure)로 합쳐서** 이전 설계보다 크로스클라우드 왕복이 한 번 줄었다 — 크로스클라우드 경계는 이제 "OCR 결과를 Supabase에 최종 기록하는 마지막 단계" 하나뿐이다.

- Azure Blob 업로드는 성공했는데 Document Intelligence 호출이 실패하는 경우 → 원본은 이미 Blob에 있으므로 "재시도" 버튼만 제공하면 됨(사진을 다시 찍게 하지 않는다).
- OCR은 성공했는데 확인 화면 진입 전 네트워크가 끊기거나 Supabase 쓰기가 실패하는 경우 → OCR 결과(파싱된 한글/영어 쌍)를 클라이언트에만 들고 있지 말고, **Supabase에 임시 상태로 우선 저장**(`vocab_batches`에 `status='pending_review'`로 upsert, `source_image_url`엔 Blob URL만 기록)해서 새로고침해도 결과가 안 날아가게 한다.
- 실패 로그는 어느 단계(Blob 업로드/OCR/Supabase 쓰기)에서 났는지 구분해서 `console.error`에 남긴다(가이드 2.1 원칙 — 실패는 항상 로그를 남길 것).

### 4.3 점검 모드 (Phase 1)

- 자녀가 특정 `vocab_batch` 선택 → **세션 시작 시 "타이핑" / "보기 선택" 중 응답 방식 선택**(기본값은 마지막에 쓴 방식 기억).
- **타이핑 방식**: 한글 단어 순서대로 제시 → 영어 입력 → 즉시 채점(trim + 대소문자 무시 비교) → 오답은 정답 노출 후 다음 단어.
- **보기 선택 방식**: 한글 단어 제시 → 정답 스펠링 + 유사 스펠링 오답 3개(총 4지선다)를 보기로 제시 → 탭하면 즉시 채점 → 오답 선택 시 정답 하이라이트 후 다음 단어.
- 세션 종료 시 요약(정답/오답 개수) + 오답 리스트 다시보기.
- 모든 제출은 `vocab_attempts(mode='check', answer_mode='typing'|'choice')`로 기록 — 어떤 방식으로 맞혔는지도 통계에 남아, 나중에 "타이핑은 약한데 객관식은 잘한다" 같은 패턴도 볼 수 있다.

#### 4.3.1 유사 스펠링 오답(디스트랙터) 생성 로직

보기 선택 방식의 핵심은 "그럴듯하게 헷갈리는 오답"을 만드는 것 — 완전히 무관한 단어를 섞으면 변별력이 없다.

1. **1순위 — 같은 단어은행에서 실제 유사 단어 찾기**: 정답과 편집거리(Levenshtein distance)가 1~2인 다른 등록 단어가 있으면 우선 사용(예: `bag`/`bad`처럼 이미 아이가 등록한 단어 중 실제로 헷갈리는 쌍).
2. **2순위 — 규칙 기반 합성 오답**: 위로 부족하면 정답 스펠링을 변형해서 만든다:
   - 인접한 두 글자 순서 바꾸기(`apple` → `appel`)
   - 글자 하나 빠뜨리기(`apple` → `aple`)
   - 이중 자음/모음 오류(`apple` → `aple`, `letter` → `leter`)
   - 흔한 혼동 철자 치환(c↔k, s↔z, ph↔f 등)
3. 위 방식으로 만든 후보 중 **정답과 동일하지 않고, 서로 중복되지 않는 3개**를 무작위로 골라 정답과 섞어 4지선다 구성.
4. 이 로직은 순수 클라이언트/서버 함수로 구현 가능(별도 AI 호출 불필요) — 단어 수가 적은 초기(Phase 1 극초반)에는 2순위 규칙 기반 비중이 높고, 단어은행이 쌓일수록 1순위(실제 유사 단어) 비중이 자연히 늘어난다.
5. 게임 모드(4.4)도 동일한 디스트랙터 생성 함수를 재사용한다.

### 4.4 랜덤 단어 게임 (Phase 2)

- 대상: 자녀의 `vocab_words` 전체(등록 배치와 무관, 누적 전체).
- 출제 가중치: 최근 `vocab_attempts`에서 오답이 많거나 최근에 틀린 단어일수록 뽑힐 확률↑ (예: `wrong_count`와 `days_since_last_wrong`을 간단한 가중치 함수로 조합 — 정식 SRS 알고리즘은 이후 고도화 항목으로 보류).
- 입력 방식은 점검 모드와 동일하게 **타이핑/보기 선택 둘 다 지원**하고 재사용 — 별도 UI를 새로 만들지 않는다(보기 선택 시 디스트랙터는 4.3.1 로직 재사용).
- 게임 결과도 `vocab_attempts(mode='game')`로 동일하게 기록되므로, 점검/게임 데이터가 같은 통계 뷰에 합산된다.
- 쌍둥이 간 비교/랭킹, 정식 SRS 간격 반복은 Phase 3 후보로 보류.

### 4.5 디바이스/반응형 설계 (아이폰 미니 · 아이패드 미니)

| 기기 | 대략적 뷰포트(CSS px) |
|---|---|
| iPhone mini (12/13 mini급) | 375 × 812 |
| iPad mini (세로) | 768 × 1024 |
| iPad mini (가로) | 1024 × 768 |

- **모바일 퍼스트 + 2단 확장**: 기본 레이아웃은 iPhone mini 폭(375px) 기준 1열로 설계하고, `min-width: 768px` 이상(아이패드 미니)에서 카드형 2열/여백 확장으로 전환. 별도 기기 분기 없이 반응형 CSS(그리드/플렉스)로 처리.
- **터치 타겟**: 자녀가 직접 조작하므로 버튼/입력 필드 최소 44×44pt(Apple HIG 기준) 이상 확보 — 특히 점검 모드의 정답 입력창, 🔊 발음 버튼, 등록 확인 화면의 ✓/✗ 버튼.
- **세이프 에어리어**: `viewport-fit=cover` + `env(safe-area-inset-*)` 적용 — 노치/홈 인디케이터에 버튼이 가리지 않게.
- **카메라 캡처**: `<input type="file" accept="image/*" capture="environment">` 또는 `getUserMedia`로 촬영 — iPhone mini/아이패드 미니 실기기에서 카메라 권한·촬영 UX를 Phase 1 초반에 직접 테스트(시뮬레이터로는 카메라 동작을 확인할 수 없음).
- **PWA 설치**: iOS Safari "홈 화면에 추가" 흐름을 두 기기 모두에서 확인(아이콘, 스플래시, standalone 모드에서 상태바 겹침 여부).
- 자매 프로젝트(리딩버디/twin-choice)도 동일 기기 대상이었다면, 이미 검증된 반응형 브레이크포인트/컴포넌트를 그대로 재사용할 것 — 처음부터 다시 잡지 않는다.

### 4.6 발음 재생 기능

- **기본안(Phase 1)**: 브라우저 내장 **Web Speech API**(`SpeechSynthesisUtterance`, `lang = 'en-US'`)로 클라이언트에서 즉시 재생. 서버/Azure 호출 없이 무료, iOS Safari(모바일 사파리 포함) 지원.
- **iOS 제약**: iOS Safari는 사용자 제스처(탭) 컨텍스트 안에서 첫 `speak()` 호출이 이뤄져야 재생이 허용된다 — 반드시 버튼 `onClick` 핸들러 내부에서 직접 호출(사전 로딩이나 자동재생 시도 금지).
- **적용 위치**: ①등록 확인 화면(항목별), ②점검 모드(문제/정답), ③게임 모드(출제 단어) — 공통 `SpeakButton` 컴포넌트 하나로 재사용.
- **업그레이드 옵션(필요 시)**: Web Speech API 음질이 기기마다 들쭉날쭉하면 Azure Speech TTS로 교체 가능(이미 구독 보유). 이 경우 같은 단어를 반복 요청할 일이 많으므로, 생성된 음성을 Supabase Storage에 캐싱해 동일 단어 재요청 시 재사용 — API 비용을 단어당 1회로 제한. **Phase 1은 Web Speech API로 시작해 비용 0원으로 검증하고, 음질 불만이 실제로 확인되면 그때 Azure TTS 캐싱으로 전환하는 순서를 권장**(twin-choice에서 이미 "외부 API 비용 최소화, 무료 티어 우선" 원칙을 세운 것과 일관됨).

### 4.7 (1회성) 기존 단어장 오디오 일괄 가져오기

기존에 가진 mp3(능률보카 중등기본 — 영어 발음 → 번호 매겨진 한글 뜻 순서, DAY 01~50 총 50개 파일)를 한 번에 DB로 옮기는 작업. **앱의 정식 기능이 아니라 로컬에서 한 번 실행하고 끝내는 스크립트**로 처리한다(사용자 확인 완료) — Blob Storage 업로드, SAS 토큰, 앱 내 확인 화면 등 프로덕션 파이프라인(4.2)을 거칠 필요가 없다.

> **작업 위치**: 이 1회성 작업은 이 저장소가 아니라 별도 작업 디렉터리 `MP3_stt`(로컬 경로: `/Users/gwanghee/Documents/110_Github/MP3_stt`)에서 진행 중이다 — mp3 원본, `transcribe_vocab.py`, `compare_with_answer_key.py`, 검수용 CSV/리뷰 파일이 모두 거기 있다. 이 저장소(`voca_learning`)에는 **완성된 CSV를 Supabase에 upsert하는 최종 스크립트**만 필요 시 이식한다.

#### 실측 검증 결과 (2026-09-14, DAY_01~06 샘플 6개로 실제 테스트 완료)

- **STT 엔진**: Azure Speech 대신 **faster-whisper(medium 모델, 로컬 실행)로 실제 검증** — 단일 다국어 모델이라 en/ko 전환 구간을 별도 언어 인식 설정 없이 잘 처리한다.
- **실제 데이터 구조**: 단순 "영어 1개 : 한글 1개"가 아니라, **한 단어에 번호 매겨진 뜻이 여러 개**인 경우가 흔하다(예: `tall` → 1.키가 큰 2.높은). 파싱 규칙: 번호로 묶이는 뜻 그룹은 세미콜론(`;`)으로, 번호 없이 같은 그룹 안의 동의어는 콤마(`,`)로 이어붙인다 — 사용자 확인 완료.
- **번호 표기가 실행마다 다르다**: 뜻 번호가 어떤 때는 `1.` `2.`(숫자), 어떤 때는 `일,` `이,`(한자어 숫자 발음)로 인식된다 — **같은 파일을 다시 돌려도 Whisper가 매번 다르게 표기**하므로, 파서가 두 형태를 모두 정규식으로 처리하도록 고쳤다.
- **영어 단어를 두 번 반복해서 말하는 원본 특성**: `light, light`처럼 headword가 항상 두 번 발음된다. 이걸 그대로 두 개의 별도 항목으로 저장하면 리뷰 CSV에 중복 행이 생기므로, 완전히 동일한 연속 headword는 하나로 합치도록 처리(단, `come from, be from`처럼 실제 동의 표현이 다른 경우는 그대로 유지).
- **동의 headword 처리**: 콤마로 나열된 headword(위와 같은 반복 제외)는 각각 별도 단어 항목(같은 한글 뜻 공유)으로 저장한다.
- **"Day N" 접두어**: 도입부 음성이 바로 다음 단어와 한 세그먼트로 붙어 나올 수 있어(`"day 1 tall"`), 세그먼트 전체를 버리지 말고 `Day N` 접두어 텍스트만 정규식으로 제거한다.
- **⚠️ 가장 중요한 발견 — 같은 파일도 실행마다 결과가 달라진다(비결정성)**: VAD(무음 감지) 설정을 `min_silence_duration_ms=300`에서 `100`으로 낮추자 DAY_02에서 통째로 누락되던 6개 단어(`too/also/lunch/wait/student/model`)는 복구됐지만, **같은 설정으로 DAY_01/DAY_06을 다시 돌리자 이전 실행에는 있던 다른 단어들(`easy, know, daughter, player, window, begin, watch out` 등)이 이번엔 조용히 사라졌다** — 에러 없이 그냥 빠진다. 즉 **한 번 실행한 결과의 단어 개수를 그 자체로 신뢰할 수 없다.**
  - **대응 원칙**: CSV를 문구 단위로 검수하기 전에, **먼저 파싱된 단어 개수를 원본(책 목차, 또는 이미 아는 하루 단어 수)과 대조**하는 걸 1차 체크로 둔다. 개수가 안 맞으면 그 파일만 다시 돌리거나, 두 번 돌려서 결과를 합집합으로 병합하는 걸 고려한다(스크립트에는 아직 미구현 — 향후 개선 여지로 9장에 남김).
  - 오인식 자동 플래그(⚠️, 문자열 패턴 매칭)는 "존재하지만 틀리게 읽힌" 단어는 잡아주지만 "아예 누락된" 단어는 못 잡는다는 한계도 같이 기록해둔다.
- **DAY_01~06 최종 결과**: 각각 20/19/20/21/20/13개 단어 파싱(총 113개). 확인 필요 플래그는 이번 배치에선 0건이었지만, 위 비결정성 이슈 때문에 **플래그 0건 ≠ 완전함**이라는 점에 유의.

#### ⭐ 핵심 업데이트 — PDF 정답지를 진짜 정답(ground truth)으로 활용

사용자가 "능률보카 중등기본 정답 PDF"(각 DAY의 CHECK UP/워크북 시험 답안지, DAY 01~50 전체 + 누적 TEST)를 제공하면서, **오디오 대신/추가로 이 PDF로 완성도를 검증**할 수 있는지 확인 요청 — 실제로 대조해보니 이게 훨씬 신뢰도 높은 검증 수단이었다.

- **PDF의 한계**: 답안지는 "빈칸 채우기 시험"의 정답만 나열돼 있어서, 어떤 문항이 어떤 단어를 묻는지 순서가 뒤섞여 있다. 그래서 **PDF만으로 깨끗한 "영어–한글" 쌍을 100% 복원하기는 어렵다** — 하지만 **그 날짜에 등장하는 영어 단어(표제어)의 전체 집합**은 CHECK UP과 워크북 두 섹션의 영어 답을 모으면 꽤 정확하게 복원된다(한 섹션에서 한글 뜻으로만 나온 단어도 다른 섹션에서는 영어 답으로 나오는 경우가 많음).
- **검증 스크립트**: `compare_with_answer_key.py`(MP3_stt 작업 디렉터리) — PDF에서 추출한 일자별 "영어 표제어 집합"과, 오디오로 파싱한 리뷰 CSV의 표제어 집합을 비교해서 누락/오류를 자동으로 찾아준다.
- **이 대조로 실제로 잡아낸 문제들** (DAY_01~06 재검증, 2026-09-14):
  1. **가짜 단어 생성 버그**: 오디오가 "come from, be from"처럼 콤마로 들리면 파서가 이걸 별도 두 단어로 쪼갰는데, 실제 책엔 `be from` 하나만 있었다 — 콤마 자동 분리 로직을 제거하고, 콤마가 남아있는 headword는 사람이 보게 플래그만 달도록 수정.
  2. **공백으로만 반복되는 headword**: `again, again`처럼 콤마가 있으면 정상 처리됐지만, `again again`처럼 콤마 없이 공백만으로 반복되면 안 걸러졌다 — 정규식으로 "앞뒤가 완전히 같은 문구" 패턴을 잡아 정리하도록 수정.
  3. **진짜 STT 누락(파서로 못 고침)**: DAY_06에서 `knife`/`player`가 아예 영어가 아니라 **한글 발음 그대로**("나이프", "플레이어")로 전사되면서 파서가 이걸 새 단어로 인식하지 못하고 이전 단어에 뜻을 잘못 붙였다. `window`, `daughter`, `easy`, `know`, `begin`도 이 구간에서 통째로 빠짐. 더 큰 모델(`large-v3`)로 재시도했으나 이 환경에서는 메모리 부족으로 실행 자체가 안 됨 — 결국 **PDF 답안지에서 직접 뜻을 가져와 수동으로 6~7개 단어를 보완**했다(DAY_06 CSV에 `⚠️(PDF로 보완)`로 표시).
- **결론 및 앞으로의 워크플로 권장**: 오디오 파싱 → `compare_with_answer_key.py`로 그 날의 PDF 답안지와 대조 → 누락된 단어는 (a) 오디오를 다시 듣고 채우거나 (b) PDF 답안지에서 뜻을 직접 가져와 보완. **PDF가 있는 날짜는 오디오 정확도에 크게 의존하지 않고도 최종 완성도를 담보할 수 있다** — 남은 44개 파일을 처리할 때도 이 스크립트를 먼저 돌려서 "몇 개가 비는지"부터 확인하는 걸 표준 절차로 삼는다.

**흐름 (스크립트 기준, PDF 정답지가 있는 경우):**
1. mp3 폴더 → `import_vocab_audio.py`(구 `transcribe_vocab.py`) 실행 → faster-whisper(medium)로 전사 → 파싱 → 파일별 `*_review.csv` 생성.
2. 그날의 PDF 답안지 텍스트를 파일로 저장해두고 `compare_with_answer_key.py`로 대조 — 누락/오류 목록을 바로 받는다.
3. 누락된 단어는 PDF 답안지의 뜻을 그대로 가져와 CSV에 보완(오디오 재시도보다 훨씬 빠르고 확실함). 그 외 ⚠️ 플래그 항목은 사람이 훑어본다.
4. ~~검수 끝난 CSV들을 읽어 Supabase에 upsert하는 스크립트~~ → **완료(2026-09-14)**: [`scripts/import_vocab_csv.py`](../scripts/import_vocab_csv.py)(이 저장소)가 `vocab_batches`에 배치 하나씩(`title = '능률보카 중등기본 DAY 01'` 등, `status = 'confirmed'`)를 만들고 그 아래로 `vocab_words`/`vocab_batch_items`를 채운다. `vocab_words`의 `unique(child_id, korean, english)` 제약 덕에 이후 사진으로 같은 단어가 다시 들어와도 자동 병합된다. 4.8 참고.
5. Supabase에는 `service_role` 키로 서버 사이드(로컬 스크립트)에서만 쓰고, 클라이언트/앱 코드에는 노출하지 않는다.

**주의**: 이 mp3가 앞으로도 반복적으로 생긴다면(예: 학원이 매번 오디오로 준다면) 이 절을 4.2와 같은 수준의 정식 파이프라인으로 승격해야 한다 — 지금은 1회성이라는 전제로 설계했다.

### 4.8 (2026-09-14 결정) 이번 Phase는 사진 OCR 대신 CSV 가져오기가 등록 경로

**결정**: 4.7의 CSV가 능률보카 중등기본 DAY 01~50 전체(50일치)로 완성되면서, 4.2(사진 촬영 → OCR)의 등록 경로가 이번 Phase에는 필요 없어졌다. 학원이 내주는 단어 시험이 우연히 이 시판 교재와 같아서, 사진을 찍어 OCR로 다시 읽어낼 필요 없이 이미 확보한 CSV로 바로 등록할 수 있기 때문이다.

- **적용 범위**: `scripts/import_vocab_csv.py`(이 저장소)를 실행해 이 family의 role=child 캐릭터 전원(고아린·황유니·아빠·정보라, 4명)에게 동일한 단어장을 등록 완료(2026-09-14, 이후 아빠/정보라도 실제 캐릭터로 확인되어 확장) — 캐릭터당 고유 단어 876개, `vocab_batches` 200개(50일×4명), `vocab_batch_items`/`vocab_words` 3504개. 스크립트는 하드코딩 목록이 아니라 family_id로 role=child를 동적 조회하므로 재실행해도 안전하고, 새 캐릭터가 생겨도 자동 포함된다.
- **4.2(사진 OCR 등록)는 제거가 아니라 보류**: 학원이 다른 책으로 바뀌거나, 앞으로 사진으로만 얻을 수 있는 새 단어장이 생기면 그때 다시 필요해진다. Azure Blob Storage(`vocakokphotos`/`vocab-photos`)와 Document Intelligence 리소스는 이미 만들어져 있으므로, 재검토 시점에는 API/UI 코드만 추가하면 된다(4.1.1, 4.2 참고) — 인프라를 다시 만들 필요는 없다.
- **CSV 파서의 알려진 결함(4.7의 원본 CSV에 남아있음, `import_vocab_csv.py`가 임포트 시점에 방어)**: DAY_10 등 일부 파일에 (english, korean)이 완전히 동일한 행이 그대로 중복 저장돼 있었다(STT dedup 로직이 일부 파일엔 적용 안 됨) — 그대로 upsert하면 `ON CONFLICT DO UPDATE command cannot affect row a second time` 에러가 난다. `import_vocab_csv.py`는 파싱 단계에서 완전 동일한 (english, korean) 쌍만 제거하고 가져온다(같은 영어에 다른 뜻이 달린 행은 그대로 둠). 원본 CSV 자체를 고치는 것은 이 저장소가 아니라 `MP3_stt` 쪽 작업.
- **데이터 품질**: `MP3_stt/VOCAB_AUDIT_REPORT.md`에 PDF 정답지 대조 결과 전체 일치율 86.2%로 기록돼 있다 — 완벽하지 않은 데이터라는 걸 인지하고 가져왔다(정확도를 더 높이는 건 이 저장소가 아니라 `MP3_stt`의 책임 범위, 9장 열린 질문 참고).

### 4.9 (2026-09-14 업데이트) 점검 모드 재설계 — 복습 단계 + 시험 도전 3종 + 별 보상

사용자가 앱을 실제로 써본 뒤 4.3의 초기 설계를 아래처럼 구체화했다. 최신 구현 상세와 파일 위치는 [CLAUDE.md](../CLAUDE.md) "점검 모드 전면 재설계"를 참고 — 이 절은 요구사항/설계 근거만 남긴다.

- **스텝 1: 복습(암기)** — 채점 없는 플래시카드. 한글이 나오고 탭하면 영어로 뒤집힌다. 시험 도전 전에 먼저 훑어보는 용도.
- **스텝 2: 시험 도전** — 3가지 유형 중 골라서 도전:
  1. 타이핑 입력(기존 4.3)
  2. 4지선다(4.3.1의 디스트랙터 로직 그대로)
  3. **글자 배열**(신규) — 정답 스펠링을 섞은 글자 타일을 순서대로 탭해서 빈칸을 채운다. 공백이 있는 구동사류("come from")는 공백을 고정 칸으로 두고 글자만 타일로 만든다.
- **별(⭐) 보상**: 한 세션에서 오답 없이 만점을 받으면 별 1개, 반복해서 만점을 받을 때마다 계속 쌓인다. 저장 위치는 사용자가 "DB에 영구 저장"을 선택 — 기기를 바꾸거나 로그아웃해도 유지된다(`vocab_stars` 테이블, child_id+batch_id+mode당 카운터).
- **부모 계정으로 미리보기**: 부모가 PIN 없이 특정 자녀의 복습/시험 화면을 그대로 써볼 수 있다(자녀 대신 테스트/확인 용도). 리딩버디의 "부모는 가족 전체 자녀를 대신해 조회/수정 가능" 패턴을 점검 모드까지 확장한 것.

---

## 5. Phase 로드맵

- **Phase 0** — 착수 준비
  - 리딩버디 CLAUDE.md/인증 코드 먼저 읽고 재사용 가능한 부분 목록화
  - 이 저장소에 `docs/{PRD,BRIEF,STORIES,ARCHITECTURE}.md` 4종 스캐폴드 생성 (이 문서를 PRD.md로 이동) — **완료 (2026-09-14)**
  - ~~Supabase 조직 무료 슬롯 확인~~ → **완료: 2/2 슬롯 모두 사용 중(reading-buddy, twin-choice) 확인됨(4.1.1), 리딩버디 프로젝트 공유로 결정**
  - ~~리딩버디 Supabase 프로젝트에 `vocab_*` 마이그레이션 추가~~ → **완료(2026-09-14)**: `supabase/migrations/0001_vocab_schema.sql`, `0002_vocab_rls.sql`을 사용자가 SQL Editor에서 직접 실행, 에러 없이 성공. `0003_vocab_grants.sql`(안전장치)은 미실행 — 앱 코드에서 permission denied가 나면 그때 실행
  - ~~Azure Blob Storage 계정/컨테이너 생성(비공개, Document Intelligence와 같은 리전)~~ → **완료(2026-09-14)**: 계정 `vocakokphotos`, 컨테이너 `vocab-photos`(비공개), `RG-reading-buddy`/Korea Central(Document Intelligence와 동일 리전), Standard_LRS/Hot. Azure CLI로 생성(`az login` 계정: `teddy706@m14v.microsoft.com`, 구독 "Visual Studio Enterprise 구독")
  - [보류, 이번 Phase 제외] 학원 단어장 사진 1~2장으로 Document Intelligence 모델 선택 테스트 — 4.8 참고, CSV 가져오기로 등록을 대신하기로 해서 당장 불필요
  - ~~기존 mp3 단어장 일괄 가져오기 — 4.7, `MP3_stt` 작업 디렉터리에서 진행~~ → **완료(2026-09-14)**: DAY 01~50 전체 + Supabase 반영까지 끝남(4.8 참고)
- **Phase 1** — 점검 (MVP, 등록은 CSV 가져오기로 대체 완료)
  - [x] 1. 리딩버디 프로젝트에 Supabase 스키마 추가 (`vocab_words/batches/batch_items/attempts`)
  - [x] 1.5. CSV 일괄 가져오기로 등록 완료(사진 OCR 등록의 대체 경로, 4.8)
  - [보류] Blob Storage 업로드 + SAS 토큰 발급 API — 사진 등록 재도입 시 진행
  - [보류] 사진 업로드 + Azure OCR 연동 — 사진 등록 재도입 시 진행
  - [보류] OCR 결과 확인/수정 UI — 사진 등록 재도입 시 진행
  - [x] 2. 점검 모드 — 타이핑 응답(한글→영어 스펠링, 채점, 요약) — 완료, 4.9 참고
  - [x] 3. 점검 모드 — 보기 선택 응답(디스트랙터 생성 로직 + 4지선다 UI) — 완료, 4.9 참고
  - [x] 4. 자녀 PIN 프로필 로그인 연동(리딩버디 계정/코드 그대로 재사용) — 사용자 확인 완료
  - [x] 4.5. (추가) 복습 모드 + 글자 배열 시험 유형 + 별 보상 + 부모 미리보기 — 4.9 참고
  - [ ] 5. 공통 `SpeakButton`(Web Speech API 발음 재생) 컴포넌트 + 점검 화면 적용
  - [ ] 6. 아이폰 미니/아이패드 미니 실기기에서 반응형 레이아웃·PWA 설치 확인(카메라 테스트 제외)
- **Phase 2** — 누적 & 게임
  - [ ] 11. 단어은행 전체 조회/통계 뷰
  - [ ] 12. 가중 랜덤 출제 게임 모드(타이핑/보기 선택 모두, 발음 듣기 포함)
  - [ ] 13. 오답노트 화면
- **Phase 3(보류)** — 쌍둥이 랭킹/비교, 정식 SRS, 학원 단어장 포맷 다양화 대응, 리마인더 알림, Blob Lifecycle Management(오래된 사진 자동 Cool/Archive 전환)

**앞 번호가 안 끝났으면 뒷 번호는 손대지 않는다.**

---

## 6. 인프라 함정 체크리스트 (가이드 3장 반영 — 착수 전 미리 알아둘 것)

- [x] Azure Document Intelligence가 배포하려는 리전에서 제공되는지 확인 → 리딩버디가 이미 Korea Central에서 운영 중이므로 문제없음. Blob Storage 계정(`vocakokphotos`)도 같은 Korea Central로 생성 완료(2026-09-14).
- [ ] 같은 Azure 구독의 다른 리소스(리딩버디)와 TPM/쿼터를 공유하는지 확인 — 같은 리전에서 기본 용량 배포 실패 가능. (Document Intelligence는 리딩버디 리소스를 그대로 재사용하기로 해서 새 배포가 없으므로 이 프로젝트에서는 해당 없음이 될 가능성 높음 — 별도 리소스로 바꾸게 되면 재확인)
- [ ] Azure OCR/Blob 키는 생성 즉시 Vercel에 넣기 전(후)에 별도 안전한 곳에 백업 — Vercel "Sensitive" 변수는 소유자도 재조회 불가. (현재는 로컬 `.env.local`에만 있음, Vercel 배포 단계에서 재확인)
- [x] **`vocab_*` 마이그레이션은 리딩버디와 같은 Supabase 프로젝트에 적용되므로, SQL Editor 실행 전 리딩버디 기존 테이블에 영향 없는지 반드시 재확인**(이름 충돌, 외래키 연결 대상 등) → 확인 후 0001/0002 실행 완료, 에러 없음(2026-09-14).
- [x] Blob 컨테이너를 비공개(Private)로 생성 → 완료(`public access off`). 클라이언트에는 서버가 발급한 SAS 토큰으로만 접근하게 하는 API는 아직 미구현(Phase 1 코드 작성 2번 항목).
- [ ] 앱을 일주일 이상 안 쓰면 무료 Supabase 프로젝트가 자동 일시정지된다는 점을 인지(리딩버디와 같이 쓰므로 이미 알려진 리스크) — 필요 시 수동 재개.
- [ ] Vercel 함수 리전과 Supabase 리전 일치 확인(리딩버디와 이미 맞춰져 있으면 자동 상속) — 이 앱을 Vercel에 배포하는 시점에 확인.

---

## 7. 재사용 가능한 자산 (자매 프로젝트에서 포팅)

- **부모 계정 + 자녀 PIN 프로필을 코드뿐 아니라 실제 계정까지 그대로 재사용**(같은 Supabase 프로젝트 공유이므로 신규 가입/설정 불필요)
- Vitest 테스트 인프라
- Azure 클라이언트 초기화/에러 핸들링 패턴 (실패 시 `console.error` 로깅 규칙 포함), 특히 리딩버디의 `azureSpeech.ts`를 4.7의 STT 스크립트에 그대로 재사용

---

## 8. CLAUDE.md 템플릿

이 문서의 최신 버전은 저장소 루트 `CLAUDE.md`를 참고할 것 (내용이 어긋나면 루트 파일이 우선).

---

## 9. 아직 열려 있는 질문 (착수 세션에서 확정할 것)

- Azure Blob Storage의 리전을 Document Intelligence와 정확히 맞출지, 아니면 이미 쓰는 기존 리소스 그룹/리전을 그대로 따를지 결정
- Blob Lifecycle Management(오래된 사진 자동 Cool/Archive 전환)를 Phase 1부터 적용할지, 비용이 실제로 유의미해질 때(Phase 2 이후) 붙일지
- **향후 세 번째 자매 앱을 계획 중이라면, 그때는 Supabase 무료 슬롯이 없으므로 Pro 업그레이드/프로젝트 정리 중 무엇을 택할지 미리 생각해둘 것** (지금 당장 결정할 사항은 아님)
- ~~4.7 오디오 가져오기 정확도 검증~~ → **완료: DAY_01~06 6개 파일로 실측 + PDF 정답지 대조 검증까지 완료.** 정답 PDF가 있는 날짜는 `compare_with_answer_key.py`로 누락/오류를 자동 검출하고 PDF 뜻으로 직접 보완하는 워크플로로 확정.
- **4.7 남은 작업**: 나머지 44개 파일 처리 시, 각 날짜의 PDF 답안지 텍스트도 같이 준비해서 매번 대조 검증할지(정확도는 높지만 수작업 늘어남), 아니면 이번처럼 눈에 띄게 개수가 부족한 날짜만 선별적으로 PDF 대조할지 결정 필요
- 남은 44개 파일 오디오 STT는 local faster-whisper(medium) 환경의 메모리 한계로 large 모델 사용이 어려움을 확인함 — 정확도가 크게 아쉬운 날짜가 반복되면 Azure Speech 배치 전사로 전환하는 옵션도 열어둘 것
- 학원 단어장의 실제 사진 포맷 확인 — 표 형태인지, 자유 줄글 형태인지에 따라 OCR 파싱 전략이 달라짐
- 오답 재출제 가중치의 구체적 공식(단순 "최근 오답 우선"으로 시작할지, 횟수 기반 가중치를 둘지)
- 아이폰 미니/아이패드 미니 실기기에서 Web Speech API 영어 음성 품질이 실제로 충분한지 조기 검증(불충분하면 Phase 1 안에서 바로 Azure TTS로 전환할지 결정)
