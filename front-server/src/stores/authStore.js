import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../config/axiosInstance'

const useAuthStore = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      accessToken: null,
      roles: [],
      isSeller: false,
      isAdmin: false,

      login: (data) => {
        const { accessToken, user } = data
        // ── roles/권한 안전 파싱 (서버가 seller/isSeller 둘 다 올 수 있음)
        const roles = Array.isArray(user?.roles)
          ? user.roles
          : (user?.role ? [user.role] : [])

        const isSeller =
          (user?.isSeller ?? user?.seller ?? false) ||
          (Array.isArray(roles) && roles.includes('SELLER'))

        const isAdmin =
          (user?.isAdmin ?? user?.admin ?? false) ||
          (Array.isArray(roles) && roles.includes('ADMIN'))

        set({
          isLoggedIn: true,
          user,
          accessToken,
          roles,
          isSeller,
          isAdmin,
        })
      },

      setUser: (user) => set({ user }),

      ensureMe: async () => {
        if (!get().isLoggedIn) return
        try {
          const me = await api.get('/api/me').then(r => r.data)

          const roles = Array.isArray(me?.roles) ? me.roles : []
          const isSeller =
            (me?.isSeller ?? me?.seller ?? false) ||
            (roles.includes('SELLER'))
          const isAdmin =
            (me?.isAdmin ?? me?.admin ?? false) ||
            (roles.includes('ADMIN'))

          set({
            user: { ...(get().user || {}), ...me },
            roles,
            isSeller,
            isAdmin,
          })
        } catch {
          /* no-op */
        }
      },

      logout: () => set({
        isLoggedIn: false, user: null, accessToken: null,
        roles: [], isSeller: false, isAdmin: false
      }),

      setAccessToken: (t) => set({ accessToken: t }),
    }),
    { name: 'auth-storage' }
  )
)

export default useAuthStore
