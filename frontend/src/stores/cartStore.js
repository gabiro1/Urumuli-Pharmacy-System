import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

const SERVER_PATH = '/patient/cart'

function isPatientAuthenticated() {
  return Boolean(localStorage.getItem('patientAccessToken'))
}

function authHeaders() {
  const token = localStorage.getItem('patientAccessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function mapServerItems(data) {
  return (data?.items || []).map((item) => ({
    medicine: item.medicine,
    quantity: Number(item.quantity),
  }))
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      hydrate: async () => {
        if (!isPatientAuthenticated()) return
        try {
          const { data } = await api.get(SERVER_PATH, { headers: authHeaders() })
          set({ items: mapServerItems(data.data) })
        } catch {
          // Keep the local cart; server may be unreachable.
        }
      },

      addItem: async (medicine, quantity = 1) => {
        const existing = get().items.find((item) => item.medicine.id === medicine.id)
        const nextQuantity = existing
          ? Math.min(99, existing.quantity + quantity)
          : quantity
        set((state) => ({
          items: existing
            ? state.items.map((item) =>
                item.medicine.id === medicine.id ? { ...item, quantity: nextQuantity } : item
              )
            : [...state.items, { medicine, quantity }],
        }))
        if (!isPatientAuthenticated()) return
        try {
          await api.post(
            SERVER_PATH,
            { medicineId: medicine.id, quantity },
            { headers: authHeaders() }
          )
          await get().hydrate()
        } catch {
          await get().hydrate()
        }
      },

      updateQuantity: async (id, quantity) => {
        const clamped = Math.max(0, Math.min(99, quantity))
        set((state) => ({
          items:
            clamped === 0
              ? state.items.filter((item) => item.medicine.id !== id)
              : state.items.map((item) =>
                  item.medicine.id === id ? { ...item, quantity: clamped } : item
                ),
        }))
        if (!isPatientAuthenticated()) return
        try {
          await api.patch(
            `${SERVER_PATH}/${id}`,
            { quantity: clamped },
            { headers: authHeaders() }
          )
          await get().hydrate()
        } catch {
          await get().hydrate()
        }
      },

      removeItem: async (id) => {
        set((state) => ({ items: state.items.filter((item) => item.medicine.id !== id) }))
        if (!isPatientAuthenticated()) return
        try {
          await api.delete(`${SERVER_PATH}/${id}`, { headers: authHeaders() })
        } catch {
          // Ignore; item was already removed locally.
        }
      },

      clear: async () => {
        if (isPatientAuthenticated()) {
          try {
            await api.delete(SERVER_PATH, { headers: authHeaders() })
          } catch {
            // Ignore; local cart is cleared regardless.
          }
        }
        set({ items: [] })
      },

      count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'urumuri-cart', partialize: (state) => ({ items: state.items }) }
  )
)