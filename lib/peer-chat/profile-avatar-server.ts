import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROFILE_AVATAR_BUCKET,
  profileAvatarObjectPath,
  publicAvatarUrl,
} from "@/lib/profile/avatar-storage";
import type { Database } from "@/types/database";
import { upsertUserProfile, readUserProfile } from "@/lib/peer-chat/server-peer-chat";

const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function uploadUserProfileAvatar(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    supabaseUrl: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.has(input.contentType)) {
    throw new Error("JPEG, PNG, WebP만 올릴 수 있어요.");
  }
  if (input.bytes.byteLength > 2 * 1024 * 1024) {
    throw new Error("2MB 이하 사진만 올릴 수 있어요.");
  }

  const objectPath = profileAvatarObjectPath(input.userId);
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(objectPath, input.bytes, {
      upsert: true,
      contentType: "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) {
    throw uploadError;
  }

  const bust = Date.now();
  const avatarUrl = publicAvatarUrl(input.supabaseUrl, input.userId, bust);
  const existing = await readUserProfile(supabase, input.userId);

  await upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164: existing?.phone_e164 ?? null,
    emailLower: existing?.email_lower ?? null,
    rimvioId: existing?.rimvio_id ?? null,
    displayName: existing?.display_name ?? null,
    avatarUrl,
  });

  return avatarUrl;
}

export async function removeUserProfileAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const objectPath = profileAvatarObjectPath(userId);
  await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([objectPath]);

  const existing = await readUserProfile(supabase, userId);
  if (!existing) {
    return;
  }

  await upsertUserProfile(supabase, {
    userId,
    phoneE164: existing.phone_e164,
    emailLower: existing.email_lower,
    rimvioId: existing.rimvio_id,
    displayName: existing.display_name,
    avatarUrl: null,
  });
}
