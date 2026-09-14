import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { getOwnedBatchWithWords, getWordMarks } from "@/lib/vocabBatch";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

const TEST_MODES = [
  { mode: "typing", emoji: "⌨️", label: "타이핑 입력", desc: "한글을 보고 영어 스펠링을 입력해요" },
  { mode: "choice", emoji: "🔤", label: "4지선다", desc: "비슷하게 생긴 보기 중에서 골라요" },
  { mode: "arrange", emoji: "🧩", label: "글자 배열", desc: "섞인 글자 타일을 순서대로 놓아요" },
] as const;

export default async function CheckModeHubPage({ params }: { params: { batchId: string } }) {
  await requireProfile(); // 로그인 안 했으면 /login으로 — 부모/자녀 모두 여기까지는 들어올 수 있음

  const result = await getOwnedBatchWithWords(params.batchId);
  if (!result) notFound();
  const { batch, words, child, requester } = result;

  const supabase = createClient();
  const { data: stars } = await supabase
    .from("vocab_stars")
    .select("mode, star_count")
    .eq("child_id", child.id)
    .eq("batch_id", batch.id);
  const starByMode = new Map((stars ?? []).map((s) => [s.mode, s.star_count]));

  const marks = await getWordMarks(child.id);
  const unknownWords = words.filter((w) => marks.get(w.id) === "unknown");

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href="/check" />
        {requester.role === "parent" && <p className="mb-2 text-center text-sm text-soft">{child.name} 미리보기</p>}
        <h1 className="mb-6 mt-1 text-center text-xl font-bold">{batch.title}</h1>

        <Link href={`/check/${batch.id}/review`} className="card mb-4 block text-center">
          <p className="text-2xl">📖</p>
          <p className="font-bold">복습하기</p>
          <p className="text-sm text-soft">한글을 보고 터치하면 영어가 나와요</p>
        </Link>

        {/* 복습 중 "몰라요"로 표시한 단어를 복습이 끝나길 기다리지 않고 바로 여기서 보여준다
            (2026-09-14 사용자 요청 — "복습이 다 끝난 후에만 보인다"는 문제 수정). */}
        {unknownWords.length > 0 && (
          <div className="card mb-4 border-red-300 bg-red-50">
            <p className="mb-2 font-bold text-red-600">🤔 헷갈리는 단어 ({unknownWords.length}개)</p>
            <ul className="mb-3 flex flex-col gap-1">
              {unknownWords.map((w) => (
                <li key={w.id} className="flex justify-between border-b border-red-100 py-1 text-sm">
                  <span>{w.korean}</span>
                  <span className="font-bold">{w.english}</span>
                </li>
              ))}
            </ul>
            <Link href={`/check/${batch.id}/review?only=unknown`} className="btn btn-primary mb-0">
              이 단어만 다시 복습
            </Link>
          </div>
        )}

        <p className="mb-2 text-center text-sm font-bold text-soft">시험 도전</p>
        <div className="flex flex-col gap-3">
          {TEST_MODES.map(({ mode, emoji, label, desc }) => (
            <Link key={mode} href={`/check/${batch.id}/${mode}`} className="card mb-0 flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <span className="flex-1">
                <span className="block font-bold">{label}</span>
                <span className="block text-sm text-soft">{desc}</span>
              </span>
              <span className="font-bold text-b">⭐ {starByMode.get(mode) ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
