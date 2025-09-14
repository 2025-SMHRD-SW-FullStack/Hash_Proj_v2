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

      // --- 여기부터 수정 ---

      /**
       * 사용자의 포인트 정보만 업데이트합니다.
       * @param {number} points - 새로운 포인트 잔액
       */
      setPoints: (points) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              // 백엔드 UserResponse DTO에 'points' 필드가 있다고 가정
              // 만약 필드명이 다르다면 (예: pointBalance) 그에 맞게 수정해야 합니다.
              points: points 
            }
          });
        }
      },
      
      // --- 여기까지 수정 ---

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

      /**
       * 로그아웃 시 모든 브라우저 저장소의 데이터를 삭제합니다.
       */
      logout: () => {
        // 1. Zustand 상태 초기화
        set({
          isLoggedIn: false,
          user: null,
          accessToken: null,
          roles: [],
          isSeller: false,
          isAdmin: false
        });

        // 2. localStorage와 sessionStorage의 모든 데이터 삭제
        localStorage.clear();
        sessionStorage.clear();
      },

      setAccessToken: (t) => set({ accessToken: t }),
    }),
    { name: 'auth-storage' }
  )
)

export default useAuthStore