import { notFound } from "next/navigation";
import { getOwnedBatchWithWords, getWordMarks } from "@/lib/vocabBatch";
import { ReviewSession, type ReviewWord } from "@/components/ReviewSession";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: { batchId: string } }) {
  const result = await getOwnedBatchWithWords(params.batchId);
  if (!result) notFound();

  const marks = await getWordMarks(
    result.child.id,
    result.words.map((w) => w.id)
  );
  const words: ReviewWord[] = result.words.map((w) => ({ ...w, mark: marks.get(w.id) ?? null }));

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href={`/check/${result.batch.id}`} />
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">{result.batch.title} · 복습</h1>
        <ReviewSession batchId={result.batch.id} childId={result.child.id} words={words} />
      </div>
    </div>
  );
}
