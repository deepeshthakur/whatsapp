import { create } from "zustand";
import { persist } from "zustand/middleware";

const useThemeStore = create(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme : theme }),
    }),
    {
      name: "theme", // key for localStorage
      getStorage: () => localStorage, // optional (default is localStorage)
    }
  )
);

export default useThemeStore;
