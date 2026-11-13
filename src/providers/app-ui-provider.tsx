"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createAppUiStore, type AppUiStore, type AppUiStoreApi } from "@/stores/app-ui-store";

const AppUiStoreContext = createContext<AppUiStoreApi | null>(null);

export function AppUiProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [store] = useState(createAppUiStore);

  useEffect(() => {
    void store.persist.rehydrate();
  }, [store]);

  return <AppUiStoreContext.Provider value={store}>{children}</AppUiStoreContext.Provider>;
}

export function useAppUiStore<T>(selector: (state: AppUiStore) => T): T {
  const store = useContext(AppUiStoreContext);
  if (!store) {
    throw new Error("useAppUiStore must be used within AppUiProvider.");
  }
  return useStore(store, selector);
}
