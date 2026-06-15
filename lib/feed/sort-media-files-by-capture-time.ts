import { readImageExifMetadata } from "@/lib/location-ping/read-image-exif-metadata";

/** Bulk EXIF ingest — oldest capture first so later photos attach to earlier pins. */
export async function sortMediaFilesByCaptureTime(
  files: readonly File[],
): Promise<File[]> {
  const ranked = await Promise.all(
    files.map(async (file) => {
      const exif = await readImageExifMetadata(file);
      const fromExif = exif.dateTimeIso ? Date.parse(exif.dateTimeIso) : Number.NaN;
      const ms = Number.isNaN(fromExif) ? file.lastModified : fromExif;
      return { file, ms };
    }),
  );
  return ranked.sort((left, right) => left.ms - right.ms).map((row) => row.file);
}
