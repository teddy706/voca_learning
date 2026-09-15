"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildChoices, buildLetterTiles } from "@/lib/distractors";
import type { DemoWord } from "@/lib/demoWords";

type Feedback = { status: "correct" | "incorrect" } | null;
type QuizMode = "typing" | "choice" | "arrange";

// 실제 CheckSession/ChoiceSession/ArrangeSession의 체험판 버전. 로그인/자녀 프로필이 없어
// /api/vocab-attempts로 채점할 수 없으므로(서버가 요구하는 child_id/word_id가 실존 DB 행이
// 아님) 클라이언트에서 직접 채점한다 — 데모는 결과를 저장하지 않는 1회성 체험이라 서버
// 라운드트립도 원래 필요 없다. 세 유형을 한 컴포넌트로 묶은 이유는 채점/진행 로직(정답 비교,
// 정오답 피드백, 요약 화면)이 완전히 같고 입력 UI만 다르기 때문 — 실 서비스 쪽처럼 컴포넌트를
// 3개로 쪼개면 이 로직이 그대로 세 번 복붙된다.
export function DemoQuizSession({ mode, words }: { mode: QuizMode; words: DemoWord[] }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [placement, setPlacement] = useState<(number | null)[]>([]);
  const [tileUsed, setTileUsed] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<DemoWord[]>([]);

  const current = words[index];
  const finished = index >= words.length;
  const pool = useMemo(() => words.map((w) => w.english), [words]);

  // choices/tiles는 shuffle()이 Math.random()을 쓰므로, 서버 렌더 시 한 번·클라이언트
  // 하이드레이션 시 또 한 번 실행되면 두 결과가 달라져 "Text content did not match"
  // 하이드레이션 에러가 난다(2026-09-15, 데모를 실제 브라우저로 테스트하다 발견). 마운트 전에는
  // 빈 값을 렌더해 서버/클라이언트 첫 렌더를 동일하게 맞추고, 마운트 후에만(useEffect, 클라이언트
  // 전용) 실제로 섞은 값을 계산한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const choices = useMemo(() => {
    if (!mounted || mode !== "choice" || !current) return [];
    return buildChoices(
      current.english,
      pool.filter((w) => w !== current.english),
      4
    );
  }, [mounted, mode, current, pool]);

  const tiles = useMemo(() => {
    if (!mounted || mode !== "arrange" || !current) return null;
    return buildLetterTiles(current.english);
  }, [mounted, mode, current]);

  // 문제가 바뀔 때(index 변경) 글자 배열 슬롯을 초기화 — ArrangeSession.tsx와 동일한 이유로
  // useEffect 대신 렌더 중 계산한다(슬롯 길이가 매번 바뀜).
  const slotCount = tiles?.letterIndexes.length ?? 0;
  if (mode === "arrange" && tiles && placement.length !== slotCount) {
    setPlacement(new Array(slotCount).fill(null));
    setTileUsed(new Array(slotCount).fill(false));
  }

  function judge(userAnswer: string) {
    if (!current || feedback) return;
    const isCorrect = userAnswer.trim().toLowerCase() === current.english.toLowerCase();
    if (isCorrect) {
      setCorrectCount((n) => n + 1);
      setFeedback({ status: "correct" });
      setTimeout(next, 600);
    } else {
      setWrongWords((list) => [...list, current]);
      setFeedback({ status: "incorrect" });
    }
  }

  function placeTile(tileIdx: number) {
    if (feedback || !tiles || tileUsed[tileIdx]) return;
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
    if (feedback) return;
    const tileIdx = placement[pos];
    if (tileIdx === null) return;
    const nextPlacement = [...placement];
    nextPlacement[pos] = null;
    const nextUsed = [...tileUsed];
    nextUsed[tileIdx] = false;
    setPlacement(nextPlacement);
    setTileUsed(nextUsed);
  }

  function submitArrange() {
    if (!tiles || placement.some((p) => p === null)) return;
    const assembledChars = [...tiles.chars];
    tiles.letterIndexes.forEach((charIdx, slotIdx) => {
      const tileIdx = placement[slotIdx]!;
      assembledChars[charIdx] = tiles.tiles[tileIdx];
    });
    judge(assembledChars.join(""));
  }

  function next() {
    setFeedback(null);
    setInput("");
    setPlacement([]);
    setTileUsed([]);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setInput("");
    setPlacement([]);
    setTileUsed([]);
    setFeedback(null);
    setCorrectCount(0);
    setWrongWords([]);
  }

  if (finished) {
    const perfect = wrongWords.length === 0;
    return (
      <div className="card text-center">
        <p className="mb-2 text-lg font-bold">
          {words.length}문제 중 {correctCount}개 정답!
        </p>
        {perfect && <p className="mb-2 text-2xl">🌟 만점! 실제 앱에서는 별이 쌓여요</p>}
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
          다시 도전하기
        </button>
        <Link href="/demo" className="btn btn-outline mb-0 mt-3">
          다른 체험 해보기
        </Link>
        <Link href="/login" className="btn btn-primary mb-0 mt-3">
          가입하고 전체 단어장 시작하기
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

      {mode === "typing" && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (feedback) next();
            else judge(input);
          }}
          readOnly={feedback !== null}
          placeholder="영어 스펠링을 입력하세요"
          className="input"
          autoFocus
        />
      )}

      {mode === "choice" && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => judge(choice)}
              disabled={feedback !== null}
              className="btn btn-outline mb-0 lowercase disabled:opacity-50"
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {mode === "arrange" && tiles && (
        <>
          <div className="mb-4 flex flex-wrap justify-center gap-1.5">
            {(() => {
              let slotIdx = 0;
              return tiles.chars.map((ch, i) => {
                if (ch === " ") return <span key={i} className="w-3" />;
                const mySlot = slotIdx++;
                const tileIdx = placement[mySlot];
                const letter = tileIdx !== null ? tiles.tiles[tileIdx] : null;
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
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {tiles.tiles.map((char, i) => (
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
        </>
      )}

      {feedback?.status === "incorrect" && (
        <p className="mb-2 text-center text-sm font-semibold text-red-500">정답: {current.english}</p>
      )}
      {feedback?.status === "correct" && (
        <p className="mb-2 text-center text-sm font-semibold text-green-600">정답이에요!</p>
      )}

      {feedback?.status === "incorrect" ? (
        <button type="button" onClick={next} className="btn btn-primary mb-0">
          다음
        </button>
      ) : mode === "typing" ? (
        <button type="button" onClick={() => judge(input)} disabled={!input} className="btn btn-primary mb-0">
          확인
        </button>
      ) : mode === "arrange" ? (
        <button
          type="button"
          onClick={submitArrange}
          disabled={placement.length === 0 || placement.some((p) => p === null)}
          className="btn btn-primary mb-0"
        >
          확인
        </button>
      ) : null}
    </div>
  );
}
