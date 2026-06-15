/** Skip re-encode when already small MP4 under duration cap. */
export const SHARE_VIDEO_SKIP_BELOW_BYTES = 6 * 1024 * 1024;

/** Target output size for bridge / globe share uploads. */
export const SHARE_VIDEO_TARGET_MAX_BYTES = 28 * 1024 * 1024;

/** Long clips are trimmed to the first N seconds before upload. */
export const SHARE_VIDEO_MAX_DURATION_SEC = 120;

export const SHARE_VIDEO_MAX_WIDTH = 1280;
export const SHARE_VIDEO_MAX_HEIGHT = 720;

export const FFMPEG_CORE_CDN_VERSION = "0.12.6";

export const SHARE_VIDEO_CRF_STEPS = [28, 32, 35] as const;
