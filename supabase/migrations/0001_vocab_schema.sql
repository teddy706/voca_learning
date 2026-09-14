-- 단어콕 — Phase 1 스키마
--
-- ⚠️ 실행 위치: 이 리포 전용 Supabase 프로젝트가 아니라, 리딩버디와 공유하는 기존 프로젝트
-- (reading-buddy, teddy706's Org, ap-northeast-2 Seoul)의 SQL Editor에서 직접 실행한다.
-- `supabase db push`가 아니라 지금까지 리딩버디/twin-choice 관례대로 SQL Editor 수동 실행으로
-- 적용한다 — 이 파일을 실행했다고 실제 DB에 반영되는 게 아니라, 사용자가 Supabase 대시보드
-- SQL Editor에 붙여넣고 Run을 눌러야 반영된다.
--
-- families/profiles 테이블과 pgcrypto 확장은 리딩버디 0001_schema.sql에서 이미 만들어져 있으므로
-- 여기서 다시 만들지 않고 참조만 한다. 실행 전 이 파일이 만드는 테이블명이 기존 테이블과
-- 충돌하지 않는지 한 번 더 확인할 것(docs/ARCHITECTURE.md 12장).
--
-- family_id를 child_id와 별도로 중복 저장(denormalize)하는 이유: 리딩버디의 reading_records 등
-- 기존 테이블과 동일한 패턴을 따라야 RLS에서 기존 헬퍼 함수 public.my_family_id()를 그대로 쓸 수
-- 있다(0002_vocab_rls.sql 참고). 근거: docs/PRD.md 3장.

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
create index vocab_words_child_id_idx on vocab_words(child_id);

-- 등록 배치 (사진 한 장 = 배치 하나)
create table vocab_batches (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references profiles(id) on delete cascade,
  title text,                     -- 예: "9/15 단어시험"
  source_image_url text,          -- Azure Blob Storage 경로(비공개 컨테이너, 접근은 서버 발급 SAS 토큰으로)
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed')), -- OCR 직후=pending, 사용자 확인 완료 시=confirmed
  registered_at timestamptz not null default now()
);
create index vocab_batches_family_id_idx on vocab_batches(family_id);
create index vocab_batches_child_id_idx on vocab_batches(child_id);

-- 배치 ↔ 단어 매핑 (N:M, 순서 보존)
create table vocab_batch_items (
  batch_id uuid not null references vocab_batches(id) on delete cascade,
  word_id uuid not null references vocab_words(id) on delete cascade,
  position int not null,
  primary key (batch_id, word_id)
);

-- 스펠링 시도 기록 (점검 모드 + 게임 모드 공통). 의도적으로 append-only —
-- update/delete RLS 정책을 두지 않아 시도 기록을 사후에 고치거나 지울 수 없게 한다
-- (0002_vocab_rls.sql 참고).
create table vocab_attempts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  word_id uuid not null references vocab_words(id) on delete cascade,
  child_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('check', 'game')),
  answer_mode text not null check (answer_mode in ('typing', 'choice')),
  user_input text not null,
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);
create index vocab_attempts_family_id_idx on vocab_attempts(family_id);
create index vocab_attempts_word_id_idx on vocab_attempts(word_id);
create index vocab_attempts_child_id_idx on vocab_attempts(child_id);
