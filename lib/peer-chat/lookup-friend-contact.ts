import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, looksLikeEmail } from "@/lib/peer-chat/email";
import { fetchFriendAddPreviewProfile } from "@/lib/peer-chat/friend-add-preview-profile";
import {
  normalizeFriendContactQuery,
  parseFriendContactQuery,
} from "@/lib/peer-chat/normalize-friend-contact";
import { normalizePhoneE164 } from "@/lib/peer-chat/phone";
import { tryParseRimvioIdContact } from "@/lib/peer-chat/rimvio-id";
import { ensureRimvioUserProfile } from "@/lib/peer-chat/ensure-user-profile";
import {
  lookupUserIdByEmail,
  lookupUserIdByPhone,
  lookupUserIdByRimvioId,
  readUserProfile,
} from "@/lib/peer-chat/server-peer-chat";
import type { Database } from "@/types/database";

async function lookupUserIdByRimvioIdSafe(
  supabase: SupabaseClient<Database>,
  rimvioId: string,
): Promise<string | null> {
  try {
    return await lookupUserIdByRimvioId(supabase, rimvioId);
  } catch {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("rimvio_id", rimvioId)
      .maybeSingle();
    return (data?.user_id as string | undefined) ?? null;
  }
}

async function lookupUserIdByPhoneSafe(
  supabase: SupabaseClient<Database>,
  phoneE164: string,
): Promise<string | null> {
  try {
    return await lookupUserIdByPhone(supabase, phoneE164);
  } catch {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("phone_e164", phoneE164)
      .maybeSingle();
    return (data?.user_id as string | undefined) ?? null;
  }
}

async function lookupUserIdByEmailSafe(
  supabase: SupabaseClient<Database>,
  emailLower: string,
): Promise<string | null> {
  try {
    return await lookupUserIdByEmail(supabase, emailLower);
  } catch {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("email_lower", emailLower)
      .maybeSingle();
    return (data?.user_id as string | undefined) ?? null;
  }
}

export type FriendContactMatchedBy = "email" | "phone" | "rimvio_id";

export type FriendContactLookup = {
  otherUserId: string;
  displayName: string;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower: string | null;
  matchedBy: FriendContactMatchedBy;
};

export class FriendContactLookupError extends Error {
  constructor(
    message: string,
    readonly code:
      | "empty"
      | "invalid"
      | "self"
      | "not_registered"
      | "need_contact",
  ) {
    super(message);
    this.name = "FriendContactLookupError";
  }
}

export async function lookupRegisteredFriendContact(
  supabase: SupabaseClient<Database>,
  input: { callerId: string; rawContact: string },
): Promise<FriendContactLookup> {
  const { primary: rawContact, rimvioIdHint } = parseFriendContactQuery(
    input.rawContact,
  );
  if (!rawContact) {
    throw new FriendContactLookupError(
      "친구 Rimvio ID · 전화번호 · 이메일을 입력해 주세요.",
      "empty",
    );
  }

  const callerProfile = await readUserProfile(supabase, input.callerId);

  const byEmail = looksLikeEmail(rawContact);
  const friendRimvioId = !byEmail ? tryParseRimvioIdContact(rawContact) : null;
  let otherUserId: string | null = null;
  let matchedBy: FriendContactMatchedBy = "phone";

  if (byEmail) {
    matchedBy = "email";
    const friendEmail = normalizeEmail(rawContact);
    if (!friendEmail) {
      throw new FriendContactLookupError(
        "올바른 이메일을 입력해 주세요.",
        "invalid",
      );
    }
    if (callerProfile?.email_lower === friendEmail) {
      throw new FriendContactLookupError("내 이메일은 추가할 수 없어요.", "self");
    }
    otherUserId = await lookupUserIdByEmailSafe(supabase, friendEmail);
    if (!otherUserId) {
      throw new FriendContactLookupError(
        "이 이메일은 아직 Rimvio에 없어요.",
        "not_registered",
      );
    }
  } else if (friendRimvioId) {
    matchedBy = "rimvio_id";
    if (callerProfile?.rimvio_id === friendRimvioId) {
      throw new FriendContactLookupError("내 ID는 추가할 수 없어요.", "self");
    }
    otherUserId = await lookupUserIdByRimvioIdSafe(supabase, friendRimvioId);
    if (!otherUserId) {
      throw new FriendContactLookupError(
        "이 Rimvio ID는 아직 없어요.",
        "not_registered",
      );
    }
  } else {
    const friendPhone = normalizePhoneE164(rawContact);
    if (!friendPhone) {
      throw new FriendContactLookupError(
        "Rimvio ID · 010 번호 · 이메일 중 하나를 올바르게 입력해 주세요.",
        "invalid",
      );
    }
    matchedBy = "phone";
    if (callerProfile?.phone_e164 === friendPhone) {
      throw new FriendContactLookupError("내 번호는 추가할 수 없어요.", "self");
    }
    otherUserId = await lookupUserIdByPhoneSafe(supabase, friendPhone);
    if (!otherUserId && rimvioIdHint) {
      matchedBy = "rimvio_id";
      if (callerProfile?.rimvio_id === rimvioIdHint) {
        throw new FriendContactLookupError("내 ID는 추가할 수 없어요.", "self");
      }
      otherUserId = await lookupUserIdByRimvioIdSafe(supabase, rimvioIdHint);
    }
    if (!otherUserId) {
      throw new FriendContactLookupError(
        rimvioIdHint
          ? "이 번호·ID는 Rimvio에 없어요. Google 이메일로도 시도해 보세요."
          : "이 번호는 Rimvio에 등록되지 않았어요. Rimvio ID나 Google 이메일로 추가해 보세요.",
        "not_registered",
      );
    }
  }

  if (!otherUserId || otherUserId === input.callerId) {
    throw new FriendContactLookupError("자기 자신은 추가할 수 없어요.", "self");
  }

  await ensureRimvioUserProfile(supabase, otherUserId);

  const preview = await fetchFriendAddPreviewProfile(supabase, otherUserId);
  if (!preview) {
    throw new FriendContactLookupError(
      "상대 프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      "not_registered",
    );
  }
  const displayName =
    preview.displayName?.trim() ||
    preview.rimvioId ||
    preview.emailLower?.split("@")[0] ||
    "친구";

  return {
    otherUserId,
    displayName,
    rimvioId: preview.rimvioId,
    avatarUrl: preview.avatarUrl,
    emailLower: preview.emailLower,
    matchedBy,
  };
}
