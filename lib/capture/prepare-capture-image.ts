import { BRIDGE_PHOTO_MAX_BYTES } from "@/lib/experience-bridge/bridge-media-constants";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.84;

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_decode_failed"));
    };
    image.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("jpeg_encode_failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

/** Downscale large photos before upload — prevents hang on slow networks / API. */
export async function prepareCaptureImageForUpload(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  if (file.size <= MAX_UPLOAD_BYTES && !file.type.includes("heic")) {
    try {
      const image = await loadImageFromFile(file);
      const longest = Math.max(image.naturalWidth, image.naturalHeight);
      if (longest <= MAX_EDGE_PX) {
        return file;
      }
    } catch {
      return file;
    }
  }

  try {
    const image = await loadImageFromFile(file);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(image, 0, 0, width, height);
    const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "capture";

    if (blob.size > BRIDGE_PHOTO_MAX_BYTES) {
      const tighter = await canvasToJpegBlob(canvas, 0.72);
      return new File([tighter], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    }

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/** Thumbnail for localStorage — keep feed snappy. */
export async function prepareCaptureThumbnailDataUrl(file: File) {
  const prepared = await prepareCaptureImageForUpload(file);

  if (prepared.size <= 350_000) {
    return readFileAsDataUrl(prepared);
  }

  try {
    const image = await loadImageFromFile(prepared);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > 960 ? 960 / longest : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return readFileAsDataUrl(prepared);
    }

    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return readFileAsDataUrl(prepared);
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("invalid image data"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
