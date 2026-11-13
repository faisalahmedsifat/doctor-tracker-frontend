import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

export type AppUiStore = {
  sidebarCollapsed: boolean;
  mobileNavigationOpen: boolean;
  commandMenuOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavigationOpen: (open: boolean) => void;
  setCommandMenuOpen: (open: boolean) => void;
};

/**
 * Pattern: Store Factory + Context
 * Problem: a module singleton can leak mutable UI state across concurrent App Router requests.
 * Solution: create one store per provider tree and expose it through React context.
 * Trade-off: consumers require the provider, which keeps the store scoped and testable.
 */
export function createAppUiStore() {
  return createStore<AppUiStore>()(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        mobileNavigationOpen: false,
        commandMenuOpen: false,
        setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setMobileNavigationOpen: (mobileNavigationOpen) => set({ mobileNavigationOpen }),
        setCommandMenuOpen: (commandMenuOpen) => set({ commandMenuOpen }),
      }),
      {
        name: "doctor-tracker:app-ui:v1",
        version: 1,
        skipHydration: true,
        partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as Partial<Pick<AppUiStore, "sidebarCollapsed">>),
        }),
      },
    ),
  );
}

export type AppUiStoreApi = ReturnType<typeof createAppUiStore>;
