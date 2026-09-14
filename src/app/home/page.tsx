import Link from "next/link";
import { requireChildProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { getAvatarPhotoUrl } from "@/lib/avatarPhoto";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const child = await requireChildProfile();

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

  return (
    <div className="app-shell">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="mb-6 flex flex-col items-center gap-2 pt-4">
          <Avatar emoji={child.avatar} photoUrl={photoUrl} size="lg" />
          <h1 className="text-2xl font-bold">{child.name}, 안녕!</h1>
        </div>

        <div className="card text-center">
          <p className="mb-1 text-sm text-soft">등록된 단어장</p>
          <p className="text-3xl font-bold text-accent">{wordCount ?? 0}개 단어</p>
          <p className="mt-1 text-sm text-soft">{batchCount ?? 0}개 DAY 단어장</p>
        </div>

        <Link href="/check" className="btn btn-primary mb-0">
          점검 시작하기
        </Link>

        <div className="mt-auto flex flex-col gap-2 md:mx-auto md:w-full md:max-w-xs">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
