/** Supabase / fetch errors — message is not always on Error. */
export function extractErrorMessage(
  error: unknown,
  fallback = "Failed to add friend.",
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const row = error as Record<string, unknown>;
    if (typeof row.message === "string" && row.message.trim()) {
      return row.message;
    }
    if (typeof row.error === "string" && row.error.trim()) {
      return row.error;
    }
    if (typeof row.details === "string" && row.details.trim()) {
      return row.details;
    }
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}
