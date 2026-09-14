import "server-only";
import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface ActingContext {
  requester: Profile;
  child: Profile;
}

/**
 * 지금 로그인한 세션이 childId로 지정된 자녀를 대신해 단어 점검(조회/제출/별 적립)을 할 권한이
 * 있는지 확인한다.
 * - 본인이 그 자녀 세션이면 그대로 허용.
 * - 부모 세션이면, 그 자녀가 같은 가족 소속인지 확인한 뒤 허용(리딩버디의 "부모는 자녀 전체
 *   대신 조회/수정 가능" 패턴과 동일 — 부모가 PIN 없이도 자녀 화면을 미리 써볼 수 있게 한다).
 * 권한이 없으면 null.
 */
export async function resolveActingChild(childId: string): Promise<ActingContext | null> {
  const requester = await getCurrentProfile();
  if (!requester) return null;

  if (requester.role === "child") {
    return requester.id === childId ? { requester, child: requester } : null;
  }

  const supabase = createClient();
  const { data: child } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", childId)
    .eq("family_id", requester.family_id)
    .eq("role", "child")
    .maybeSingle();
  if (!child) return null;

  return { requester, child: child as Profile };
}
