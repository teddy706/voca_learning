-- 단어콕 — 시험 도전에 "빈칸을 순서대로 채우기(글자 타일)" 모드 추가 (2026-09-14)
--
-- 0001_vocab_schema.sql에서 vocab_attempts.answer_mode는 'typing'/'choice' 두 값만 허용했다.
-- 세 번째 도전 유형(글자 타일을 순서대로 배치)을 추가하면서 'arrange'를 더한다.
-- ⚠️ 이 마이그레이션은 리딩버디와 공유하는 Supabase 프로젝트에서 실행한다 — SQL Editor에서
-- 0001~0003 다음, 이 파일을 실행할 것.

alter table vocab_attempts drop constraint vocab_attempts_answer_mode_check;
alter table vocab_attempts add constraint vocab_attempts_answer_mode_check
  check (answer_mode in ('typing', 'choice', 'arrange'));
