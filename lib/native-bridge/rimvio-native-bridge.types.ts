export type NativeNotificationPayload = {
  source_app: string;
  title: string;
  content: string;
  timestamp: string;
};

export type NativePlatformInfo = {
  platform: "android" | "ios" | "web";
  isNative: boolean;
};

export type NativeNetworkType = "wifi" | "cellular" | "none" | "unknown";

export type NativePhotoLibraryItem = {
  id: string;
  contentUri: string;
  fileName: string;
  mimeType: string;
  capturedAtMs: number;
  lat: number | null;
  lng: number | null;
  mediaKind: "photo" | "video";
};

export type NativePhotoCacheImport = {
  cachePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface RimvioNativeBridgePlugin {
  isNotificationAccessEnabled(): Promise<{ enabled: boolean }>;
  openNotificationAccessSettings(): Promise<void>;
  getPlatformInfo(): Promise<NativePlatformInfo>;
  getNetworkType(): Promise<{ type: NativeNetworkType }>;
  requestPhotoLibraryPermission(): Promise<{ granted: boolean }>;
  scanPhotoLibrary(options: {
    sinceMs: number;
    limit: number;
    windowDays: number;
  }): Promise<{ photos: NativePhotoLibraryItem[]; nextCursorMs: number }>;
  importPhotoToCache(options: {
    contentUri: string;
    fileName?: string;
  }): Promise<NativePhotoCacheImport>;
  addListener(
    eventName: "notificationPosted",
    listenerFunc: (payload: NativeNotificationPayload) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: "photoLibraryChanged",
    listenerFunc: (payload: { timestamp: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}
