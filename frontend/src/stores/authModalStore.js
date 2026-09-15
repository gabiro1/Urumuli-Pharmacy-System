import { create } from 'zustand'

export const useAuthModalStore = create((set) => ({
  open: false,
  view: 'login',
  redirectPath: null,
  openModal: (view = 'login', redirectPath = null) =>
    set({ open: true, view, redirectPath }),
  closeModal: () => set({ open: false }),
  setView: (view) => set({ view }),
}))