import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import type { Address } from "@/types";
import type { RootState } from "../store";

const ADDRESSES_KEY = "addresses";

export interface Profile {
  fullName: string;
  email: string;
  phone: string;
}

interface AddressesState {
  addresses: Address[];
  profile: Profile;
}

const initialState: AddressesState = {
  addresses: [],
  profile: { fullName: "", email: "", phone: "" },
};

const persist = (state: AddressesState) =>
  setLocalStorage(ADDRESSES_KEY, {
    addresses: state.addresses,
    profile: state.profile,
  });

const addressesSlice = createSlice({
  name: "addresses",
  initialState,
  reducers: {
    get_addresses: (state) => {
      const persisted = getLocalStorage<AddressesState>(ADDRESSES_KEY, initialState);
      state.addresses = persisted.addresses;
      state.profile = persisted.profile;
    },
    add_address: (state, { payload }: PayloadAction<Address>) => {
      if (payload.isDefault) {
        state.addresses = state.addresses.map((x) => ({ ...x, isDefault: false }));
      }
      state.addresses.push(payload);
      persist(state);
    },
    update_address: (
      state,
      { payload }: PayloadAction<{ id: string; patch: Partial<Address> }>,
    ) => {
      state.addresses = state.addresses.map((a) =>
        a.id === payload.id ? { ...a, ...payload.patch } : a,
      );
      persist(state);
    },
    remove_address: (state, { payload }: PayloadAction<string>) => {
      state.addresses = state.addresses.filter((a) => a.id !== payload);
      persist(state);
    },
    set_default_address: (state, { payload }: PayloadAction<string>) => {
      state.addresses = state.addresses.map((a) => ({
        ...a,
        isDefault: a.id === payload,
      }));
      persist(state);
    },
    update_profile: (state, { payload }: PayloadAction<Partial<Profile>>) => {
      state.profile = { ...state.profile, ...payload };
      persist(state);
    },
    // Replace the whole address book with a server-provided list (adopt-on-login
    // and post-reconcile sync). Leaves the local `profile` (name/email/phone)
    // untouched — that is not part of the synced address history.
    set_addresses: (state, { payload }: PayloadAction<Address[]>) => {
      state.addresses = payload;
      persist(state);
    },
  },
});

export const {
  get_addresses,
  add_address,
  update_address,
  remove_address,
  set_default_address,
  update_profile,
  set_addresses,
} = addressesSlice.actions;

export const selectAddresses = (s: RootState) => s.addresses.addresses;
export const selectProfile = (s: RootState) => s.addresses.profile;

export default addressesSlice.reducer;
