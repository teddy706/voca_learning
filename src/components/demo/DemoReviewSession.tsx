"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSpeechMuted, setSpeechMuted, speakEnglish } from "@/lib/speech";
import type { DemoWord } from "@/lib/demoWords";

// 실제 ReviewSession.tsx의 체험판 버전 — 로그인/자녀 프로필이 없으니 "알아요/몰라요" 표시는
// 서버에 저장하지 않고 이번 세션 동안만 메모리에 들고 있는다(vocab_word_marks 테이블 없음).
export function DemoReviewSession({ words }: { words: DemoWord[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [marks, setMarks] = useState<Map<string, "known" | "unknown">>(new Map());
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isSpeechMuted());
  }, []);

  function toggleMuted() {
    const next = !muted;
    setMuted(next);
    setSpeechMuted(next);
  }

  const current = words[index];
  const finished = index >= words.length;

  function toggleFlip() {
    const willShowEnglish = !flipped;
    setFlipped(willShowEnglish);
    if (willShowEnglish) speakEnglish(current.english);
  }

  function mark(status: "known" | "unknown") {
    setMarks((prev) => new Map(prev).set(current.id, status));
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setMarks(new Map());
  }

  if (finished) {
    const knownCount = words.filter((w) => marks.get(w.id) === "known").length;
    const unknownCount = words.filter((w) => marks.get(w.id) === "unknown").length;

    return (
      <div className="card text-center">
        <p className="mb-2 text-lg font-bold">📖 체험판 복습 완료!</p>
        <p className="mb-4 text-sm text-soft">
          알아요 {knownCount}개 · 헷갈려요 {unknownCount}개
        </p>
        <button type="button" onClick={restart} className="btn btn-outline mb-0">
          다시 복습하기
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
    <div>
      <div className="mb-1 flex items-center justify-center gap-2">
        <p className="text-center text-sm text-soft">
          {index + 1} / {words.length}
        </p>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={muted}
          aria-label={muted ? "발음 재생 켜기" : "발음 재생 끄기"}
          className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-sm leading-none"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <button
        type="button"
        onClick={toggleFlip}
        className="card relative mb-4 flex min-h-40 w-full flex-col items-center justify-center gap-2 text-center transition-transform active:scale-[0.98]"
      >
        <p className="text-3xl font-bold">{flipped ? current.english : current.korean}</p>
        <p className="text-sm text-soft">{flipped ? "다시 탭하면 한글이 나와요" : "탭하면 영어가 나와요"}</p>
      </button>

      {flipped && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => mark("unknown")}
            className="btn btn-outline mb-0 flex-1 border-red-400 text-red-500"
          >
            🤔 몰라요
          </button>
          <button type="button" onClick={() => mark("known")} className="btn btn-primary mb-0 flex-1">
            ✅ 알아요
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setFlipped(false);
          setIndex((i) => i + 1);
        }}
        className="btn btn-outline mb-0"
      >
        건너뛰기
      </button>
    </div>
  );
}
