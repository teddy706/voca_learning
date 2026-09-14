import { notFound } from "next/navigation";
import { requireParentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BackLink } from "@/components/BackLink";
import { getAvatarPhotoUrl } from "@/lib/avatarPhoto";
import { getBatchHistorySummaries, getChildDashboardStats, getRecentAttempts } from "@/lib/vocabBatch";

export const dynamic = "force-dynamic";

const ANSWER_MODE_LABEL: Record<string, string> = {
  typing: "타이핑",
  choice: "4지선다",
  arrange: "글자 배열",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 자녀 1명의 상세 학습 현황 — DAY별 진행 상황 표(기존 /check 목록과 같은 요약 재사용) +
// 최근 학습 기록. 자녀 본인은 여기 못 들어온다(requireParentProfile) — 자녀용 요약은 이미
// /check 목록의 ⭐/✅/🤔 표기로 충분하고, 이 화면은 부모가 전체를 훑어보는 용도로 분리한다.
export default async function ChildDashboardPage({ params }: { params: { childId: string } }) {
  const parent = await requireParentProfile();

  const supabase = createClient();
  const { data: child } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.childId)
    .eq("family_id", parent.family_id)
    .eq("role", "child")
    .maybeSingle();
  if (!child) notFound();

  const { data: batches } = await supabase
    .from("vocab_batches")
    .select("id, title, registered_at, vocab_batch_items(count)")
    .eq("child_id", child.id)
    .eq("status", "confirmed")
    .order("registered_at", { ascending: true });

  const [photoUrl, stats, summaries, recentAttempts] = await Promise.all([
    getAvatarPhotoUrl(supabase, child.avatar_photo_path),
    getChildDashboardStats(child.id),
    getBatchHistorySummaries(
      child.id,
      (batches ?? []).map((b) => b.id)
    ),
    getRecentAttempts(child.id),
  ]);

  const accuracy = stats.totalAttempts > 0 ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : null;

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-2xl flex-1">
        <BackLink href="/dashboard" />
        <div className="mb-4 flex items-center gap-3">
          <Avatar emoji={child.avatar} photoUrl={photoUrl} size="md" />
          <h1 className="text-xl font-bold">{child.name}의 학습 현황</h1>
        </div>

        <div className="card grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div>
            <p className="text-2xl font-bold text-accent">{stats.wordCount}</p>
            <p className="text-xs text-soft">등록 단어</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">{accuracy !== null ? `${accuracy}%` : "-"}</p>
            <p className="text-xs text-soft">전체 정답률</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-b">⭐ {stats.totalStars}</p>
            <p className="text-xs text-soft">누적 별</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{stats.totalAttempts}</p>
            <p className="text-xs text-soft">총 시도 횟수</p>
          </div>
        </div>

        <p className="mb-2 mt-4 font-bold">DAY별 진행 상황</p>
        <div className="mb-4 flex flex-col gap-2">
          {(batches ?? []).map((batch) => {
            const count = batch.vocab_batch_items?.[0]?.count ?? 0;
            const summary = summaries.get(batch.id);
            return (
              <div key={batch.id} className="card mb-0 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{batch.title ?? "제목 없음"}</span>
                <span className="flex gap-2 text-xs font-bold text-soft">
                  <span>{count}개</span>
                  <span className="text-b">⭐ {summary?.stars ?? 0}</span>
                  <span className="text-a">✅ {summary?.known ?? 0}</span>
                  <span className="text-red-500">🤔 {summary?.unknown ?? 0}</span>
                </span>
              </div>
            );
          })}
          {(!batches || batches.length === 0) && (
            <p className="text-center text-sm text-soft">아직 등록된 단어장이 없어요.</p>
          )}
        </div>

        <p className="mb-2 font-bold">최근 학습 기록</p>
        <div className="flex flex-col gap-2">
          {recentAttempts.map((a) => (
            <div key={a.id} className="card mb-0 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-bold">{a.korean}</span>
                <span className="text-soft"> → {a.english}</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-soft">
                <span>{ANSWER_MODE_LABEL[a.answerMode] ?? a.answerMode}</span>
                <span>{a.isCorrect ? "✅" : "❌"}</span>
                <span>{formatDateTime(a.attemptedAt)}</span>
              </span>
            </div>
          ))}
          {recentAttempts.length === 0 && <p className="text-center text-sm text-soft">아직 시도 기록이 없어요.</p>}
        </div>
      </div>
    </div>
  );
}
