/** Parse any YouTube link shape (watch, youtu.be, shorts, embed, live) to a video id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s; // already a video id
  const patterns = [
    /youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
}

export function isValidYouTubeId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

export function embedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
