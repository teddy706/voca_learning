"use client";

import { useState } from "react";
import Link from "next/link";

export interface CheckWord {
  id: string;
  korean: string;
  english: string;
}

type Feedback = { status: "correct" | "incorrect"; correctAnswer: string } | null;

// 점검 모드 — 타이핑 응답 (PRD 4.3). 한글 단어를 순서대로 제시 → 영어 입력 → 즉시 채점
// (서버가 trim + 대소문자 무시로 비교, /api/vocab-attempts 참고) → 오답은 정답을 보여준 뒤
// "다음"을 눌러야 넘어간다(정답은 짧게 보여주고 자동으로 넘어감). 세션 끝나면 요약 + 오답 목록.
export function CheckSession({ words }: { words: CheckWord[] }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<CheckWord[]>([]);

  const current = words[index];
  const finished = index >= words.length;

  async function submit() {
    if (!current || submitting || feedback) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vocab-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: current.id,
          userInput: input,
          mode: "check",
          answerMode: "typing",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("vocab-attempts 제출 실패:", data);
        return;
      }
      if (data.isCorrect) {
        setCorrectCount((n) => n + 1);
        setFeedback({ status: "correct", correctAnswer: data.correctAnswer });
        setTimeout(next, 600);
      } else {
        setWrongWords((list) => [...list, current]);
        setFeedback({ status: "incorrect", correctAnswer: data.correctAnswer });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setFeedback(null);
    setInput("");
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setInput("");
    setFeedback(null);
    setCorrectCount(0);
    setWrongWords([]);
  }

  if (words.length === 0) {
    return <p className="text-center text-sm text-soft">이 단어장에는 단어가 없어요.</p>;
  }

  if (finished) {
    return (
      <div className="card text-center">
        <p className="mb-2 text-lg font-bold">
          {words.length}문제 중 {correctCount}개 정답!
        </p>
        {wrongWords.length > 0 && (
          <div className="mt-4 text-left">
            <p className="mb-2 font-bold text-soft">틀린 단어 다시 보기</p>
            <ul className="flex flex-col gap-1">
              {wrongWords.map((w) => (
                <li key={w.id} className="flex justify-between border-b border-[#eee] py-1 text-sm">
                  <span>{w.korean}</span>
                  <span className="font-bold">{w.english}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" onClick={restart} className="btn btn-primary mt-4 mb-0">
          다시 점검하기
        </button>
        <Link href="/check" className="btn btn-outline mb-0 mt-3">
          다른 단어장 고르기
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="mb-1 text-center text-sm text-soft">
        {index + 1} / {words.length}
      </p>
      <p className="mb-6 text-center text-3xl font-bold">{current.korean}</p>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (feedback) {
            next();
          } else {
            submit();
          }
        }}
        disabled={submitting}
        readOnly={feedback !== null}
        placeholder="영어 스펠링을 입력하세요"
        className="input"
        autoFocus
      />

      {feedback?.status === "incorrect" && (
        <p className="mb-2 text-sm font-semibold text-red-500">정답: {feedback.correctAnswer}</p>
      )}
      {feedback?.status === "correct" && <p className="mb-2 text-sm font-semibold text-green-600">정답이에요!</p>}

      {feedback?.status === "incorrect" ? (
        <button type="button" onClick={next} className="btn btn-primary mb-0">
          다음
        </button>
      ) : (
        <button type="button" onClick={submit} disabled={submitting || !input} className="btn btn-primary mb-0">
          확인
        </button>
      )}
    </div>
  );
}
