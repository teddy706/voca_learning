import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireChildProfileForApi } from "@/lib/currentProfile";

// 채점은 서버에서 한다 — 클라이언트가 보낸 is_correct를 그대로 믿지 않고, 정답(vocab_words.english)을
// 직접 조회해 trim + 대소문자 무시로 비교한다(PRD 4.3). 이렇게 하면 devtools로 값을 조작해도
// vocab_attempts 기록과 화면 피드백이 항상 서버 판정과 일치한다.
function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  const profile = await requireChildProfileForApi();
  if (profile instanceof NextResponse) return profile;

  const { wordId, userInput, mode, answerMode } = await request.json();
  if (!wordId || typeof userInput !== "string") {
    return NextResponse.json({ error: "wordId와 userInput이 필요해요." }, { status: 400 });
  }
  if (mode !== "check" && mode !== "game") {
    return NextResponse.json({ error: "mode는 check 또는 game이어야 해요." }, { status: 400 });
  }
  if (answerMode !== "typing" && answerMode !== "choice") {
    return NextResponse.json({ error: "answerMode는 typing 또는 choice여야 해요." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: word } = await supabase
    .from("vocab_words")
    .select("id, english, child_id")
    .eq("id", wordId)
    .eq("child_id", profile.id)
    .maybeSingle();

  if (!word) {
    return NextResponse.json({ error: "단어를 찾을 수 없어요." }, { status: 404 });
  }

  const isCorrect = normalize(userInput) === normalize(word.english);

  const { error } = await supabase.from("vocab_attempts").insert({
    family_id: profile.family_id,
    word_id: word.id,
    child_id: profile.id,
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
