-- 단어콕 — 별점(스타) 보상 (2026-09-14)
--
-- "오답 없이 다 맞추면 별 1개, 반복해서 또 만점을 받으면 별이 계속 쌓인다"는 요구사항을
-- DAY 단어장(batch) × 시험 유형(mode)별 누적 카운터로 구현한다. 복습(암기) 모드는 채점이
-- 없으므로 별 대상이 아니다 — mode는 vocab_attempts.answer_mode와 동일한 3종(typing/choice/arrange).
--
-- ⚠️ 리딩버디와 공유하는 Supabase 프로젝트에서 0001~0004 다음 순서로 SQL Editor에서 실행한다.

create table vocab_stars (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references profiles(id) on delete cascade,
  batch_id uuid not null references vocab_batches(id) on delete cascade,
  mode text not null check (mode in ('typing', 'choice', 'arrange')),
  star_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (child_id, batch_id, mode)
);
create index vocab_stars_family_id_idx on vocab_stars(family_id);
create index vocab_stars_child_batch_idx on vocab_stars(child_id, batch_id);

alter table vocab_stars enable row level security;

-- 기존 vocab_* 테이블과 동일한 패턴(0002_vocab_rls.sql) — 같은 가족이면 조회 가능,
-- 쓰기는 부모이거나 본인 것일 때만.
create policy vocab_stars_select on vocab_stars
  for select using (family_id = public.my_family_id());

create policy vocab_stars_insert on vocab_stars
  for insert with check (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

create policy vocab_stars_update on vocab_stars
  for update using (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );
