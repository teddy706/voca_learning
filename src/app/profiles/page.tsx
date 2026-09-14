import Link from "next/link";
import { requireParentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import type { Profile } from "@/lib/types";

// Next.js 기본 fetch 캐시로 인한 Supabase 응답 재사용 방지(리딩버디 패턴 그대로).
export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const parent = await requireParentProfile();

  const supabase = createClient();
  const { data: children } = await supabase
    .from("profiles")
    .select("*")
    .eq("family_id", parent.family_id)
    .eq("role", "child")
    .order("created_at", { ascending: true });

  const childProfiles = (children ?? []) as Profile[];

  return (
    <div className="app-shell">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <h1 className="mb-1 mt-1 text-center text-2xl font-bold">누가 점검할까요?</h1>
        <p className="mb-6 text-center text-sm text-soft">프로필을 골라주세요</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {childProfiles.map((child) => (
            <Link key={child.id} href={`/profiles/${child.id}/pin`} className="profile-card">
              <Avatar emoji={child.avatar} size="lg" />
              <span className="font-bold">{child.name}</span>
            </Link>
          ))}
        </div>

        {childProfiles.length === 0 && (
          <p className="mb-4 text-center text-sm text-soft">
            이 가족에 등록된 자녀 프로필이 없어요. 리딩버디에서 먼저 자녀 프로필을 만들어주세요.
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 md:mx-auto md:w-full md:max-w-xs">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
