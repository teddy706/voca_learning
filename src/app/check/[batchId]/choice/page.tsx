import { notFound } from "next/navigation";
import { getOwnedBatchWithWords, getChildWordPool } from "@/lib/vocabBatch";
import { ChoiceSession } from "@/components/ChoiceSession";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function ChoiceCheckPage({ params }: { params: { batchId: string } }) {
  const result = await getOwnedBatchWithWords(params.batchId);
  if (!result) notFound();
  const pool = await getChildWordPool(result.child.id);

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href={`/check/${result.batch.id}`} />
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">{result.batch.title} · 4지선다</h1>
        <ChoiceSession batchId={result.batch.id} childId={result.child.id} words={result.words} pool={pool} />
      </div>
    </div>
  );
}
