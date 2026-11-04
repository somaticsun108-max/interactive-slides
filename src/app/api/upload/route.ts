import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/session";

import { MAX_UPLOAD_BYTES, validateImageFile } from "@/lib/upload-limits";

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

/**
 * Image upload: session required, type + size validated, stored in Vercel
 * Blob; the public URL is returned and stored on the image object.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  }
  // Kept below Vercel's 4.5 MB function-body cap so the request always reaches
  // this handler and the user gets a message instead of a platform 413.
  const problem = validateImageFile(file);
  if (problem) {
    return NextResponse.json(
      { error: problem },
      { status: file.size > MAX_UPLOAD_BYTES ? 413 : 415 }
    );
  }

  try {
    const ext = EXT[file.type] ?? "img";
    const blob = await put(`decks/${user.id}/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error("[upload] blob put failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
