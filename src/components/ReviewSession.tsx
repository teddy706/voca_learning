"use client";

import { useState } from "react";
import Link from "next/link";

export interface ReviewWord {
  id: string;
  korean: string;
  english: string;
  mark: "known" | "unknown" | null;
}

// 복습(암기) 모드 — 채점 없음. 한글을 보여주고 카드를 탭하면 영어가 뒤집혀 나온다. 뒤집은 뒤
// "몰라요"/"알아요"로 자기평가를 남기면 vocab_word_marks에 저장돼(다른 세션에서도) 계속
// 남는다 — 카드에 "✅ 예전에 알아요로 표시함" 배지를 보여줄 수 있는 이유. 세션 끝나면
// "헷갈리는 단어(몰라요)만 다시 복습"으로 좁혀서 반복할 수 있다.
export function ReviewSession({
  batchId,
  childId,
  words,
}: {
  batchId: string;
  childId: string;
  words: ReviewWord[];
}) {
  const [sessionWords, setSessionWords] = useState(words);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [marks, setMarks] = useState<Map<string, "known" | "unknown">>(
    () => new Map(words.filter((w) => w.mark).map((w) => [w.id, w.mark as "known" | "unknown"]))
  );
  const [saving, setSaving] = useState(false);

  const current = sessionWords[index];
  const finished = index >= sessionWords.length;

  async function mark(status: "known" | "unknown") {
    if (!current || saving) return;
    setSaving(true);
    setMarks((prev) => new Map(prev).set(current.id, status));
    try {
      const res = await fetch("/api/vocab-word-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, wordId: current.id, status }),
      });
      if (!res.ok) console.error("단어 표시 저장 실패:", await res.json());
    } finally {
      setSaving(false);
      next();
    }
  }

  function next() {
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function prev() {
    if (index === 0) return;
    setFlipped(false);
    setIndex((i) => i - 1);
  }

  function restart(list: ReviewWord[] = words) {
    setSessionWords(list);
    setIndex(0);
    setFlipped(false);
  }

  if (words.length === 0) {
    return <p className="text-center text-sm text-soft">이 단어장에는 단어가 없어요.</p>;
  }

  if (finished) {
    const unknownWords = sessionWords.filter((w) => marks.get(w.id) === "unknown");
    const knownCount = sessionWords.filter((w) => marks.get(w.id) === "known").length;

    return (
      <div className="card text-center">
        <p className="mb-2 text-lg font-bold">📖 복습 완료!</p>
        <p className="mb-4 text-sm text-soft">
          알아요 {knownCount}개 · 헷갈려요 {unknownWords.length}개
        </p>
        {unknownWords.length > 0 && (
          <button
            type="button"
            onClick={() => restart(unknownWords)}
            className="btn btn-primary mb-0"
          >
            헷갈리는 단어만 다시 복습 ({unknownWords.length}개)
          </button>
        )}
        <button type="button" onClick={() => restart()} className="btn btn-outline mb-0 mt-3">
          처음부터 다시 복습
        </button>
        <Link href={`/check/${batchId}`} className="btn btn-outline mb-0 mt-3">
          시험 도전하러 가기
        </Link>
      </div>
    );
  }

  const currentMark = marks.get(current.id);

  return (
    <div>
      <p className="mb-1 text-center text-sm text-soft">
        {index + 1} / {sessionWords.length}
      </p>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="card relative mb-4 flex min-h-40 w-full flex-col items-center justify-center gap-2 text-center transition-transform active:scale-[0.98]"
      >
        {currentMark === "known" && (
          <span className="absolute right-3 top-3 rounded-full border-2 border-ink bg-a-light px-2 py-0.5 text-xs font-bold">
            ✅ 예전에 알아요
          </span>
        )}
        {currentMark === "unknown" && (
          <span className="absolute right-3 top-3 rounded-full border-2 border-ink bg-b-light px-2 py-0.5 text-xs font-bold">
            🤔 예전에 몰라요
          </span>
        )}
        <p className="text-3xl font-bold">{flipped ? current.english : current.korean}</p>
        <p className="text-sm text-soft">{flipped ? "다시 탭하면 한글이 나와요" : "탭하면 영어가 나와요"}</p>
      </button>

      {flipped && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => mark("unknown")}
            disabled={saving}
            className="btn btn-outline mb-0 flex-1 border-red-400 text-red-500"
          >
            🤔 몰라요
          </button>
          <button
            type="button"
            onClick={() => mark("known")}
            disabled={saving}
            className="btn btn-primary mb-0 flex-1"
          >
            ✅ 알아요
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={prev} disabled={index === 0} className="btn btn-outline mb-0 flex-1">
          이전
        </button>
        <button type="button" onClick={next} className="btn btn-outline mb-0 flex-1">
          건너뛰기
        </button>
      </div>
    </div>
  );
}
