import { notFound } from "next/navigation";
import { getOwnedBatchWithWords } from "@/lib/vocabBatch";
import { ReviewSession } from "@/components/ReviewSession";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: { batchId: string } }) {
  const result = await getOwnedBatchWithWords(params.batchId);
  if (!result) notFound();

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href={`/check/${result.batch.id}`} />
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">{result.batch.title} · 복습</h1>
        <ReviewSession batchId={result.batch.id} words={result.words} />
      </div>
    </div>
  );
}
