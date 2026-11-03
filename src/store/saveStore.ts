import { create } from "zustand";

export type SaveStatus = "idle" | "loading" | "pending" | "saving" | "saved" | "error";

interface SaveState {
  status: SaveStatus;
  error: string | null;
  lastSavedAt: string | null;
  patch: (p: Partial<Omit<SaveState, "patch">>) => void;
}

/** Cloud-save indicator shown in the top bar (Saving… / Saved / Error). */
export const useSaveStore = create<SaveState>()((set) => ({
  status: "idle",
  error: null,
  lastSavedAt: null,
  patch: (p) => set(p),
}));
