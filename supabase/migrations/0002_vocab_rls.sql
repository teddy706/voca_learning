-- 단어콕 — RLS 정책
--
-- public.my_family_id() / public.my_role() / public.my_profile_id() 는 리딩버디
-- 0002_functions_triggers.sql에서 이미 정의돼 있다(security definer, auth.uid() 기준).
-- 여기서는 새로 만들지 않고 그대로 참조만 한다.
--
-- 패턴은 리딩버디 reading_records와 동일: select는 "같은 가족이면 전부", 쓰기는
-- "부모는 가족 전체, 자녀는 자기 자신의 child_id만"(docs/PRD.md 4.1, docs/ARCHITECTURE.md 6장).

alter table vocab_words enable row level security;
alter table vocab_batches enable row level security;
alter table vocab_batch_items enable row level security;
alter table vocab_attempts enable row level security;

-- vocab_words
create policy vocab_words_select on vocab_words
  for select using (family_id = public.my_family_id());

create policy vocab_words_insert on vocab_words
  for insert with check (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

create policy vocab_words_update on vocab_words
  for update using (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

create policy vocab_words_delete on vocab_words
  for delete using (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

-- vocab_batches (동일 패턴)
create policy vocab_batches_select on vocab_batches
  for select using (family_id = public.my_family_id());

create policy vocab_batches_insert on vocab_batches
  for insert with check (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

create policy vocab_batches_update on vocab_batches
  for update using (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

create policy vocab_batches_delete on vocab_batches
  for delete using (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );

-- vocab_batch_items: family_id가 없으므로 batch_id로 vocab_batches를 조인해 같은 조건을 검사한다.
create policy vocab_batch_items_select on vocab_batch_items
  for select using (
    exists (
      select 1 from vocab_batches b
      where b.id = vocab_batch_items.batch_id
        and b.family_id = public.my_family_id()
    )
  );

create policy vocab_batch_items_insert on vocab_batch_items
  for insert with check (
    exists (
      select 1 from vocab_batches b
      where b.id = vocab_batch_items.batch_id
        and b.family_id = public.my_family_id()
        and (public.my_role() = 'parent' or b.child_id = public.my_profile_id())
    )
  );

create policy vocab_batch_items_update on vocab_batch_items
  for update using (
    exists (
      select 1 from vocab_batches b
      where b.id = vocab_batch_items.batch_id
        and b.family_id = public.my_family_id()
        and (public.my_role() = 'parent' or b.child_id = public.my_profile_id())
    )
  );

create policy vocab_batch_items_delete on vocab_batch_items
  for delete using (
    exists (
      select 1 from vocab_batches b
      where b.id = vocab_batch_items.batch_id
        and b.family_id = public.my_family_id()
        and (public.my_role() = 'parent' or b.child_id = public.my_profile_id())
    )
  );

-- vocab_attempts: select/insert만 허용하고 update/delete 정책은 의도적으로 두지 않는다
-- (RLS는 정책이 없으면 기본 거부 — 시도 기록을 사후에 고치거나 지울 수 없는 append-only 로그로 만든다).
create policy vocab_attempts_select on vocab_attempts
  for select using (family_id = public.my_family_id());

create policy vocab_attempts_insert on vocab_attempts
  for insert with check (
    family_id = public.my_family_id()
    and (public.my_role() = 'parent' or child_id = public.my_profile_id())
  );
