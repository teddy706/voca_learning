import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveActingChild } from "@/lib/vocabAuth";

// 채점은 서버에서 한다 — 클라이언트가 보낸 is_correct를 그대로 믿지 않고, 정답(vocab_words.english)을
// 직접 조회해 trim + 대소문자 무시로 비교한다(PRD 4.3). 이렇게 하면 devtools로 값을 조작해도
// vocab_attempts 기록과 화면 피드백이 항상 서버 판정과 일치한다.
function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  const { childId, wordId, userInput, mode, answerMode } = await request.json();
  if (!childId || !wordId || typeof userInput !== "string") {
    return NextResponse.json({ error: "childId, wordId, userInput이 필요해요." }, { status: 400 });
  }
  if (mode !== "check" && mode !== "game") {
    return NextResponse.json({ error: "mode는 check 또는 game이어야 해요." }, { status: 400 });
  }
  if (answerMode !== "typing" && answerMode !== "choice" && answerMode !== "arrange") {
    return NextResponse.json({ error: "answerMode는 typing/choice/arrange 중 하나여야 해요." }, { status: 400 });
  }

  // 자녀 본인이거나(자녀 세션), 같은 가족 부모여야 그 childId를 대신해 시도를 기록할 수 있다
  // (부모가 자녀 화면을 미리 써볼 수 있게 하는 것과 같은 권한 모델 — src/lib/vocabAuth.ts).
  const acting = await resolveActingChild(childId);
  if (!acting) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }
  const child = acting.child;

  const supabase = createClient();
  const { data: word } = await supabase
    .from("vocab_words")
    .select("id, english, child_id")
    .eq("id", wordId)
    .eq("child_id", child.id)
    .maybeSingle();

  if (!word) {
    return NextResponse.json({ error: "단어를 찾을 수 없어요." }, { status: 404 });
  }

  const isCorrect = normalize(userInput) === normalize(word.english);

  const { error } = await supabase.from("vocab_attempts").insert({
    family_id: child.family_id,
    word_id: word.id,
    child_id: child.id,
    mode,
    answer_mode: answerMode,
    user_input: userInput,
    is_correct: isCorrect,
  });

  if (error) {
    console.error("vocab_attempts insert 실패:", error);
    return NextResponse.json({ error: "기록 저장에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ isCorrect, correctAnswer: word.english });
}
