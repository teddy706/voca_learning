import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { getAvatarPhotoUrl } from "@/lib/avatarPhoto";
import { resolveActingChild } from "@/lib/vocabAuth";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: { childId?: string } }) {
  const requester = await requireProfile();

  // 자녀 본인 세션 → 본인 홈. 부모 세션 → ?childId로 미리 볼 자녀가 필요하다(같은 가족이어야
  // resolveActingChild가 통과시킴) — /check, /check/[batchId]와 동일한 권한 모델로 통일한다.
  // 이전엔 이 화면만 requireChildProfile()(자녀 본인 전용)을 써서, 부모가 /home으로 오는 링크가
  // 생기면 그 화면만 예외적으로 튕겨나가는 비일관성이 있었다(코드 리뷰에서 발견).
  let child: Profile;
  if (requester.role === "child") {
    child = requester;
  } else {
    if (!searchParams.childId) redirect("/profiles");
    const acting = await resolveActingChild(searchParams.childId);
    if (!acting) notFound();
    child = acting.child;
  }

  const supabase = createClient();
  const photoUrl = await getAvatarPhotoUrl(supabase, child.avatar_photo_path);
  const { count: wordCount } = await supabase
    .from("vocab_words")
    .select("id", { count: "exact", head: true })
    .eq("child_id", child.id);
  const { count: batchCount } = await supabase
    .from("vocab_batches")
    .select("id", { count: "exact", head: true })
    .eq("child_id", child.id);

  const checkHref = requester.role === "parent" ? `/check?childId=${child.id}` : "/check";

  return (
    <div className="app-shell">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {requester.role === "parent" && <p className="mb-1 text-center text-sm text-soft">{child.name} 미리보기</p>}
        <div className="mb-6 flex flex-col items-center gap-2 pt-4">
          <Avatar emoji={child.avatar} photoUrl={photoUrl} size="lg" />
          <h1 className="text-2xl font-bold">{child.name}, 안녕!</h1>
        </div>

        <div className="card text-center">
          <p className="mb-1 text-sm text-soft">등록된 단어장</p>
          <p className="text-3xl font-bold text-accent">{wordCount ?? 0}개 단어</p>
          <p className="mt-1 text-sm text-soft">{batchCount ?? 0}개 DAY 단어장</p>
        </div>

        <Link href={checkHref} className="btn btn-primary mb-0">
          점검 시작하기
        </Link>

        <div className="mt-auto flex flex-col gap-2 md:mx-auto md:w-full md:max-w-xs">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
