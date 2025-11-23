import { create } from "zustand";
import { persist } from "zustand/middleware";

const LoginStore = create(
  persist(
    (set) => ({
      step: 1,
      userPhoneData: null,

      setStep: (step) => set({ step }),
      setUserPhoneData: (data) => set({ userPhoneData : data }),
      resetLoginData: () => set({ step: 1, userPhoneData: null }),
    }),
    {
      name: "login-storage", // Key name in localStorage
      partialize: (state) => ({
        step: state.step,
        userPhoneData: state.userPhoneData,
      }),
    }
  )
);

export default LoginStore;
