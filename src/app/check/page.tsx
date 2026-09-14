import Link from "next/link";
import { requireChildProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckBatchListPage() {
  const child = await requireChildProfile();

  const supabase = createClient();
  // 같은 가족이면 형제자매 배치도 select 정책상 보이지만(docs/ARCHITECTURE.md 6장), 이 화면은
  // "내 단어장"만 골라 보여줘야 하므로 child_id로 한 번 더 좁힌다.
  const { data: batches } = await supabase
    .from("vocab_batches")
    .select("id, title, registered_at, vocab_batch_items(count)")
    .eq("child_id", child.id)
    .eq("status", "confirmed")
    .order("registered_at", { ascending: true });

  return (
    <div className="app-shell">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <h1 className="mb-1 mt-1 text-center text-2xl font-bold">단어장 점검</h1>
        <p className="mb-6 text-center text-sm text-soft">점검할 단어장을 골라주세요</p>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(batches ?? []).map((batch) => {
            const count = batch.vocab_batch_items?.[0]?.count ?? 0;
            return (
              <Link key={batch.id} href={`/check/${batch.id}`} className="card mb-0 flex items-center justify-between">
                <span className="font-bold">{batch.title ?? "제목 없음"}</span>
                <span className="text-sm text-soft">{count}개</span>
              </Link>
            );
          })}
        </div>

        {(!batches || batches.length === 0) && (
          <p className="mb-4 text-center text-sm text-soft">아직 등록된 단어장이 없어요.</p>
        )}

        <Link href="/home" className="btn btn-ghost mt-auto mb-0">
          홈으로
        </Link>
      </div>
    </div>
  );
}
