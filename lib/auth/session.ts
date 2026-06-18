import { tryCreateClient } from "@/lib/supabase/server";

export async function getAuthUser() {
  const supabase = await tryCreateClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getAuthUserId() {
  const user = await getAuthUser();
  return user?.id ?? null;
}
