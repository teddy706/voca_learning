import { notFound } from "next/navigation";
import { getOwnedBatchWithWords, getWordMarks } from "@/lib/vocabBatch";
import { ReviewSession, type ReviewWord } from "@/components/ReviewSession";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: { batchId: string };
  searchParams: { only?: string };
}) {
  const result = await getOwnedBatchWithWords(params.batchId);
  if (!result) notFound();

  const marks = await getWordMarks(result.child.id);
  let words: ReviewWord[] = result.words.map((w) => ({ ...w, mark: marks.get(w.id) ?? null }));

  // 모드 허브의 "헷갈리는 단어만 다시 복습" 카드에서 넘어온 경우 — 복습을 끝까지 안 해도
  // 바로 몰라요 단어만 골라서 시작한다(2026-09-14 사용자 요청).
  if (searchParams.only === "unknown") {
    words = words.filter((w) => w.mark === "unknown");
  }

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href={`/check/${result.batch.id}`} />
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">
          {result.batch.title} · 복습{searchParams.only === "unknown" ? " (헷갈리는 단어만)" : ""}
        </h1>
        <ReviewSession batchId={result.batch.id} childId={result.child.id} words={words} />
      </div>
    </div>
  );
}
