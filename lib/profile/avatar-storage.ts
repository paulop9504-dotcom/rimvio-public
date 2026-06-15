export const PROFILE_AVATAR_BUCKET = "avatars";

export function profileAvatarObjectPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

export function publicAvatarUrl(
  supabaseUrl: string,
  userId: string,
  cacheBust?: string | number,
): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const path = profileAvatarObjectPath(userId);
  const url = `${base}/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/${path}`;
  if (cacheBust === undefined || cacheBust === null || cacheBust === "") {
    return url;
  }
  return `${url}?v=${encodeURIComponent(String(cacheBust))}`;
}
