import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";
import {
  childProfileEmail,
  deriveChildAuthPassword,
  isPinLocked,
  isValidPin,
  PIN_LOCK_DURATION_MS,
  PIN_MAX_ATTEMPTS,
} from "@/lib/childAuth";

// PIN 검증 + 자녀 세션 전환. 이 라우트를 타는 시점엔 아직 부모 세션이 살아있다
// (② 프로필 선택 화면에서 온 요청) — 성공하면 이 요청이 부모 세션을 자녀의 synthetic
// 계정 세션으로 "교체"한다(docs/PRD.md 9.1 구현 노트 참고).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requester = await getCurrentProfile();
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { pin } = await request.json();
  if (!isValidPin(String(pin ?? ""))) {
    return NextResponse.json({ error: "PIN 4자리를 입력해주세요." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, family_id, role, pin_fail_count, pin_locked_until")
    .eq("id", params.id)
    .eq("family_id", requester.family_id)
    .eq("role", "child")
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없어요." }, { status: 404 });
  }

  if (isPinLocked(profile)) {
    const remainingSec = Math.max(0, Math.ceil((new Date(profile.pin_locked_until!).getTime() - Date.now()) / 1000));
    return NextResponse.json(
      { error: `너무 많이 틀렸어요. ${remainingSec}초 후 다시 시도해주세요.`, lockedForSec: remainingSec },
      { status: 429 }
    );
  }

  const email = childProfileEmail(profile.id);
  const password = deriveChildAuthPassword(profile.id, String(pin));

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 원자적 DB 함수(0007_atomic_counters.sql)로 증가 — "읽고 나서 +1해서 쓰기"를 애플리케이션
    // 레벨에서 하면 동시 요청이 같은 값을 읽어 카운터가 절대 임계값에 안 닿는 레이스가 생긴다
    // (코드 리뷰에서 발견, 리딩버디 원본 코드에도 같은 버그가 있을 가능성이 있음).
    const { data: rpcResult, error: rpcError } = await admin.rpc("record_pin_failure", {
      p_profile_id: profile.id,
      p_max_attempts: PIN_MAX_ATTEMPTS,
      p_lock_ms: PIN_LOCK_DURATION_MS,
    });
    if (rpcError) {
      console.error("record_pin_failure RPC 실패:", rpcError);
      return NextResponse.json({ error: "처리 중 문제가 생겼어요." }, { status: 500 });
    }
    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    const nextCount: number = result.fail_count;
    const lockedUntil: string | null = result.locked_until;

    if (lockedUntil) {
      return NextResponse.json(
        { error: "너무 많이 틀렸어요. 1분 후 다시 시도해주세요.", lockedForSec: PIN_LOCK_DURATION_MS / 1000 },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "PIN이 맞지 않아요.", attemptsLeft: Math.max(0, PIN_MAX_ATTEMPTS - nextCount) },
      { status: 401 }
    );
  }

  await admin.from("profiles").update({ pin_fail_count: 0, pin_locked_until: null }).eq("id", profile.id);
  return NextResponse.json({ ok: true });
}
