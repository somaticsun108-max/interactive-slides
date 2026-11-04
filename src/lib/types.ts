// Data model for Interactive Slides.
// Everything is plain JSON so it can be persisted to localStorage now
// and moved to a database later without changing the shape.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export type ObjectType = "text" | "image" | "clipart" | "shape" | "button";

export interface TextProps {
  content: string;
  fontSize: number;
  color: string;
  fontWeight: number;
  align: "left" | "center" | "right";
  italic?: boolean;
}

export interface ImageProps {
  src: string;
  fit: "cover" | "contain";
  radius: number;
}

export interface ClipartProps {
  emoji: string; // rendered at the size of the object
  icon?: string; // lucide icon name (overrides emoji)
  iconColor?: string;
}

export interface ShapeProps {
  shape: "rect" | "circle" | "arrow";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number; // corner radius for rect
}

export interface ButtonProps {
  label: string;
  fill: string;
  textColor: string;
  fontSize: number;
  radius: number;
}

/** A single content block inside a popup or expanded card. */
export type PopupBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; src: string; alt?: string }
  | { id: string; type: "youtube"; videoId: string }
  | { id: string; type: "link"; url: string; label: string };

/** The interactive part: what happens when an object is clicked. */
export type Action =
  | { type: "none" }
  | { type: "popup"; title: string; width: number; blocks: PopupBlock[] }
  | { type: "expand"; blocks: PopupBlock[] }
  | { type: "goto"; slideId: string }
  | { type: "url"; url: string };

export interface SlideObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  action: Action;
  text?: TextProps;
  image?: ImageProps;
  clipart?: ClipartProps;
  shape?: ShapeProps;
  button?: ButtonProps;
}

export type BackgroundType = "solid" | "gradient" | "image";

export interface SlideBackground {
  type: BackgroundType;
  color: string; // solid
  from: string; // gradient start
  to: string; // gradient end
  angle: number; // gradient angle in degrees
  imageUrl?: string; // image
  overlay: number; // 0..1 dark overlay for image backgrounds
}

export type SlideTransition = "none" | "fade" | "slide" | "zoom";

export interface Slide {
  id: string;
  name: string;
  background: SlideBackground;
  objects: SlideObject[];
  /** How this slide animates in when shown during a presentation. */
  transition?: SlideTransition;
}

/** Which colours a new object picks up. */
export type AccentMode = "single" | "rainbow" | "alternate";

/**
 * How the design tokens are resolved for a deck.
 *
 * Three independent controls, deliberately separate fields so changing one
 * never forces another:
 *
 *   colour  → `mood` (one of the studio's 17) or `custom` (one seed)
 *   canvas  → `background` (a paper, a wash, or an exact colour)
 *   look    → `appearance` (geometry, corners, connector style)
 *
 * `themeId` is kept for decks saved by earlier versions. It is read only when
 * `mood` and `appearance` are both absent, so old decks keep their colours.
 */
export interface DeckTheme {
  /** Colour mood id from the studio (see MOOD_LABELS). Preferred. */
  mood?: string | null;
  /** Appearance id from the studio; supplies geometry when no mood is chosen. */
  appearance?: string | null;
  /**
   * Legacy single-select palette. Still honoured on read for decks saved before
   * the mood/appearance split; writes move to `mood`.
   */
  themeId?: string;
  /** Present when a palette is derived from a seed rather than a mood. */
  custom?: { seed: string; bg?: string; mode?: "legible" | "faithful" } | null;
  /**
   * Brand palette override — replaces the accent list only. The studio's
   * "family palette": the canvas, ink and layout are untouched.
   */
  palette?: string[] | null;
  faithful?: boolean;
  /** Canvas override, independent of the palette. */
  background?: string | null;
  accentMode?: AccentMode;
}

export interface Deck {
  version: 1;
  title: string;
  slides: Slide[];
  /**
   * Design tokens for the deck. Absent on decks saved before themes existed;
   * `resolveDeckTheme` fills in the default.
   */
  theme?: DeckTheme;
}
