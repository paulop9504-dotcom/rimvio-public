/** Dev-only clipboard presets for contextual remote experiments. */

export const REMOTE_DEV_PRESETS = {
  payment: "국민 123-456-789012",
} as const;

export type RemoteDevPresetId = keyof typeof REMOTE_DEV_PRESETS;

export function readRemoteDevPresetFromSearch(
  search: string
): RemoteDevPresetId | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const preset = new URLSearchParams(search).get("remote");
  if (!preset || !(preset in REMOTE_DEV_PRESETS)) {
    return null;
  }

  return preset as RemoteDevPresetId;
}

export function clipboardTextForRemoteDevPreset(
  preset: RemoteDevPresetId | null
): string | null {
  if (!preset) {
    return null;
  }

  return REMOTE_DEV_PRESETS[preset];
}
