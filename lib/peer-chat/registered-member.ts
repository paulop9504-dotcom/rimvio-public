import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const NOT_REGISTERED_ERROR = "not_registered";

export const NOT_REGISTERED_MESSAGE =
  "Rimvio에 가입한 사람만 추가할 수 있어요. ID·번호·이메일을 다시 확인해 주세요.";

export async function rimvioUserIsMember(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("rimvio_user_is_member", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function assertRimvioMember(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const ok = await rimvioUserIsMember(supabase, userId);
  if (!ok) {
    const err = new Error(NOT_REGISTERED_MESSAGE);
    (err as Error & { code: string }).code = NOT_REGISTERED_ERROR;
    throw err;
  }
}
