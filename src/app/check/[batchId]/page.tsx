import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { resolveActingChild } from "@/lib/vocabAuth";

export const dynamic = "force-dynamic";

const TEST_MODES = [
  { mode: "typing", emoji: "⌨️", label: "타이핑 입력", desc: "한글을 보고 영어 스펠링을 입력해요" },
  { mode: "choice", emoji: "🔤", label: "4지선다", desc: "비슷하게 생긴 보기 중에서 골라요" },
  { mode: "arrange", emoji: "🧩", label: "글자 배열", desc: "섞인 글자 타일을 순서대로 놓아요" },
] as const;

export default async function CheckModeHubPage({ params }: { params: { batchId: string } }) {
  await requireProfile(); // 로그인 안 했으면 /login으로 — 부모/자녀 모두 여기까지는 들어올 수 있음

  const supabase = createClient();
  const { data: batch } = await supabase
    .from("vocab_batches")
    .select("id, title, child_id")
    .eq("id", params.batchId)
    .maybeSingle();
  if (!batch) notFound();

  // 부모가 자녀를 대신해 미리 써볼 수 있게(PRD 4.1의 "부모는 자녀 전체 대신 조회/수정 가능"
  // 패턴 확장) — 본인 자녀 세션이거나, 같은 가족 부모여야 통과한다.
  const acting = await resolveActingChild(batch.child_id);
  if (!acting) notFound();

  const { data: stars } = await supabase
    .from("vocab_stars")
    .select("mode, star_count")
    .eq("child_id", batch.child_id)
    .eq("batch_id", batch.id);
  const starByMode = new Map((stars ?? []).map((s) => [s.mode, s.star_count]));

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        {acting.requester.role === "parent" && (
          <p className="mb-2 text-center text-sm text-soft">{acting.child.name} 미리보기</p>
        )}
        <h1 className="mb-6 mt-1 text-center text-xl font-bold">{batch.title}</h1>

        <Link href={`/check/${batch.id}/review`} className="card mb-4 block text-center">
          <p className="text-2xl">📖</p>
          <p className="font-bold">복습하기</p>
          <p className="text-sm text-soft">한글을 보고 터치하면 영어가 나와요</p>
        </Link>

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

        <Link href="/check" className="btn btn-ghost mt-6 mb-0">
          다른 단어장 고르기
        </Link>
      </div>
    </div>
  );
}
