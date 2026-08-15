import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Address } from "@/types";

interface Profile {
  fullName: string;
  email: string;
  phone: string;
}

interface AddressesState {
  addresses: Address[];
  profile: Profile;
  addAddress: (a: Address) => void;
  updateAddress: (id: string, a: Partial<Address>) => void;
  removeAddress: (id: string) => void;
  setDefault: (id: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
}

export const useAddressesStore = create<AddressesState>()(
  persist(
    (set, get) => ({
      addresses: [],
      profile: { fullName: "", email: "", phone: "" },
      addAddress: (a) =>
        set({
          addresses: [
            ...get().addresses.map((x) => (a.isDefault ? { ...x, isDefault: false } : x)),
            a,
          ],
        }),
      updateAddress: (id, patch) =>
        set({
          addresses: get().addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }),
      removeAddress: (id) => set({ addresses: get().addresses.filter((a) => a.id !== id) }),
      setDefault: (id) =>
        set({
          addresses: get().addresses.map((a) => ({ ...a, isDefault: a.id === id })),
        }),
      updateProfile: (p) => set({ profile: { ...get().profile, ...p } }),
    }),
    {
      name: "vh-addresses",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      skipHydration: true,
      partialize: (s) => ({ addresses: s.addresses, profile: s.profile }),
    },
  ),
);
