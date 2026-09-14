"use client";

import { useMemo, useState } from "react";
import { buildChoices } from "@/lib/distractors";
import { SessionSummary, type WrongWord } from "@/components/SessionSummary";

export interface ChoiceWord {
  id: string;
  korean: string;
  english: string;
}

type Feedback = { status: "correct" | "incorrect"; correctAnswer: string; picked: string } | null;

// 점검 모드 — 4지선다 응답 (PRD 4.3/4.3.1). 각 문제마다 정답 + 디스트랙터 3개를 섞어 보여주고,
// 탭하면 즉시 서버에 제출해 채점한다(서버가 authoritative — /api/vocab-attempts).
export function ChoiceSession({
  batchId,
  childId,
  words,
  pool,
}: {
  batchId: string;
  childId: string;
  words: ChoiceWord[];
  pool: string[];
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<WrongWord[]>([]);

  const current = words[index];
  const finished = index >= words.length;

  // 문제마다 보기를 한 번만 섞도록 세션 시작 시 전부 미리 계산해둔다(다시 렌더돼도 안 바뀌게).
  const choicesByWord = useMemo(() => {
    return words.map((w) => {
      const otherPool = pool.filter((p) => p.toLowerCase() !== w.english.toLowerCase());
      return buildChoices(w.english, otherPool, 4);
    });
  }, [words, pool]);

  async function pick(choice: string) {
    if (!current || submitting || feedback) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vocab-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          wordId: current.id,
          userInput: choice,
          mode: "check",
          answerMode: "choice",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("vocab-attempts 제출 실패:", data);
        return;
      }
      if (data.isCorrect) {
        setCorrectCount((n) => n + 1);
        setFeedback({ status: "correct", correctAnswer: data.correctAnswer, picked: choice });
        setTimeout(next, 600);
      } else {
        setWrongWords((list) => [...list, current]);
        setFeedback({ status: "incorrect", correctAnswer: data.correctAnswer, picked: choice });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setFeedback(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setFeedback(null);
    setCorrectCount(0);
    setWrongWords([]);
  }

  if (words.length === 0) {
    return <p className="text-center text-sm text-soft">이 단어장에는 단어가 없어요.</p>;
  }

  if (finished) {
    return (
      <SessionSummary
        batchId={batchId}
        childId={childId}
        mode="choice"
        total={words.length}
        correctCount={correctCount}
        wrongWords={wrongWords}
        onRestart={restart}
      />
    );
  }

  const choices = choicesByWord[index];

  return (
    <div className="card">
      <p className="mb-1 text-center text-sm text-soft">
        {index + 1} / {words.length}
      </p>
      <p className="mb-6 text-center text-3xl font-bold">{current.korean}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {choices.map((choice) => {
          const isPicked = feedback?.picked === choice;
          const isAnswer = feedback && choice === feedback.correctAnswer;
          const style = !feedback
            ? "border-ink bg-white"
            : isAnswer
              ? "border-green-600 bg-green-50 text-green-700"
              : isPicked
                ? "border-red-500 bg-red-50 text-red-600"
                : "border-ink bg-white opacity-50";
          return (
            <button
              key={choice}
              type="button"
              onClick={() => pick(choice)}
              disabled={submitting || feedback !== null}
              className={`rounded-btn border-2 px-4 py-3 text-lg font-bold transition-transform active:scale-95 disabled:opacity-100 ${style}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {feedback && (
        <button type="button" onClick={next} className="btn btn-primary mt-4 mb-0">
          다음
        </button>
      )}
    </div>
  );
}
