/**
 * Client-side image downscaling.
 *
 * User photos are sent to /api/generate as base64 data URLs, and base64 inflates
 * a file by roughly a third. Vercel caps serverless request bodies at 4.5 MB, so
 * a normal phone photo (4-8 MB) exceeded the limit and the function returned a
 * plain-text "Request Entity Too Large" — which the client then tried to parse
 * as JSON, surfacing as "Unexpected token 'R'".
 *
 * Downscaling first keeps the request comfortably under the cap. It also makes
 * generation faster and cheaper with no quality cost: the try-on model does not
 * use detail beyond ~1280px on the long edge.
 */

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

/** Roughly the decoded byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    return Math.floor(base64.length * 0.75);
}

/**
 * Decode, downscale to fit `maxDimension`, and re-encode as JPEG.
 *
 * Always re-encodes, even when the image is already small: a 900x900 PNG can
 * still be several megabytes, and JPEG at 0.85 is dramatically smaller with no
 * meaningful difference for this use case.
 */
export async function toDownscaledDataUrl(
    blob: Blob,
    maxDimension: number = MAX_DIMENSION
): Promise<string> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(blob);
    } catch {
        throw new Error('That image could not be read. Please try a JPG or PNG.');
    }

    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close?.();
        throw new Error('Your browser could not process this image.');
    }

    // White backfill so transparent PNGs do not become black once flattened to JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
