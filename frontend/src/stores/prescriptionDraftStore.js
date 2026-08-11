import { create } from 'zustand'

export const usePrescriptionDraftStore = create((set) => ({
  files: [],
  medicineId: null,
  setDraft: (medicineId, files) => set({ medicineId, files }),
  clearDraft: () => set({ medicineId: null, files: [] }),
}))
