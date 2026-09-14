-- 단어콕 — PIN 실패 카운터 / 별 카운터를 원자적으로 만든다 (2026-09-14, 코드 리뷰에서 발견)
--
-- 두 군데 모두 기존 코드가 "SELECT로 현재 값을 읽고 → 애플리케이션에서 +1 계산 → UPDATE/INSERT로
-- 다시 쓰기"를 트랜잭션 없이 했다. 동시에 두 요청이 오면 둘 다 같은 값을 읽고 같은 값을 써서
-- 하나가 유실된다(TOCTOU race). PIN 실패 카운터의 경우 이게 "5회 실패 시 1분 잠금" 정책 자체를
-- 무력화할 수 있어 특히 심각하다(동시에 여러 번 틀리면 카운터가 절대 임계값에 못 닿음).
--
-- 두 함수 모두 단일 UPDATE/INSERT...ON CONFLICT 문 하나로 읽기+쓰기를 합쳐서, Postgres의 행 잠금이
-- 동시 요청을 자동으로 직렬화하게 만든다 — 애플리케이션 레벨에서 락을 흉내낼 필요가 없어진다.
--
-- ⚠️ 리딩버디와 공유하는 Supabase 프로젝트에서 0001~0006 다음 순서로 SQL Editor에서 실행한다.
-- record_pin_failure는 profiles 테이블(리딩버디 소유)의 기존 컬럼(pin_fail_count/pin_locked_until,
-- 0005_pin_lockout.sql)만 갱신하는 순수 추가 함수라 리딩버디 쪽 동작에 영향을 주지 않는다.

-- 두 함수 모두 일부러 SECURITY INVOKER(기본값, "security definer" 아님)로 둔다 — RLS를 우회할
-- 권한 상승이 필요 없다: record_pin_failure는 항상 admin(service_role) 클라이언트로만 호출되므로
-- service_role의 기존 권한 그대로 충분하고, increment_vocab_star는 반드시 호출자(부모/자녀)의
-- RLS를 그대로 적용받아야 한다(자기 가족이 아닌 child_id로 별을 조작 못 하게). SECURITY DEFINER로
-- 만들면 이 함수 안의 INSERT/UPDATE가 함수 소유자 권한으로 실행되면서 RLS를 통째로 우회해버려서,
-- 레이스 컨디션 버그보다 훨씬 심각한 "아무나 아무 자녀의 별을 조작 가능" 취약점이 새로 생긴다.
create or replace function public.record_pin_failure(
  p_profile_id uuid,
  p_max_attempts int,
  p_lock_ms bigint
)
returns table(fail_count int, locked_until timestamptz)
language plpgsql
set search_path = public
as $$
declare
  v_count int;
  v_locked_until timestamptz;
begin
  update profiles
  set pin_fail_count = pin_fail_count + 1
  where id = p_profile_id
  returning pin_fail_count into v_count;

  if v_count >= p_max_attempts then
    update profiles
    set pin_fail_count = 0,
        pin_locked_until = now() + (p_lock_ms || ' milliseconds')::interval
    where id = p_profile_id
    returning pin_locked_until into v_locked_until;
  end if;

  return query select v_count, v_locked_until;
end;
$$;

grant execute on function public.record_pin_failure(uuid, int, bigint) to service_role;

-- vocab_stars: child_id+batch_id+mode당 만점 횟수를 원자적으로 +1(없으면 1로 생성).
create or replace function public.increment_vocab_star(
  p_family_id uuid,
  p_child_id uuid,
  p_batch_id uuid,
  p_mode text
)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_count int;
begin
  insert into vocab_stars (family_id, child_id, batch_id, mode, star_count)
  values (p_family_id, p_child_id, p_batch_id, p_mode, 1)
  on conflict (child_id, batch_id, mode)
  do update set star_count = vocab_stars.star_count + 1, updated_at = now()
  returning star_count into v_count;

  return v_count;
end;
$$;

grant execute on function public.increment_vocab_star(uuid, uuid, uuid, text) to authenticated, service_role;
