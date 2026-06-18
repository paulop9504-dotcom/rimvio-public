const EXIF_DATE_RE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export type ImageExifMetadata = {
  dateTimeIso: string | null;
  lat: number | null;
  lng: number | null;
};

function parseExifDateTime(value: string): string | null {
  const match = EXIF_DATE_RE.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const ms = Date.parse(
    `${year}-${month}-${day}T${hour}:${minute}:${second}`,
  );
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

function findExifTiffOffset(bytes: Uint8Array): number | null {
  const marker = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // Exif\0\0
  for (let index = 0; index <= bytes.length - marker.length; index += 1) {
    let matched = true;
    for (let j = 0; j < marker.length; j += 1) {
      if (bytes[index + j] !== marker[j]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return index + marker.length;
    }
  }
  return null;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const code = bytes[offset + index];
    if (code === 0) {
      break;
    }
    value += String.fromCharCode(code);
  }
  return value;
}

type TiffReader = {
  le: boolean;
  bytes: Uint8Array;
};

function u16(reader: TiffReader, offset: number): number {
  return new DataView(
    reader.bytes.buffer,
    reader.bytes.byteOffset,
    reader.bytes.byteLength,
  ).getUint16(offset, reader.le);
}

function u32(reader: TiffReader, offset: number): number {
  return new DataView(
    reader.bytes.buffer,
    reader.bytes.byteOffset,
    reader.bytes.byteLength,
  ).getUint32(offset, reader.le);
}

function typeByteSize(type: number): number {
  switch (type) {
    case 1:
    case 2:
    case 6:
    case 7:
      return 1;
    case 3:
    case 8:
      return 2;
    case 4:
    case 9:
    case 11:
      return 4;
    case 5:
    case 10:
    case 12:
      return 8;
    default:
      return 1;
  }
}

function rationalToNumber(reader: TiffReader, offset: number): number {
  const numerator = u32(reader, offset);
  const denominator = u32(reader, offset + 4);
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function dmsToDecimal(parts: number[], ref: string): number | null {
  if (parts.length < 3) {
    return null;
  }
  const value = parts[0]! + parts[1]! / 60 + parts[2]! / 3600;
  const upper = ref.trim().toUpperCase();
  if (upper === "S" || upper === "W") {
    return -value;
  }
  if (upper === "N" || upper === "E") {
    return value;
  }
  return null;
}

function readIfdValue(
  reader: TiffReader,
  tiffStart: number,
  type: number,
  count: number,
  valueOffset: number,
  inlineEntryOffset: number,
): string | number[] | null {
  const byteSize = typeByteSize(type) * count;

  if (type === 2) {
    const absolute =
      byteSize <= 4 ? inlineEntryOffset : tiffStart + valueOffset;
    return readAscii(reader.bytes, absolute, count);
  }
  if (type === 5 && count >= 1) {
    const absolute =
      byteSize <= 4 ? inlineEntryOffset : tiffStart + valueOffset;
    const values: number[] = [];
    for (let index = 0; index < count; index += 1) {
      values.push(rationalToNumber(reader, absolute + index * 8));
    }
    return values;
  }
  return null;
}

function parseIfd(
  reader: TiffReader,
  tiffStart: number,
  ifdOffset: number,
): {
  dateTimeIso: string | null;
  gpsIfdOffset: number | null;
} {
  const absolute = tiffStart + ifdOffset;
  const entryCount = u16(reader, absolute);
  let dateTimeIso: string | null = null;
  let gpsIfdOffset: number | null = null;

  for (let index = 0; index < entryCount; index += 1) {
    const entry = absolute + 2 + index * 12;
    const tag = u16(reader, entry);
    const type = u16(reader, entry + 2);
    const count = u32(reader, entry + 4);
    const valueOffset = u32(reader, entry + 8);

    if (tag === 0x0132 || tag === 0x9003) {
      const raw = readIfdValue(
        reader,
        tiffStart,
        type,
        count,
        valueOffset,
        entry + 8,
      );
      if (typeof raw === "string") {
        dateTimeIso = parseExifDateTime(raw) ?? dateTimeIso;
      }
    }
    if (tag === 0x8825) {
      gpsIfdOffset = valueOffset;
    }
  }

  return { dateTimeIso, gpsIfdOffset };
}

function parseGpsIfd(
  reader: TiffReader,
  tiffStart: number,
  gpsIfdOffset: number,
): { lat: number | null; lng: number | null } {
  const absolute = tiffStart + gpsIfdOffset;
  const entryCount = u16(reader, absolute);
  let latRef = "N";
  let lngRef = "E";
  let latParts: number[] | null = null;
  let lngParts: number[] | null = null;

  for (let index = 0; index < entryCount; index += 1) {
    const entry = absolute + 2 + index * 12;
    const tag = u16(reader, entry);
    const type = u16(reader, entry + 2);
    const count = u32(reader, entry + 4);
    const valueOffset = u32(reader, entry + 8);
    const raw = readIfdValue(
      reader,
      tiffStart,
      type,
      count,
      valueOffset,
      entry + 8,
    );

    if (tag === 1 && typeof raw === "string") {
      latRef = raw;
    } else if (tag === 2 && Array.isArray(raw)) {
      latParts = raw;
    } else if (tag === 3 && typeof raw === "string") {
      lngRef = raw;
    } else if (tag === 4 && Array.isArray(raw)) {
      lngParts = raw;
    }
  }

  return {
    lat: latParts ? dmsToDecimal(latParts, latRef) : null,
    lng: lngParts ? dmsToDecimal(lngParts, lngRef) : null,
  };
}

function parseExifTiff(bytes: Uint8Array, tiffStart: number): ImageExifMetadata {
  if (tiffStart + 8 > bytes.length) {
    return { dateTimeIso: null, lat: null, lng: null };
  }

  const header = readAscii(bytes, tiffStart, 2);
  const le = header === "II";
  const reader: TiffReader = { le, bytes };

  if (u16(reader, tiffStart + 2) !== 0x002a) {
    return { dateTimeIso: null, lat: null, lng: null };
  }

  const ifd0Offset = u32(reader, tiffStart + 4);
  const root = parseIfd(reader, tiffStart, ifd0Offset);
  let lat: number | null = null;
  let lng: number | null = null;

  if (root.gpsIfdOffset !== null) {
    const gps = parseGpsIfd(reader, tiffStart, root.gpsIfdOffset);
    lat = gps.lat;
    lng = gps.lng;
  }

  return {
    dateTimeIso: root.dateTimeIso,
    lat,
    lng,
  };
}

function scanLatin1DateTime(bytes: Uint8Array): string | null {
  const ascii = new TextDecoder("latin1").decode(bytes);
  const original =
    ascii.match(/DateTimeOriginal\x00([0-9: ]{19})/)?.[1] ??
    ascii.match(/DateTime\x00([0-9: ]{19})/)?.[1] ??
    null;
  return original ? parseExifDateTime(original) : null;
}

export function parseImageExifFromBytes(bytes: Uint8Array): ImageExifMetadata {
  const tiffStart = findExifTiffOffset(bytes);
  if (tiffStart !== null) {
    const parsed = parseExifTiff(bytes, tiffStart);
    if (parsed.dateTimeIso || (parsed.lat !== null && parsed.lng !== null)) {
      return parsed;
    }
  }
  return {
    dateTimeIso: scanLatin1DateTime(bytes),
    lat: null,
    lng: null,
  };
}

/** JPEG / HEIC / HEIF — best-effort EXIF datetime + GPS (no dependency). */
export async function readImageExifMetadata(file: File): Promise<ImageExifMetadata> {
  if (typeof file.slice !== "function") {
    return { dateTimeIso: null, lat: null, lng: null };
  }

  const type = file.type.trim().toLowerCase();
  const name = file.name.trim().toLowerCase();
  const isImage =
    type.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif|tiff?)$/iu.test(name);
  if (!isImage) {
    return { dateTimeIso: null, lat: null, lng: null };
  }

  try {
    const head = file.slice(0, Math.min(file.size, 512 * 1024));
    const buffer = await head.arrayBuffer();
    return parseImageExifFromBytes(new Uint8Array(buffer));
  } catch {
    return { dateTimeIso: null, lat: null, lng: null };
  }
}

/** @deprecated Use readImageExifMetadata */
export async function readJpegExifDateTimeIso(file: File): Promise<string | null> {
  const meta = await readImageExifMetadata(file);
  return meta.dateTimeIso;
}
