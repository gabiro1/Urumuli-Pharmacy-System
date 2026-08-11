import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(persist((set, get) => ({
  items: [],
  addItem: (medicine, quantity = 1) => set((state) => {
    const existing = state.items.find((item) => item.medicine.id === medicine.id)
    if (existing) return { items: state.items.map((item) => item.medicine.id === medicine.id ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item) }
    return { items: [...state.items, { medicine, quantity }] }
  }),
  updateQuantity: (id, quantity) => set((state) => ({ items: state.items.map((item) => item.medicine.id === id ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item) })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.medicine.id !== id) })),
  clear: () => set({ items: [] }),
  count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}), { name: 'urumuri-cart', partialize: (state) => ({ items: state.items }) }))
