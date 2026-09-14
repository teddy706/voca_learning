import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveActingChild } from "@/lib/vocabAuth";

const VALID_MODES = ["typing", "choice", "arrange"] as const;
type Mode = (typeof VALID_MODES)[number];

// 오답 없이 한 단어장(batch)을 다 맞추면 별 1개를 쌓는다(child_id+batch_id+mode당 누적 카운터).
// 클라이언트는 "이 세션은 만점이었다"만 알려주고, 실제로 몇 개 맞았는지는 vocab_attempts에 이미
// 기록돼 있으니 여기서는 카운터 증가만 담당한다.
export async function POST(request: Request) {
  const { childId, batchId, mode } = await request.json();
  if (!childId || !batchId || !VALID_MODES.includes(mode as Mode)) {
    return NextResponse.json({ error: "childId, batchId, mode(typing/choice/arrange)가 필요해요." }, { status: 400 });
  }

  // 자녀 본인이거나 같은 가족 부모여야 한다(부모의 미리보기 지원 — src/lib/vocabAuth.ts).
  const acting = await resolveActingChild(childId);
  if (!acting) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }
  const child = acting.child;

  const supabase = createClient();

  const { data: batch } = await supabase
    .from("vocab_batches")
    .select("id")
    .eq("id", batchId)
    .eq("child_id", child.id)
    .maybeSingle();
  if (!batch) {
    return NextResponse.json({ error: "단어장을 찾을 수 없어요." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("vocab_stars")
    .select("id, star_count")
    .eq("child_id", child.id)
    .eq("batch_id", batchId)
    .eq("mode", mode)
    .maybeSingle();

  const nextCount = (existing?.star_count ?? 0) + 1;

  const { error } = existing
    ? await supabase
        .from("vocab_stars")
        .update({ star_count: nextCount, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("vocab_stars").insert({
        family_id: child.family_id,
        child_id: child.id,
        batch_id: batchId,
        mode,
        star_count: nextCount,
      });

  if (error) {
    console.error("vocab_stars 갱신 실패:", error);
    return NextResponse.json({ error: "별 저장에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ starCount: nextCount });
}
