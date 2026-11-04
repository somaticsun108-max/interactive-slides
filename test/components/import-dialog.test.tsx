import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ImportScriptDialog from "@/app/decks/ImportScriptDialog";
import { readFixture } from "../helpers";

// The dialog navigates after a successful import; the router is not under test.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const FIXTURE = readFixture("consistent-meditation.md");

function paste(text: string) {
  const box = screen.getByLabelText("…or paste the script") as HTMLTextAreaElement;
  fireEvent.change(box, { target: { value: text } });
  return box;
}

function importButton() {
  return screen.getByRole("button", { name: "Import" });
}

describe("ImportScriptDialog", () => {
  it("renders nothing when closed", () => {
    render(<ImportScriptDialog open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("blocks Import until the script has zero errors", () => {
    render(<ImportScriptDialog open onClose={() => {}} />);
    expect(importButton()).toBeDisabled();

    paste("# Title\n\n## A\n\n#### Skipped level\n");
    expect(importButton()).toBeDisabled();

    paste(FIXTURE);
    expect(importButton()).toBeEnabled();
  });

  it("lists every error with its line number and a jump action", () => {
    render(<ImportScriptDialog open onClose={() => {}} />);
    paste("# T\n\n##\n\n#### Deep\n\nScript:\n*bold* and `code`\n");

    const list = screen.getByRole("list", { name: "Validation errors" });
    const items = within(list).getAllByRole("listitem");
    // empty heading, level skip, and the markdown line (one report per line).
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("line 3");
    expect(items[0]).toHaveTextContent("Heading level 2 has no text");
    expect(items[1]).toHaveTextContent("line 5");
    expect(items[1]).toHaveTextContent("cannot be skipped");
    expect(items[2]).toHaveTextContent("line 8");
    expect(within(list).getAllByRole("button", { name: "Jump to line" })).toHaveLength(3);
  });

  it("jump to line highlights that line in the read-only preview", () => {
    render(<ImportScriptDialog open onClose={() => {}} />);
    paste("# T\n\n## A\n\nScript:\n*not allowed*\n");

    const preview = screen.getByTestId("source-preview");
    const lineFive = preview.querySelector('[data-line="6"]')!;
    expect(lineFive.className).not.toContain("bg-amber-100");

    const jump = screen.getAllByRole("button", { name: "Jump to line" })[0];
    fireEvent.click(jump);

    expect(preview.querySelector('[data-line="6"]')!.className).toContain("bg-amber-100");
  });

  it("shows warnings without blocking import", () => {
    render(<ImportScriptDialog open onClose={() => {}} />);
    // Valid script, but the node has no On-screen text and no narration.
    paste("# T\n\n## A\n\nOn-screen:\nJust a line\n");

    expect(screen.getByRole("list", { name: "Warnings" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Validation errors" })).toBeNull();
    expect(importButton()).toBeEnabled();
  });

  it("shows validation warnings for the fixture without blocking it", () => {
    render(<ImportScriptDialog open onClose={() => {}} />);
    paste(FIXTURE);
    expect(screen.queryByRole("list", { name: "Validation errors" })).toBeNull();
    // Two deliberate section-divider / narration-only nodes in the fixture.
    expect(within(screen.getByRole("list", { name: "Warnings" })).getAllByRole("listitem")).toHaveLength(2);
    expect(importButton()).toBeEnabled();
    // 1 title slide + 13 headings, 418 narrated words at 150 wpm
    expect(screen.getByText(/~14 slides · 418 narrated words · ~2\.8 min/)).toBeInTheDocument();
  });

  it("accepts a dropped-in file and validates its contents", async () => {
    render(<ImportScriptDialog open onClose={() => {}} />);
    const file = new File([FIXTURE], "meditation.md", { type: "text/markdown" });
    const input = screen.getByLabelText("Script file") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("meditation.md")).toBeInTheDocument();
    await vi.waitFor(() => expect(importButton()).toBeEnabled());
  });
});
