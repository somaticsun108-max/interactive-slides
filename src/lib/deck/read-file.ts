/**
 * Read a picked file as text.
 *
 * `Blob.text()` is not available in every browser we support (and is missing in
 * some test environments), so this falls back to FileReader.
 */
export async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsText(file);
  });
}
