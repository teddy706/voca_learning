import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveActingChild } from "@/lib/vocabAuth";

const VALID_STATUSES = ["known", "unknown"] as const;
type Status = (typeof VALID_STATUSES)[number];

// 복습 모드에서 "알아요"/"몰라요"를 누르면 단어별로 최신 자기평가 상태를 저장한다(vocab_attempts와
// 별개 — 채점이 아니라 자기평가). child_id+word_id당 하나만 유지하고 계속 갱신한다.
export async function POST(request: Request) {
  const { childId, wordId, status } = await request.json();
  if (!childId || !wordId || !VALID_STATUSES.includes(status as Status)) {
    return NextResponse.json({ error: "childId, wordId, status(known/unknown)가 필요해요." }, { status: 400 });
  }

  const acting = await resolveActingChild(childId);
  if (!acting) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }
  const child = acting.child;

  const supabase = createClient();
  const { data: word } = await supabase
    .from("vocab_words")
    .select("id")
    .eq("id", wordId)
    .eq("child_id", child.id)
    .maybeSingle();
  if (!word) {
    return NextResponse.json({ error: "단어를 찾을 수 없어요." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("vocab_word_marks")
    .select("id")
    .eq("child_id", child.id)
    .eq("word_id", wordId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("vocab_word_marks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("vocab_word_marks").insert({
        family_id: child.family_id,
        child_id: child.id,
        word_id: wordId,
        status,
      });

  if (error) {
    console.error("vocab_word_marks 갱신 실패:", error);
    return NextResponse.json({ error: "저장에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ status });
}
