import { notFound } from "next/navigation";
import { getOwnedBatchWithWords } from "@/lib/vocabBatch";
import { ArrangeSession } from "@/components/ArrangeSession";

export const dynamic = "force-dynamic";

export default async function ArrangeCheckPage({ params }: { params: { batchId: string } }) {
  const result = await getOwnedBatchWithWords(params.batchId);
  if (!result) notFound();

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">{result.batch.title} · 글자 배열</h1>
        <ArrangeSession batchId={result.batch.id} childId={result.child.id} words={result.words} />
      </div>
    </div>
  );
}
