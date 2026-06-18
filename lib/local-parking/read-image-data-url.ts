const MAX_PHOTO_BYTES = 900_000;

export async function readImageFileAsDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    return null;
  }
  if (file.size > MAX_PHOTO_BYTES * 4) {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result || result.length > MAX_PHOTO_BYTES * 1.4) {
        resolve(null);
        return;
      }
      resolve(result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
