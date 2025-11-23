import { create } from "zustand";
import { persist } from "zustand/middleware";

const useLayOutStore = create(
  persist(
    (set) => ({
      activeTab: "chats",
      selectedContact: null,
      setSelectedContact: (contact) => set({ selectedContact: contact }),
      setActive: (tab) => set({ activeTab: tab }),
    }),
    {
      name: "layout-storage", // key for localStorage
      getStorage: () => localStorage, // optional (default is localStorage)
    }
  )
);

export default useLayOutStore;
