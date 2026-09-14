"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface WrongWord {
  id: string;
  korean: string;
  english: string;
}

// 시험 도전 3종(타이핑/4지선다/글자배열) 공통 결과 화면. 오답이 0개면(만점) 별을 1개 쌓는다 —
// "반복해서 별을 추가할 수 있다"는 요구사항이라 batch+mode당 별 개수는 서버에서 누적된다
// (POST /api/vocab-stars). React 18 StrictMode의 effect 이중 실행으로 별이 2번 쌓이지 않도록
// ref로 한 세션당 한 번만 호출되게 막는다.
export function SessionSummary({
  batchId,
  childId,
  mode,
  total,
  correctCount,
  wrongWords,
  onRestart,
}: {
  batchId: string;
  childId: string;
  mode: "typing" | "choice" | "arrange";
  total: number;
  correctCount: number;
  wrongWords: WrongWord[];
  onRestart: () => void;
}) {
  const [starCount, setStarCount] = useState<number | null>(null);
  const awarded = useRef(false);
  const perfect = wrongWords.length === 0 && total > 0;

  useEffect(() => {
    if (!perfect || awarded.current) return;
    awarded.current = true;
    fetch("/api/vocab-stars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, batchId, mode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.starCount === "number") setStarCount(data.starCount);
      })
      .catch((err) => console.error("별 저장 실패:", err));
  }, [perfect, batchId, childId, mode]);

  return (
    <div className="card text-center">
      <p className="mb-2 text-lg font-bold">
        {total}문제 중 {correctCount}개 정답!
      </p>

      {perfect && (
        <p className="mb-2 text-2xl">
          🌟 만점! {starCount !== null && <span className="text-base font-bold text-b">누적 별 {starCount}개</span>}
        </p>
      )}

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

      <button type="button" onClick={onRestart} className="btn btn-primary mt-4 mb-0">
        다시 도전하기
      </button>
      <Link href={`/check/${batchId}`} className="btn btn-outline mb-0 mt-3">
        다른 유형 고르기
      </Link>
    </div>
  );
}
