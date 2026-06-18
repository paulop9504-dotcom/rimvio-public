import { RimvioNativeBridge } from "@/lib/native-bridge/rimvio-native-bridge";
import { isNativeShell } from "@/lib/native-bridge/rimvio-native-bridge";
import type { AlbumSyncNetworkPolicy } from "@/lib/preferences/album-sync";

export type AlbumSyncNetworkType = "wifi" | "cellular" | "none" | "unknown";

export async function readAlbumSyncNetworkType(): Promise<AlbumSyncNetworkType> {
  if (isNativeShell()) {
    try {
      const result = await RimvioNativeBridge.getNetworkType();
      const type = result.type;
      if (
        type === "wifi" ||
        type === "cellular" ||
        type === "none" ||
        type === "unknown"
      ) {
        return type;
      }
    } catch {
      // fall through to web heuristic
    }
  }

  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const connection = (
    navigator as Navigator & {
      connection?: { type?: string; effectiveType?: string };
    }
  ).connection;

  if (!connection) {
    return "unknown";
  }

  if (connection.type === "wifi" || connection.type === "ethernet") {
    return "wifi";
  }
  if (
    connection.type === "cellular" ||
    connection.effectiveType === "4g" ||
    connection.effectiveType === "3g"
  ) {
    return "cellular";
  }

  return "unknown";
}

export function canRunAlbumSyncOnNetwork(input: {
  networkType: AlbumSyncNetworkType;
  policy: AlbumSyncNetworkPolicy;
}): boolean {
  if (input.networkType === "none") {
    return false;
  }
  if (input.policy === "wifi_and_mobile") {
    return input.networkType === "wifi" || input.networkType === "cellular";
  }
  return input.networkType === "wifi";
}
