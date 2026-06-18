import type { CorrectionLogEntry } from "@/lib/action-chat/confirmation-types";
import { mergeCorrectionLogEntries } from "@/lib/corrections/merge-correction-logs";
import { extractPlaceIntentKey } from "@/lib/corrections/prior-place-choice";
import { getAuthUserId } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";

export type PlaceCorrectionRow = {
  id: string;
  client_id: string;
  user_id: string | null;
  session_id: string;
  user_input: string;
  ai_inferred_location: string | null;
  ai_inferred_place_name: string | null;
  user_corrected_location: string | null;
  user_corrected_place_name: string | null;
  outcome: CorrectionLogEntry["outcome"];
  intent_key: string | null;
  created_at: string;
};

function rowToEntry(row: PlaceCorrectionRow): CorrectionLogEntry {
  return {
    id: row.client_id,
    user_input: row.user_input,
    ai_inferred_location: row.ai_inferred_location,
    ai_inferred_place_name: row.ai_inferred_place_name,
    user_corrected_location: row.user_corrected_location,
    user_corrected_place_name: row.user_corrected_place_name,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

function entryToUpsert(input: {
  entry: CorrectionLogEntry;
  sessionId: string;
  userId: string | null;
}) {
  const { entry, sessionId, userId } = input;
  return {
    client_id: entry.id,
    user_id: userId,
    session_id: sessionId,
    user_input: entry.user_input,
    ai_inferred_location: entry.ai_inferred_location,
    ai_inferred_place_name: entry.ai_inferred_place_name,
    user_corrected_location: entry.user_corrected_location,
    user_corrected_place_name: entry.user_corrected_place_name,
    outcome: entry.outcome,
    intent_key: extractPlaceIntentKey({
      message: entry.user_input,
      place_name: entry.user_corrected_place_name ?? entry.ai_inferred_place_name,
    }),
    created_at: entry.createdAt,
  };
}

export async function upsertPlaceCorrections(input: {
  sessionId: string;
  entries: CorrectionLogEntry[];
}): Promise<{ persisted: number }> {
  const supabase = await tryCreateClient();
  if (!supabase || input.entries.length === 0) {
    return { persisted: 0 };
  }

  const userId = await getAuthUserId();
  const rows = input.entries.map((entry) =>
    entryToUpsert({ entry, sessionId: input.sessionId, userId })
  );

  const { error } = await supabase.from("place_corrections").upsert(rows, {
    onConflict: "session_id,client_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { persisted: rows.length };
}

export async function listPlaceCorrections(input: {
  sessionId: string;
  limit?: number;
}): Promise<CorrectionLogEntry[]> {
  const supabase = await tryCreateClient();
  if (!supabase) {
    return [];
  }

  const userId = await getAuthUserId();
  const limit = input.limit ?? 30;

  let query = supabase
    .from("place_corrections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("session_id", input.sessionId).is("user_id", null);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return (data as PlaceCorrectionRow[]).map(rowToEntry);
}

export { mergeCorrectionLogEntries } from "@/lib/corrections/merge-correction-logs";
