"use client";

import { useMemo, useState } from "react";
import { shuffle } from "@/lib/distractors";
import { SessionSummary, type WrongWord } from "@/components/SessionSummary";

export interface ArrangeWord {
  id: string;
  korean: string;
  english: string;
}

type Feedback = { status: "correct" | "incorrect"; correctAnswer: string } | null;

// 점검 모드 — 글자 배열 응답. 정답 스펠링의 글자를 섞은 타일을 순서대로 탭해서 빈칸을 채운다.
// 공백(구동사 등 "come from")은 채울 필요 없는 고정 칸으로 그대로 보여준다.
function buildTiles(english: string) {
  const chars = english.toLowerCase().split("");
  const letterIndexes = chars.map((c, i) => (c === " " ? -1 : i)).filter((i) => i !== -1);
  const tiles = shuffle(letterIndexes.map((i) => chars[i]));
  return { chars, letterIndexes, tiles };
}

export function ArrangeSession({
  batchId,
  childId,
  words,
}: {
  batchId: string;
  childId: string;
  words: ArrangeWord[];
}) {
  const [index, setIndex] = useState(0);
  const [placement, setPlacement] = useState<(number | null)[]>([]);
  const [tileUsed, setTileUsed] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<WrongWord[]>([]);

  const current = words[index];
  const finished = index >= words.length;

  const layout = useMemo(() => {
    if (!current) return null;
    return buildTiles(current.english);
  }, [current]);

  // 문제가 바뀔 때 배치 상태를 초기화한다(useMemo가 아니라 렌더 중 계산 — 리스트 길이가
  // 매번 바뀌므로 useEffect보다 이 방식이 더 단순하다).
  const slotCount = layout?.letterIndexes.length ?? 0;
  if (layout && placement.length !== slotCount) {
    setPlacement(new Array(slotCount).fill(null));
    setTileUsed(new Array(slotCount).fill(false));
  }

  function placeTile(tileIdx: number) {
    if (feedback || submitting || !layout) return;
    if (tileUsed[tileIdx]) return;
    const emptyPos = placement.findIndex((p) => p === null);
    if (emptyPos === -1) return;
    const nextPlacement = [...placement];
    nextPlacement[emptyPos] = tileIdx;
    const nextUsed = [...tileUsed];
    nextUsed[tileIdx] = true;
    setPlacement(nextPlacement);
    setTileUsed(nextUsed);
  }

  function clearSlot(pos: number) {
    if (feedback || submitting) return;
    const tileIdx = placement[pos];
    if (tileIdx === null) return;
    const nextPlacement = [...placement];
    nextPlacement[pos] = null;
    const nextUsed = [...tileUsed];
    nextUsed[tileIdx] = false;
    setPlacement(nextPlacement);
    setTileUsed(nextUsed);
  }

  function resetSlots() {
    setPlacement(new Array(slotCount).fill(null));
    setTileUsed(new Array(slotCount).fill(false));
  }

  async function submit() {
    if (!current || !layout || submitting || feedback) return;
    if (placement.some((p) => p === null)) return;

    const assembledChars = [...layout.chars];
    layout.letterIndexes.forEach((charIdx, slotIdx) => {
      const tileIdx = placement[slotIdx]!;
      assembledChars[charIdx] = layout.tiles[tileIdx];
    });
    const assembled = assembledChars.join("");

    setSubmitting(true);
    try {
      const res = await fetch("/api/vocab-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          wordId: current.id,
          userInput: assembled,
          mode: "check",
          answerMode: "arrange",
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
    setPlacement([]);
    setTileUsed([]);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setPlacement([]);
    setTileUsed([]);
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
        mode="arrange"
        total={words.length}
        correctCount={correctCount}
        wrongWords={wrongWords}
        onRestart={restart}
      />
    );
  }

  if (!layout) return null;

  const allFilled = placement.every((p) => p !== null) && placement.length > 0;

  return (
    <div className="card">
      <p className="mb-1 text-center text-sm text-soft">
        {index + 1} / {words.length}
      </p>
      <p className="mb-6 text-center text-3xl font-bold">{current.korean}</p>

      {/* 빈칸: 공백은 고정 간격, 글자 칸은 탭하면 비운다 */}
      <div className="mb-6 flex flex-wrap justify-center gap-1.5">
        {(() => {
          let slotIdx = 0;
          return layout.chars.map((ch, i) => {
            if (ch === " ") return <span key={i} className="w-3" />;
            const mySlot = slotIdx++;
            const tileIdx = placement[mySlot];
            const letter = tileIdx !== null ? layout.tiles[tileIdx] : null;
            return (
              <button
                key={i}
                type="button"
                onClick={() => clearSlot(mySlot)}
                disabled={letter === null || feedback !== null}
                className="flex h-11 w-9 items-center justify-center rounded-btn border-2 border-ink bg-white text-lg font-bold uppercase"
              >
                {letter}
              </button>
            );
          });
        })()}
      </div>

      {/* 글자 타일 */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {layout.tiles.map((char, i) => (
          <button
            key={i}
            type="button"
            onClick={() => placeTile(i)}
            disabled={tileUsed[i] || feedback !== null}
            className="flex h-11 w-9 items-center justify-center rounded-btn border-2 border-ink bg-a-light text-lg font-bold uppercase transition-transform active:scale-95 disabled:opacity-20"
          >
            {char}
          </button>
        ))}
      </div>

      {feedback?.status === "incorrect" && (
        <p className="mb-2 text-center text-sm font-semibold text-red-500">정답: {feedback.correctAnswer}</p>
      )}
      {feedback?.status === "correct" && (
        <p className="mb-2 text-center text-sm font-semibold text-green-600">정답이에요!</p>
      )}

      {feedback?.status === "incorrect" ? (
        <button type="button" onClick={next} className="btn btn-primary mb-0">
          다음
        </button>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={resetSlots} disabled={submitting} className="btn btn-outline mb-0 flex-1">
            지우기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !allFilled}
            className="btn btn-primary mb-0 flex-[2]"
          >
            확인
          </button>
        </div>
      )}
    </div>
  );
}
