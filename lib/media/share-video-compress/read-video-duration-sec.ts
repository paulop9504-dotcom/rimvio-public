/** Client metadata probe — used before ffmpeg trim/compress. */
export async function readVideoDurationSec(file: File): Promise<number | null> {
  if (typeof document === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;

    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      finish(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}
