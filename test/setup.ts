/**
 * Shared test setup.
 *
 * Vitest runs this in both the node and jsdom environments, so anything DOM
 * related is guarded. Component tests rely on unmounting between cases, which
 * Testing Library only does automatically when `globals` is enabled — so it is
 * wired explicitly here.
 */
import { afterEach } from "vitest";
import "@testing-library/dom";
import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  // Lazily imported so the node environment never loads the DOM bindings.
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());

  // jsdom does not implement matchMedia; components query it defensively.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
}
