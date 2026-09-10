/** Client-side image compress for assistant attachments (max edge + JPEG quality).
 * Canvas re-encode drops EXIF/XMP/IPTC (privacy). Server also strips on put.
 */

import {
  ASSISTANT_IMAGE_COMPRESS_MAX_EDGE_PX,
  ASSISTANT_IMAGE_COMPRESS_QUALITY,
} from '@/lib/constants';

function isSvgFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/svg+xml' || name.endsWith('.svg');
}

export function compressAssistantImageFile(
  file: File,
  maxEdgePx: number = ASSISTANT_IMAGE_COMPRESS_MAX_EDGE_PX,
  quality: number = ASSISTANT_IMAGE_COMPRESS_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || file.size <= 0) {
      reject(new Error('Empty image file'));
      return;
    }
    if (isSvgFile(file)) {
      reject(new Error('SVG images are not supported'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (!width || !height) {
          reject(new Error('Invalid image dimensions'));
          return;
        }
        if (width > maxEdgePx || height > maxEdgePx) {
          const scale = Math.min(maxEdgePx / width, maxEdgePx / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const out = new FileReader();
            out.onerror = () => reject(new Error('Failed to read compressed image'));
            out.onload = () => {
              if (typeof out.result === 'string') resolve(out.result);
              else reject(new Error('Unexpected compress result'));
            };
            out.readAsDataURL(blob);
          },
          'image/jpeg',
          quality,
        );
      };
      if (typeof reader.result === 'string') img.src = reader.result;
      else reject(new Error('Unexpected file read result'));
    };
    reader.readAsDataURL(file);
  });
}
