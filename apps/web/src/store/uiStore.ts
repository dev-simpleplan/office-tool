import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

interface UiState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

const storedTheme = (localStorage.getItem("op-theme") as Theme | null) ?? "system";
applyTheme(storedTheme);

export const useUiStore = create<UiState>((set) => ({
  theme: storedTheme,
  setTheme: (theme) => {
    localStorage.setItem("op-theme", theme);
    applyTheme(theme);
    set({ theme });
  },
}));
