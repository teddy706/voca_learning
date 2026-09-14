import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function BatchList({ childId, backHref }: { childId: string; backHref: string }) {
  const supabase = createClient();
  const { data: batches } = await supabase
    .from("vocab_batches")
    .select("id, title, registered_at, vocab_batch_items(count)")
    .eq("child_id", childId)
    .eq("status", "confirmed")
    .order("registered_at", { ascending: true });

  return (
    <>
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

      <Link href={backHref} className="btn btn-ghost mt-auto mb-0">
        {backHref === "/home" ? "홈으로" : "다른 자녀 고르기"}
      </Link>
    </>
  );
}

export default async function CheckBatchListPage({ searchParams }: { searchParams: { childId?: string } }) {
  const requester = await requireProfile();

  // 자녀 본인 세션 → 항상 본인 단어장만. 부모 세션 → ?childId로 미리 볼 자녀를 고른다(PIN 없이,
  // src/lib/vocabAuth.ts와 같은 "부모는 가족 전체 대신 조회 가능" 권한 모델).
  if (requester.role === "child") {
    return (
      <div className="app-shell">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <h1 className="mb-1 mt-1 text-center text-2xl font-bold">단어장 점검</h1>
          <p className="mb-6 text-center text-sm text-soft">점검할 단어장을 골라주세요</p>
          <BatchList childId={requester.id} backHref="/home" />
        </div>
      </div>
    );
  }

  if (!searchParams.childId) {
    const supabase = createClient();
    const { data: children } = await supabase
      .from("profiles")
      .select("*")
      .eq("family_id", requester.family_id)
      .eq("role", "child")
      .order("created_at", { ascending: true });

    return (
      <div className="app-shell">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <h1 className="mb-1 mt-1 text-center text-2xl font-bold">누구 단어장을 볼까요?</h1>
          <p className="mb-6 text-center text-sm text-soft">부모 계정으로 자녀 화면을 미리 볼 수 있어요</p>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {((children ?? []) as Profile[]).map((c) => (
              <Link key={c.id} href={`/check?childId=${c.id}`} className="profile-card">
                <Avatar emoji={c.avatar} size="lg" />
                <span className="font-bold">{c.name}</span>
              </Link>
            ))}
          </div>
          <Link href="/profiles" className="btn btn-ghost mt-auto mb-0">
            뒤로
          </Link>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data: child } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", searchParams.childId)
    .eq("family_id", requester.family_id)
    .eq("role", "child")
    .maybeSingle();
  if (!child) notFound();

  return (
    <div className="app-shell">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <p className="mb-1 mt-1 text-center text-sm text-soft">{child.name} 미리보기</p>
        <h1 className="mb-6 text-center text-2xl font-bold">단어장 점검</h1>
        <BatchList childId={child.id} backHref="/check" />
      </div>
    </div>
  );
}
