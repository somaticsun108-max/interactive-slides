import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, validateImageFile } from "@/lib/upload-limits";

/**
 * Vercel rejects any function request body over 4.5 MB (4,718,592 bytes) at the
 * platform layer, before the route runs. The app's own cap must stay under it,
 * or users get an opaque 413 instead of an error message.
 */
const VERCEL_FUNCTION_BODY_CAP = 4.5 * 1024 * 1024;

describe("upload limits", () => {
  it("stays safely below Vercel's function body cap", () => {
    expect(MAX_UPLOAD_BYTES).toBeLessThan(VERCEL_FUNCTION_BODY_CAP);
    // Leave room for multipart framing on top of the file bytes.
    expect(VERCEL_FUNCTION_BODY_CAP - MAX_UPLOAD_BYTES).toBeGreaterThan(256 * 1024);
    expect(MAX_UPLOAD_LABEL).toBe("4 MB");
  });

  it("accepts supported image types at the limit", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(validateImageFile({ type, size: MAX_UPLOAD_BYTES })).toBeNull();
    }
  });

  it("rejects a file one byte over the limit with a readable message", () => {
    const problem = validateImageFile({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 });
    expect(problem).toMatch(/4 MB or smaller/);
    expect(problem).toMatch(/4\.0 MB/);
  });

  it("names the offending size for a file in the old 4.5-5 MB dead zone", () => {
    // This is the range that previously failed with a bare platform 413.
    const problem = validateImageFile({ type: "image/jpeg", size: 4.8 * 1024 * 1024 });
    expect(problem).toBeTruthy();
    expect(problem).toMatch(/4\.8 MB/);
  });

  it("rejects unsupported types", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 1000 })).toMatch(/Only PNG, JPG, WebP or GIF/);
    expect(validateImageFile({ type: "application/pdf", size: 1000 })).toBeTruthy();
  });
});
