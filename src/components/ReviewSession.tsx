"use client";

import { useState } from "react";
import Link from "next/link";

export interface ReviewWord {
  id: string;
  korean: string;
  english: string;
}

// 복습(암기) 모드 — 채점 없음. 한글을 보여주고 카드를 탭하면 영어가 뒤집혀 나온다(PRD의
// "스텝1: 복습하는 암기 시간"). vocab_attempts에 아무것도 기록하지 않는다 — 순수 암기용.
export function ReviewSession({ batchId, words }: { batchId: string; words: ReviewWord[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = words[index];
  const finished = index >= words.length;

  function next() {
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function prev() {
    if (index === 0) return;
    setFlipped(false);
    setIndex((i) => i - 1);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
  }

  if (words.length === 0) {
    return <p className="text-center text-sm text-soft">이 단어장에는 단어가 없어요.</p>;
  }

  if (finished) {
    return (
      <div className="card text-center">
        <p className="mb-4 text-lg font-bold">📖 복습 완료!</p>
        <button type="button" onClick={restart} className="btn btn-primary mb-0">
          다시 복습하기
        </button>
        <Link href={`/check/${batchId}`} className="btn btn-outline mb-0 mt-3">
          시험 도전하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-center text-sm text-soft">
        {index + 1} / {words.length}
      </p>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="card mb-4 flex min-h-40 w-full flex-col items-center justify-center gap-2 text-center transition-transform active:scale-[0.98]"
      >
        <p className="text-3xl font-bold">{flipped ? current.english : current.korean}</p>
        <p className="text-sm text-soft">{flipped ? "다시 탭하면 한글이 나와요" : "탭하면 영어가 나와요"}</p>
      </button>

      <div className="flex gap-2">
        <button type="button" onClick={prev} disabled={index === 0} className="btn btn-outline mb-0 flex-1">
          이전
        </button>
        <button type="button" onClick={next} className="btn btn-primary mb-0 flex-1">
          다음
        </button>
      </div>
    </div>
  );
}
