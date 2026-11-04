import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppHeader, BackToDecks } from "@/components/shared/AppHeader";
import DashboardGrid from "@/app/dashboard/DashboardGrid";
import DecksView from "@/app/decks/DecksView";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { defaultTheme } from "@/lib/deck/theme";
import type { DeckSummary } from "@/lib/deck/store";
import { goldenDoc } from "../helpers";

/**
 * Navigation regressions this locks in:
 *  - the script-deck feature is reachable from the main page (not only by URL),
 *  - "back to all decks" is a visible, labelled control rather than buried in
 *    the avatar menu.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/actions/auth", () => ({ logoutAction: vi.fn() }));

const slides = scriptToSlides(goldenDoc(), defaultTheme, { now: new Date("2026-01-02T03:04:05Z") });

const summary: DeckSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  title: slides[0].headline,
  slideCount: slides.length,
  wordCount: 418,
  estMinutes: 2.8,
  updatedAt: "2026-01-02T00:00:00.000Z",
  firstSlide: slides[0],
};

function navLinks() {
  const nav = screen.getByRole("navigation", { name: "Sections" });
  return within(nav)
    .getAllByRole("link")
    .map((link) => ({ label: link.textContent?.trim(), href: link.getAttribute("href") }));
}

describe("AppHeader", () => {
  it("always exposes both top-level sections", () => {
    render(<AppHeader userEmail="a@b.c" active="dashboard" />);
    expect(navLinks()).toEqual([
      { label: "Slides", href: "/dashboard" },
      { label: "Script decks", href: "/decks" },
    ]);
  });

  it("marks the current section", () => {
    render(<AppHeader userEmail="a@b.c" active="script-decks" />);
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(within(nav).getByRole("link", { name: "Script decks" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Slides" })).not.toHaveAttribute("aria-current");
  });

  it("shows a contextual back link when given one", () => {
    render(<AppHeader userEmail="a@b.c" active="script-decks" backHref="/decks" backLabel="Script decks" />);
    const back = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/decks" && l.className.includes("px-2"));
    expect(back).toBeDefined();
  });

  it("renders page actions passed as children", () => {
    render(
      <AppHeader userEmail="a@b.c" active="script-decks">
        <button>Import script</button>
      </AppHeader>
    );
    expect(screen.getByRole("button", { name: "Import script" })).toBeInTheDocument();
  });
});

describe("BackToDecks", () => {
  it("is a labelled link to the deck list", () => {
    render(<BackToDecks />);
    const link = screen.getByRole("link", { name: /All decks/ });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveAttribute("title", "Back to all decks");
  });
});

describe("dashboard discovery", () => {
  it("shows the script-deck section even with no decks at all", () => {
    render(<DashboardGrid decks={[]} scriptDecks={[]} email="a@b.c" />);
    expect(screen.getByRole("heading", { name: "Script decks" })).toBeInTheDocument();
    expect(screen.getByText("No script decks yet")).toBeInTheDocument();
    // Reachable entry point, not just a heading.
    expect(screen.getAllByRole("link", { name: /Import a script/ })[0]).toHaveAttribute("href", "/decks");
  });

  it("lists script decks next to interactive ones with a Present action", () => {
    render(<DashboardGrid decks={[]} scriptDecks={[summary]} email="a@b.c" />);
    expect(screen.getAllByText(summary.title).length).toBeGreaterThan(0);
    expect(screen.getByText("Script")).toBeInTheDocument();
    const present = screen.getByRole("link", { name: /Present/ });
    expect(present).toHaveAttribute("href", `/present/control?deckId=${summary.id}`);
  });

  it("still renders the interactive decks it already had", () => {
    render(
      <DashboardGrid
        decks={[{ id: "22222222-2222-4222-8222-222222222222", title: "Old deck", isPublic: false, updatedAt: summary.updatedAt, firstSlide: null }]}
        scriptDecks={[]}
        email="a@b.c"
      />
    );
    expect(screen.getByText("Old deck")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New deck/ })).toBeInTheDocument();
  });
});

describe("script decks page", () => {
  it("offers the shared navigation and an import action", () => {
    render(<DecksView decks={[summary]} userEmail="a@b.c" />);
    expect(navLinks()).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Import script/ }).length).toBeGreaterThan(0);
  });

  it("explains itself in the empty state", () => {
    render(<DecksView decks={[]} userEmail="a@b.c" />);
    expect(screen.getByRole("heading", { name: "No script decks yet" })).toBeInTheDocument();
  });

  it("surfaces a database configuration problem instead of failing silently", () => {
    render(<DecksView decks={[]} userEmail="a@b.c" error="The database is not configured." />);
    expect(screen.getByText("The database is not configured.")).toBeInTheDocument();
  });
});
