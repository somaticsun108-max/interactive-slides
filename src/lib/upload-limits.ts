/**
 * Upload limits, shared by the API route and the client.
 *
 * Vercel enforces a hard 4.5 MB cap on any Function request body, on every
 * plan, and rejects oversized requests at the platform layer *before* the
 * handler runs — so the route can never return a friendly error for them.
 *
 * The cap here is deliberately below that ceiling (with room for multipart
 * overhead), and the client checks the same constant before sending, so users
 * get a clear message instead of a bare 413.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const ALLOWED_IMAGE_LABEL = "PNG, JPG, WebP or GIF";

/** Human message for a rejected file, or null when the file is fine. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `Only ${ALLOWED_IMAGE_LABEL} images are allowed.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `That image is ${mb} MB. Images must be ${MAX_UPLOAD_LABEL} or smaller.`;
  }
  return null;
}
