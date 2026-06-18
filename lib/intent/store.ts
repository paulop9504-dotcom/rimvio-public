import type { SupabaseClient } from "@supabase/supabase-js";
import { toContextBin } from "@/lib/intent/context-bin";
import type { ActionBinStat } from "@/lib/intent/types";
import type { EnricherContext } from "@/lib/enrichers/types";
import type { Database } from "@/types/database";

const MIN_USER_OVERRIDE = 5;

type BinRow = {
  action_key: string;
  impressions: number;
  clicks: number;
  skips: number;
};

export async function fetchBinStats(
  supabase: SupabaseClient<Database>,
  context: EnricherContext,
  userId?: string | null
): Promise<ActionBinStat[]> {
  const contextBin = toContextBin(context);

  const { data: globalRows, error: globalError } = await supabase
    .from("user_action_bins")
    .select("action_key, impressions, clicks, skips")
    .is("user_id", null)
    .eq("context_bin", contextBin);

  if (globalError) {
    console.error("[fetchBinStats:global]", globalError.message);
    return [];
  }

  const merged = new Map<string, ActionBinStat>();

  for (const row of (globalRows ?? []) as BinRow[]) {
    merged.set(row.action_key, row);
  }

  if (userId) {
    const { data: userRows, error: userError } = await supabase
      .from("user_action_bins")
      .select("action_key, impressions, clicks, skips")
      .eq("user_id", userId)
      .eq("context_bin", contextBin);

    if (userError) {
      console.error("[fetchBinStats:user]", userError.message);
    } else {
      for (const row of (userRows ?? []) as BinRow[]) {
        if (row.impressions >= MIN_USER_OVERRIDE) {
          merged.set(row.action_key, row);
        }
      }
    }
  }

  return [...merged.values()];
}

export async function recordActionBinEvent(
  supabase: SupabaseClient<Database>,
  input: {
    context: EnricherContext;
    actionKey: string;
    event: "impression" | "click" | "skip";
    userId?: string | null;
  }
) {
  const contextBin = toContextBin(input.context);

  const { error } = await supabase.rpc("record_action_bin_event", {
    p_context_bin: contextBin,
    p_action_key: input.actionKey,
    p_event: input.event,
    p_user_id: input.userId ?? undefined,
  });

  if (error) {
    throw error;
  }
}
