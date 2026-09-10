/**
 * Strip privacy-sensitive metadata from raster image payloads.
 * Spec: specs/domain/assistant-image-attachments.md (EXIF strip)
 *
 * Client compress already re-encodes via canvas (drops EXIF). This is
 * defense-in-depth for API uploads that bypass the browser pipeline.
 */

function findJpegSos(bytes: Uint8Array): number {
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xda) return i; // SOS
    if (marker === 0xd9) return -1; // EOI
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (i + 3 >= bytes.length) break;
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2) break;
    i += 2 + len;
  }
  return -1;
}

/** Remove APP1–APP15 and COM segments from JPEG (keeps SOF/DHT/SOS payload). */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) {
      // Unexpected — copy remainder
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]!);
      break;
    }
    const marker = bytes[i + 1]!;
    if (marker === 0xda) {
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]!);
      break;
    }
    if (marker === 0xd9) {
      out.push(0xff, 0xd9);
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2 || i + 2 + len > bytes.length) {
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]!);
      break;
    }
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!drop) {
      for (let j = i; j < i + 2 + len; j++) out.push(bytes[j]!);
    }
    i += 2 + len;
  }
  return Uint8Array.from(out);
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_DROP = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME']);

/** Drop textual/EXIF PNG chunks; keep IHDR/IDAT/IEND (+ critical). */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 8) return bytes;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIG[i]) return bytes;
  }
  const out: number[] = [...PNG_SIG];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const len =
      ((bytes[i]! << 24) >>> 0) +
      (bytes[i + 1]! << 16) +
      (bytes[i + 2]! << 8) +
      bytes[i + 3]!;
    const type = String.fromCharCode(
      bytes[i + 4]!,
      bytes[i + 5]!,
      bytes[i + 6]!,
      bytes[i + 7]!,
    );
    const chunkEnd = i + 12 + len;
    if (chunkEnd > bytes.length) {
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]!);
      break;
    }
    if (!PNG_DROP.has(type)) {
      for (let j = i; j < chunkEnd; j++) out.push(bytes[j]!);
    }
    i = chunkEnd;
    if (type === 'IEND') break;
  }
  return Uint8Array.from(out);
}

export function stripRasterImageMetadata(bytes: Uint8Array, mimeType: string): Uint8Array {
  const mime = mimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimeType.toLowerCase();
  if (mime === 'image/jpeg') return stripJpegMetadata(bytes);
  if (mime === 'image/png') return stripPngMetadata(bytes);
  return bytes;
}

/**
 * Re-encode data URL after metadata strip. Returns original string if unchanged/unsupported.
 */
export function stripAssistantImageDataUrlMetadata(dataUrl: string): string {
  const trimmed = dataUrl.trim();
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(trimmed);
  if (!match) return trimmed;
  let mime = match[1]!.toLowerCase();
  if (mime === 'image/jpg') mime = 'image/jpeg';
  const b64 = match[2]!.replace(/\s+/g, '');
  let raw: Buffer;
  try {
    raw = Buffer.from(b64, 'base64');
  } catch {
    return trimmed;
  }
  const cleaned = stripRasterImageMetadata(raw, mime);
  if (cleaned === raw || (cleaned.byteLength === raw.byteLength && Buffer.compare(Buffer.from(cleaned), raw) === 0)) {
    return trimmed;
  }
  return `data:${mime};base64,${Buffer.from(cleaned).toString('base64')}`;
}

/** Test helper: true if JPEG still has APP1 (typical EXIF). */
export function jpegHasApp1(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  const sos = findJpegSos(bytes);
  const end = sos > 0 ? sos : bytes.length;
  let i = 2;
  while (i + 3 < end) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1]!;
    if (marker === 0xe1) return true;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2) return false;
    i += 2 + len;
  }
  return false;
}
