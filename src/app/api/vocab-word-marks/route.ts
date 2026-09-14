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

  // select-then-insert/update는 동시 요청(예: 같은 단어를 빠르게 두 번 탭)이 둘 다 "기존 행 없음"을
  // 보고 동시에 insert를 시도해 유니크 제약(child_id, word_id) 위반 500을 낼 수 있었다(코드 리뷰에서
  // 발견). status는 산술 연산이 필요 없는 단순 값 교체라 upsert 한 번으로 원자적으로 끝난다.
  const { error } = await supabase.from("vocab_word_marks").upsert(
    {
      family_id: child.family_id,
      child_id: child.id,
      word_id: wordId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,word_id" }
  );

  if (error) {
    console.error("vocab_word_marks 갱신 실패:", error);
    return NextResponse.json({ error: "저장에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ status });
}
