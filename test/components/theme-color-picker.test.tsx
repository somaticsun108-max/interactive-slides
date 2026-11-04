import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThemeColorPicker from "@/components/editor/ThemeColorPicker";
import { useDeck } from "@/store/deckStore";
import { resolveTheme } from "@/lib/theming/themes";

/**
 * The complaint this replaces: the only colour control was a raw
 * `<input type="color">`, so there was no way to pick *from the theme*.
 */
function withTheme(themeId: string) {
  useDeck.getState().setTheme({ themeId });
}

describe("theme colour picker", () => {
  it("offers the deck's accents as swatches", () => {
    withTheme("ocean");
    render(<ThemeColorPicker label="Fill" value="#2B6F8E" onChange={() => {}} />);
    fireEvent.click(screen.getByTestId("colour-button-fill"));

    const theme = resolveTheme({ themeId: "ocean" });
    for (const accent of theme.accents) {
      expect(screen.getByLabelText(new RegExp(accent.fill, "i"))).toBeTruthy();
    }
  });

  it("reports the accent's text colour alongside the swatch", () => {
    withTheme("terracotta");
    render(<ThemeColorPicker label="Fill" value="#BA594A" onChange={() => {}} />);
    fireEvent.click(screen.getByTestId("colour-button-fill"));
    const theme = resolveTheme({ themeId: "terracotta" });
    // Title text carries the contrast note that makes a swatch safe to pick.
    expect(
      screen.getByLabelText(`Accent 1 ${theme.accents[0].fill} · text ${theme.accents[0].text}`)
    ).toBeTruthy();
  });

  it("applies a chosen swatch immediately", () => {
    withTheme("pastel");
    let chosen = "";
    render(<ThemeColorPicker label="Fill" value="#F4A6A0" onChange={(v) => (chosen = v)} />);
    fireEvent.click(screen.getByTestId("colour-button-fill"));

    const theme = resolveTheme({ themeId: "pastel" });
    const target = theme.accents[2].fill;
    fireEvent.click(screen.getByLabelText(new RegExp(`^Accent 3`)));
    expect(chosen).toBe(target);
  });

  it("keeps an exact colour available without making it the only option", () => {
    withTheme("spectrum");
    render(<ThemeColorPicker label="Color" value="#123456" onChange={() => {}} />);
    fireEvent.click(screen.getByTestId("colour-button-color"));

    // The raw colour input is behind a disclosure, not the primary control.
    expect(screen.queryByLabelText("Color exact colour")).toBeNull();
    fireEvent.click(screen.getByText("Exact colour…"));
    expect(screen.getByLabelText("Color exact colour")).toBeTruthy();
    expect(screen.getByLabelText("Color hex value")).toBeTruthy();
  });

  it("offers the theme's papers as well as its accents", () => {
    withTheme("ocean");
    render(<ThemeColorPicker label="Color" value="#2D3748" onChange={() => {}} context="paper" />);
    fireEvent.click(screen.getByTestId("colour-button-color"));
    // The theme's own background is pickable, which is what makes text sit on
    // the paper rather than "some hex someone remembered".
    expect(screen.getByLabelText(/^Theme ink #/)).toBeTruthy();
    expect(screen.getByLabelText("White #FFFFFF")).toBeTruthy();
  });

  it("marks swatches that would not read as text", () => {
    withTheme("pastel");
    const { container } = render(<ThemeColorPicker label="Color" value="#2D3748" onChange={() => {}} />);
    fireEvent.click(screen.getByTestId("colour-button-color"));
    // Pastel's fills are light, so several swatches get the warning dot.
    const dots = container.querySelectorAll(".bg-rose-500");
    expect(dots.length).toBeGreaterThan(0);
  });
});
