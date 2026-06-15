const MAX_EDGE = 512;
const JPEG_QUALITY = 0.86;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAllowedProfileImageType(type: string): boolean {
  return ALLOWED_TYPES.has(type);
}

/** Square-crop center and export JPEG for upload. */
export async function resizeProfileImageFile(file: File): Promise<Blob> {
  if (!isAllowedProfileImageType(file.type)) {
    throw new Error("JPEG, PNG, WebP만 올릴 수 있어요.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("8MB 이하 사진만 올릴 수 있어요.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - side) / 2);
    const sy = Math.floor((bitmap.height - side) / 2);
    const edge = Math.min(side, MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("이미지 처리에 실패했어요.");
    }
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, edge, edge);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했어요."))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
    return blob;
  } finally {
    bitmap.close();
  }
}
