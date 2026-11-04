import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { defaultTheme } from "@/lib/deck/theme";
import type { Deck } from "@/lib/deck/slide-types";
import { usePresentSession } from "@/components/present/usePresentSession";
import AudienceView from "@/components/present/AudienceView";
import { goldenDoc } from "../helpers";

/**
 * End-to-end check of the presenter ⇄ audience contract with a fake
 * BroadcastChannel that routes messages between instances in this realm.
 *
 * This is the test that proves the important safety property: the audience can
 * only ever receive what the presenter chooses to put on the wire, and the
 * wire never carries narration.
 */

class FakeBroadcastChannel {
  static instances = new Set<FakeBroadcastChannel>();
  static delivered: unknown[] = [];
  static closed = 0;

  name: string;
  readyState = "open";
  private listeners = new Set<(event: MessageEvent) => void>();
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.add(this);
  }

  postMessage(data: unknown): void {
    // BroadcastChannel never delivers to the sender; mirror that.
    for (const other of FakeBroadcastChannel.instances) {
      if (other === this || other.name !== this.name) continue;
      queueMicrotask(() => other.deliver(data));
    }
  }

  private deliver(data: unknown) {
    FakeBroadcastChannel.delivered.push(data);
    const event = { data } as MessageEvent;
    this.onmessage?.(event);
    for (const listener of this.listeners) listener(event);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === "message") this.listeners.delete(listener);
  }

  close() {
    FakeBroadcastChannel.instances.delete(this);
    FakeBroadcastChannel.closed += 1;
    this.readyState = "closed";
  }
}

function makeDeck(): Deck {
  const slides = scriptToSlides(goldenDoc(), defaultTheme, { now: new Date("2026-01-02T03:04:05.000Z") });
  return {
    id: "dk_two_window_test",
    title: slides[0].headline,
    slides,
    source: {
      sourceHash: "0".repeat(64),
      importedAt: "2026-01-02T03:04:05.000Z",
      headingCount: 13,
      maxDepth: 5,
    },
    themeId: defaultTheme.id,
  };
}

/** Minimal presenter window: the session hook plus the audience in the same tree. */
function TwoWindows({ deck }: { deck: Deck }) {
  const session = usePresentSession(deck);
  return (
    <div>
      <p data-testid="position">
        {session.position.slideIndex}:{session.position.stepIndex}
      </p>
      <button onClick={session.advance}>next</button>
      <button onClick={session.retreat}>prev</button>
      <button onClick={session.startTimer}>start timer</button>
      <AudienceView deckId={deck.id} />
    </div>
  );
}

beforeEach(() => {
  FakeBroadcastChannel.instances.clear();
  FakeBroadcastChannel.delivered = [];
  FakeBroadcastChannel.closed = 0;
  (window as unknown as { BroadcastChannel: unknown }).BroadcastChannel = FakeBroadcastChannel;
});

afterEach(() => {
  (window as unknown as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;
});

describe("presenter ⇄ audience windows", () => {
  it("renders the slide the presenter advances to", async () => {
    const deck = makeDeck();
    render(<TwoWindows deck={deck} />);

    // Before the first message the audience shows nothing but a waiting state.
    expect(screen.getByTestId("audience")).toHaveTextContent("Waiting for the presenter");

    await act(async () => {
      fireEvent.click(screen.getByText("next"));
    });

    // One advance from the title slide lands on the first `##` slide.
    await waitFor(() => expect(screen.getByTestId("audience")).toHaveTextContent(deck.slides[1].headline));
  });

  it("never puts narration on the wire", async () => {
    const deck = makeDeck();
    render(<TwoWindows deck={deck} />);

    await act(async () => {
      fireEvent.click(screen.getByText("next"));
    });

    expect(FakeBroadcastChannel.delivered.length).toBeGreaterThan(0);
    const wire = JSON.stringify(FakeBroadcastChannel.delivered);
    for (const slide of deck.slides) {
      expect(wire).not.toContain(slide.notes.narration.slice(0, 40));
    }
    expect(wire).not.toContain("narration");
    expect(wire).not.toContain("notes");
    expect(wire).not.toContain("sourceHash");
  });

  it("audience DOM never contains narration for any slide", async () => {
    const deck = makeDeck();
    render(<TwoWindows deck={deck} />);

    // Walk the whole deck, checking the audience after every advance.
    for (let i = 0; i < deck.slides.length; i++) {
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
      });
      const audience = screen.getByTestId("audience");
      for (const slide of deck.slides) {
        const firstParagraph = slide.notes.narration.split("\n\n")[0];
        expect(audience.textContent ?? "").not.toContain(firstParagraph);
      }
    }
  });

  it("reveals steps before advancing the slide", async () => {
    const deck = makeDeck();
    const slideIndex = deck.slides.findIndex((s) => s.layoutId === "content.steps" || s.layoutId === "hero.title");
    render(<TwoWindows deck={deck} />);

    // Walk to the first step-bearing slide.
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
      });
    }

    const steps = deck.slides.findIndex((s) => s.layoutId === "content.steps");
    expect(steps).toBeGreaterThan(slideIndex);
    expect(screen.getByTestId("position").textContent).toContain(":");
  });

  it("creates exactly one channel per window under StrictMode", async () => {
    const deck = makeDeck();
    render(
      <StrictMode>
        <TwoWindows deck={deck} />
      </StrictMode>
    );

    // One presenter channel + one audience channel, despite double-invoked effects.
    await waitFor(() => expect(FakeBroadcastChannel.instances.size).toBe(2));
    const names = [...FakeBroadcastChannel.instances].map((c) => c.name);
    expect(new Set(names)).toEqual(new Set([`deck-sync:${deck.id}`]));
  });

  it("syncs a window that joins late (handshake in both directions)", async () => {
    const deck = makeDeck();
    render(
      <StrictMode>
        <TwoWindows deck={deck} />
      </StrictMode>
    );

    // Whoever opened first, the audience ends up on the presenter's live slide.
    await waitFor(() => expect(screen.getByTestId("audience")).toHaveTextContent(deck.slides[0].headline));

    const hellos = FakeBroadcastChannel.delivered.filter((m) => (m as { type?: string }).type === "hello");
    expect(hellos.length).toBeLessThanOrEqual(1);
    // The audience never posts anything except its single hello.
    for (const message of FakeBroadcastChannel.delivered) {
      const type = (message as { type?: string }).type;
      expect(["hello", "state", "slide-change", "session-end"]).toContain(type);
    }
  });

  it("delivers each advance exactly once (no duplicate channels)", async () => {
    const deck = makeDeck();
    render(
      <StrictMode>
        <TwoWindows deck={deck} />
      </StrictMode>
    );
    await waitFor(() => expect(FakeBroadcastChannel.instances.size).toBe(2));

    FakeBroadcastChannel.delivered = [];
    await act(async () => {
      fireEvent.click(screen.getByText("next"));
    });

    // Exactly one snapshot for one advance (the handshake already settled).
    const snapshots = FakeBroadcastChannel.delivered.filter(
      (m) => (m as { type?: string }).type === "state"
    );
    expect(snapshots).toHaveLength(1);
  });

  it("closes both channels on unmount", async () => {
    const deck = makeDeck();
    const { unmount } = render(<TwoWindows deck={deck} />);
    await waitFor(() => expect(FakeBroadcastChannel.instances.size).toBe(2));

    unmount();
    expect(FakeBroadcastChannel.instances.size).toBe(0);
    expect(FakeBroadcastChannel.closed).toBe(2);
  });

  it("ignores messages for another deck", async () => {
    const deck = makeDeck();
    render(<AudienceView deckId={deck.id} />);

    const [audienceChannel] = [...FakeBroadcastChannel.instances];
    act(() => {
      audienceChannel.postMessage({
        v: 1,
        deckId: "someone-elses-deck",
        type: "slide-change",
        slideIndex: 0,
        total: 3,
        stepIndex: 0,
        slide: { id: "x", layoutId: "content.message", headline: "Not my deck", body: [] },
      });
    });

    await waitFor(() => expect(screen.getByTestId("audience")).toHaveTextContent("Waiting for the presenter"));
    expect(screen.getByTestId("audience")).not.toHaveTextContent("Not my deck");
  });
});

describe("audience joining late (the black-screen bug)", () => {
  /** Audience window that mounts first, exactly like opening /present/audience
   *  by hand before any presenter exists. */
  function AudienceOnly({ deck }: { deck: Deck }) {
    return <AudienceView deckId={deck.id} />;
  }

  function PresenterOnly({ deck }: { deck: Deck }) {
    const session = usePresentSession(deck);
    return (
      <div>
        <p data-testid="position">
          {session.position.slideIndex}:{session.position.stepIndex}
        </p>
        <button onClick={session.advance}>next</button>
        <button onClick={session.resync}>resync</button>
      </div>
    );
  }

  it("shows a slide when the presenter window opens second", async () => {
    const deck = makeDeck();
    const { unmount } = render(<AudienceOnly deck={deck} />);
    expect(screen.getByTestId("audience")).toHaveTextContent("Waiting for the presenter");

    // Presenter appears afterwards: its mount snapshot must reach the audience.
    render(<PresenterOnly deck={deck} />);
    await waitFor(() => expect(screen.getByTestId("audience")).toHaveTextContent(deck.slides[0].headline));

    unmount();
  });

  it("recovers with an explicit resync if a snapshot was missed", async () => {
    const deck = makeDeck();
    render(<AudienceOnly deck={deck} />);
    const { unmount } = render(<PresenterOnly deck={deck} />);
    await waitFor(() => expect(screen.getByTestId("audience")).toHaveTextContent(deck.slides[0].headline));

    // Simulate a window that mounted with nothing and the audience dropping out.
    await act(async () => {
      fireEvent.click(screen.getByText("resync"));
    });
    await waitFor(() => expect(screen.getByTestId("audience")).toHaveTextContent(deck.slides[0].headline));
    unmount();
  });

  it("ignores stale snapshots (lower seq) so the audience never goes backwards", async () => {
    const deck = makeDeck();
    FakeBroadcastChannel.instances.clear();
    render(<AudienceOnly deck={deck} />);
    // Post from a separate channel, like a presenter window would: a channel
    // never receives its own messages.
    const sender = new FakeBroadcastChannel(`deck-sync:${deck.id}`);

    const snapshot = (seq: number, headline: string) => ({
      v: 1,
      deckId: deck.id,
      type: "state",
      slideIndex: 0,
      stepIndex: 0,
      total: 2,
      seq,
      slide: { id: "s", layoutId: "content.message", headline, body: ["x"], themeId: "brand.default" },
    });

    await act(async () => {
      sender.postMessage(snapshot(5, "Newer"));
    });
    await waitFor(() => expect(screen.getByTestId("audience")).toHaveTextContent("Newer"));

    await act(async () => {
      sender.postMessage(snapshot(3, "Older"));
    });
    // Give the (synchronous) listener a tick to run.
    await act(async () => {});
    expect(screen.getByTestId("audience")).toHaveTextContent("Newer");
    expect(screen.getByTestId("audience")).not.toHaveTextContent("Older");
  });
});
