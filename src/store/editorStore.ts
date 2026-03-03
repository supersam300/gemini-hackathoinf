import { create } from "zustand";

interface EditorStore {
  code: string;
  language: "c" | "cpp" | "python";
  hasChanges: boolean;

  setCode: (code: string) => void;
  setLanguage: (language: "c" | "cpp" | "python") => void;
  setHasChanges: (hasChanges: boolean) => void;
  clearCode: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  code: "",
  language: "cpp",
  hasChanges: false,

  setCode: (code) => set({ code, hasChanges: true }),

  setLanguage: (language) => set({ language }),

  setHasChanges: (hasChanges) => set({ hasChanges }),

  clearCode: () =>
    set({
      code: "",
      hasChanges: false,
    }),
}));
