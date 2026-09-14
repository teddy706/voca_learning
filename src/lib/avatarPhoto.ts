import type { SupabaseClient } from "@supabase/supabase-js";

// 리딩버디 avatarPhoto.ts 그대로 포팅 — 같은 Supabase 프로젝트의 같은 "avatars" 버킷을 그대로
// 읽는다(storage RLS: 같은 가족이면 누구나 조회 가능, 0007_avatar_photo.sql). 이 앱에서는
// 사진 업로드/교체 기능은 만들지 않는다 — 조회만.
export const AVATAR_PHOTO_BUCKET = "avatars";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function getAvatarPhotoUrl(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(AVATAR_PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) console.error("getAvatarPhotoUrl 서명 URL 발급 실패:", error);
  return data?.signedUrl ?? null;
}

export async function getAvatarPhotoUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const validPaths = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const map = new Map<string, string>();
  if (validPaths.length === 0) return map;

  const { data, error } = await supabase.storage
    .from(AVATAR_PHOTO_BUCKET)
    .createSignedUrls(validPaths, SIGNED_URL_TTL_SECONDS);
  if (error) console.error("getAvatarPhotoUrls 서명 URL 발급 실패:", error);
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
  }
  return map;
}
