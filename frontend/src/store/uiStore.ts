import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  infoPanelOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setInfoPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarOpen: true,
      infoPanelOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setInfoPanelOpen: (open) => set({ infoPanelOpen: open }),
    }),
    {
      name: "signal-ui",
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
