import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  // persist 미들웨어를 사용하여 localStorage에 상태를 자동으로 저장하고 복원합니다.
  persist(
    (set, get) => ({
      // --- 상태 (State) ---
      isLoggedIn: false, // 로그인 여부
      user: null, // 로그인한 사용자 정보 (UserResponse DTO에 해당)
      accessToken: null, // 액세스 토큰
      points: 0, // 포인트 상태

      // --- 액션 (Actions) ---

      /**
       * 로그인 처리 액션
       * @param {object} data - 백엔드 /api/auth/login에서 받은 LoginResponse 객체
       */
      login: (data) => {
        const { accessToken, user, points } = data

        // 상태 업데이트
        set({
          isLoggedIn: true,
          user: user,
          accessToken: accessToken,
          points: points, 
        })
      },

      /**
       * 로그아웃 처리 액션
       */
      logout: async () => {
        // 서버에 로그아웃 요청을 보내는 것은 좋은 방법이지만, 순환 참조를 피하기 위해 여기서는 상태만 초기화합니다.
        // axiosInstance 인터셉터가 토큰을 제거해 줄 것입니다.

        // 상태 초기화
        set({
          isLoggedIn: false,
          user: null,
          accessToken: null,
          points: 0,
        })
      },

      /**
       * (토큰 재발급 시 사용) 액세스 토큰만 업데이트하는 액션
       * @param {string} newAccessToken - 새로 발급받은 액세스 토큰
       */
      setAccessToken: (newAccessToken) => {
        // 상태의 accessToken만 업데이트
        set({ accessToken: newAccessToken })
      },
      // ✅ 포인트 업데이트 액션 추가
      setPoints: (newPoints) => {
        set({ points: newPoints });
      },
    }),
    {
      name: 'auth-storage', // localStorage에 저장될 키 이름
    }
  )
)

export default useAuthStore