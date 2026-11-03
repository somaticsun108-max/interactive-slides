/** Built-in clipart library: emoji categories + lucide icon names. */

export interface EmojiCategory {
  name: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys",
    emojis: ["😀", "😂", "🥰", "😎", "🤔", "😴", "🥳", "😭", "😡", "🤯", "🫠", "🤖"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "💪", "🫶", "👉", "👆", "🤞", "🙏"],
  },
  {
    name: "Objects",
    emojis: ["💡", "📊", "📈", "📎", "📌", "🔑", "🔒", "🛠️", "💻", "📱", "🖨️", "✏️"],
  },
  {
    name: "Symbols",
    emojis: ["⭐", "✨", "❤️", "🔥", "✅", "❌", "❓", "❗", "⚠️", "🎯", "🚀", "🏆"],
  },
  {
    name: "Nature",
    emojis: ["🌈", "☀️", "🌙", "⛅", "🌸", "🌲", "🍀", "🌊", "🐱", "🐶", "🦋", "🐝"],
  },
  {
    name: "Food",
    emojis: ["🍕", "🍔", "🌮", "🍎", "🍓", "🍩", "☕", "🍺", "🎂", "🥗", "🍿", "🧁"],
  },
  {
    name: "People",
    emojis: ["🧑‍💻", "🧑‍🏫", "🧑‍🔬", "🦸", "🧙", "🕵️", "👨‍👩‍👧", "🧑‍🎤", "🏋️", "🧘", "🚴", "🕺"],
  },
];

/** Lucide icons available as clipart (name → import kept in components). */
export const CLIPART_ICONS: string[] = [
  "rocket", "star", "heart", "lightbulb", "target", "trophy", "zap", "sparkles",
  "thumbs-up", "flag", "bookmark", "bell", "camera", "message-circle", "globe",
  "map-pin", "clock", "calendar", "search", "settings", "shield", "lock", "mail",
  "music", "video", "image", "code", "database", "cloud", "wifi", "gift", "users",
];
