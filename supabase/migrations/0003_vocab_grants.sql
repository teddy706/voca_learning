-- 단어콕 — 안전장치용 명시적 GRANT
--
-- 이 Supabase 프로젝트는 생성 시 "Automatically expose new tables"가 꺼져 있어서,
-- 리딩버디도 처음에 새 테이블에 service_role조차 기본 GRANT를 못 받는 문제를 겪었다
-- (0006_grants.sql, docs/ARCHITECTURE.md 12장). 리딩버디가 이후 추가한
-- `alter default privileges`가 새 테이블에도 자동 적용되도록 해뒀지만, 이는 그 SQL을 실행한
-- role 기준으로 적용되는 설정이라 이 마이그레이션의 테이블에도 실제로 적용됐는지 보장할 수 없다.
--
-- 이미 default privileges로 적용돼 있어도 이 GRANT를 다시 실행하는 것은 무해하다(idempotent).
-- 0002_vocab_rls.sql 실행 후 select 테스트로 실제 접근이 되는지 반드시 확인할 것 — 안 되면
-- (permission denied) 이 파일을 실행한다.

grant select, insert, update, delete
  on vocab_words, vocab_batches, vocab_batch_items, vocab_attempts
  to anon, authenticated;

grant all privileges
  on vocab_words, vocab_batches, vocab_batch_items, vocab_attempts
  to service_role;
