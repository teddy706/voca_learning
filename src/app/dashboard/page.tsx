import Link from "next/link";
import { requireParentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BackLink } from "@/components/BackLink";
import { getAvatarPhotoUrls } from "@/lib/avatarPhoto";
import { getChildDashboardStats } from "@/lib/vocabBatch";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatLastActivity(iso: string | null) {
  if (!iso) return "아직 학습 기록 없음";
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "오늘 학습함";
  if (diffDays === 1) return "어제 학습함";
  return `${diffDays}일 전 학습함`;
}

// 부모 전용 학습 현황 대시보드 — 자녀별 카드에 핵심 지표만 요약해서 보여주고, 카드를 누르면
// /dashboard/[childId]에서 DAY별 진행 상황과 최근 학습 기록을 볼 수 있다. 쌍둥이 간 순위/비교
// 연출은 의도적으로 넣지 않는다(PRD 9장 — 랭킹은 Phase 3 보류) — 카드를 나열만 하고, 서로
// 비교하는 숫자(예: "1등")는 만들지 않는다.
export default async function DashboardPage() {
  const parent = await requireParentProfile();

  const supabase = createClient();
  const { data: children } = await supabase
    .from("profiles")
    .select("*")
    .eq("family_id", parent.family_id)
    .eq("role", "child")
    .order("created_at", { ascending: true });

  const childProfiles = (children ?? []) as Profile[];
  const [photoUrls, statsList] = await Promise.all([
    getAvatarPhotoUrls(
      supabase,
      childProfiles.map((c) => c.avatar_photo_path)
    ),
    Promise.all(childProfiles.map((c) => getChildDashboardStats(c.id))),
  ]);

  return (
    <div className="app-shell">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <BackLink href="/profiles" />
        <h1 className="mb-1 mt-1 text-center text-2xl font-bold">학습 현황</h1>
        <p className="mb-6 text-center text-sm text-soft">자녀별 학습 진행 상황이에요</p>

        <div className="flex flex-col gap-3">
          {childProfiles.map((child, i) => {
            const stats = statsList[i];
            const accuracy =
              stats.totalAttempts > 0 ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : null;
            return (
              <Link key={child.id} href={`/dashboard/${child.id}`} className="card mb-0 flex items-center gap-4">
                <Avatar
                  emoji={child.avatar}
                  photoUrl={child.avatar_photo_path ? (photoUrls.get(child.avatar_photo_path) ?? null) : null}
                  size="md"
                />
                <div className="flex-1">
                  <p className="font-bold">{child.name}</p>
                  <p className="text-sm text-soft">
                    단어 {stats.wordCount}개 · DAY {stats.batchCount}개 · {formatLastActivity(stats.lastActivityAt)}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-soft">
                    {accuracy !== null && <span className="text-accent">정답률 {accuracy}%</span>}
                    <span className="text-b">⭐ {stats.totalStars}</span>
                    {stats.knownCount > 0 && <span className="text-a">✅ {stats.knownCount}</span>}
                    {stats.unknownCount > 0 && <span className="text-red-500">🤔 {stats.unknownCount}</span>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {childProfiles.length === 0 && (
          <p className="mb-4 text-center text-sm text-soft">이 가족에 등록된 자녀 프로필이 없어요.</p>
        )}
      </div>
    </div>
  );
}
