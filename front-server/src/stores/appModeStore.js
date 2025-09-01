import { create } from 'zustand'

const initial = localStorage.getItem('appMode') || 'user' // 'user' | 'seller'

const useAppModeStore = create((set) => ({
  mode: initial,
  setMode: (mode) => {
    localStorage.setItem('appMode', mode)
    set({ mode })
  },
}))

export default useAppModeStore
