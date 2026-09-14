-- 단어콕 — 복습 모드 "알아요/몰라요" 표시 (2026-09-14)
--
-- 복습(플래시카드) 중에 "알아요"/"몰라요"를 눌러 단어별로 자기 평가를 남긴다. child_id+word_id당
-- 최신 상태 하나만 유지(계속 갱신) — 예전 배치에서 표시한 것도 그대로 살아있어야 "전에 알았다고
-- 표기했다"는 걸 나중에 보여줄 수 있다. vocab_attempts(채점 기록)와는 별개의 개념이라 새 테이블로 뺀다.
--
-- ⚠️ 리딩버디와 공유하는 Supabase 프로젝트에서 0001~0005 다음 순서로 SQL Editor에서 실행한다.

create table vocab_word_marks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references profiles(id) on delete cascade,
  word_id uuid not null references vocab_words(id) on delete cascade,
  status text not null check (status in ('known', 'unknown')),
  updated_at timestamptz not null default now(),
  unique (child_id, word_id)
);
create index vocab_word_marks_family_id_idx on vocab_word_marks(family_id);
create index vocab_word_marks_child_word_idx on vocab_word_marks(child_id, word_id);

alter table vocab_word_marks enable row level security;

-- 기존 vocab_* 테이블과 동일한 패턴(0002_vocab_rls.sql, 0005_vocab_stars.sql).
create policy vocab_word_marks_select on vocab_word_marks
  for select using (family_id = public.my_family_id());

create policy vocab_word_marks_insert on vocab_word_marks
  for insert with check (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

create policy vocab_word_marks_update on vocab_word_marks
  for update using (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );
