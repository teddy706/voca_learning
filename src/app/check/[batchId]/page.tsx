import { notFound } from "next/navigation";
import { requireChildProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { CheckSession, type CheckWord } from "@/components/CheckSession";

export const dynamic = "force-dynamic";

export default async function CheckBatchPage({ params }: { params: { batchId: string } }) {
  const child = await requireChildProfile();

  const supabase = createClient();
  const { data: batch } = await supabase
    .from("vocab_batches")
    .select("id, title")
    .eq("id", params.batchId)
    .eq("child_id", child.id)
    .maybeSingle();

  if (!batch) notFound();

  const { data: items } = await supabase
    .from("vocab_batch_items")
    .select("position, word:vocab_words(id, korean, english)")
    .eq("batch_id", batch.id)
    .order("position", { ascending: true });

  // supabase-js는 생성된 DB 타입이 없으면 FK 관계(word_id -> vocab_words.id, 1:1)를 배열로
  // 추론한다 — 실제 런타임 값은 단일 객체이므로 unknown을 거쳐 원하는 타입으로 바꿔준다.
  const words: CheckWord[] = (items ?? [])
    .map((item) => item.word as unknown as CheckWord | null)
    .filter((word): word is CheckWord => word !== null);

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">{batch.title}</h1>
        <CheckSession words={words} />
      </div>
    </div>
  );
}
