import axios from 'axios'
import useAuthStore from '../stores/authStore'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Spring 서버 주소
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 세션 쿠키 자동 포함
})

axiosInstance.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      // Axios v1 헤더 객체 호환
      if (config.headers?.set) {
        config.headers.set('Authorization', `Bearer ${accessToken}`)
      } else {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ✅ 자동 리프레시 처리
let isRefreshing = false
let failedQueue = []

// const processQueue = (error, token = null) => {
//   failedQueue.forEach((prom) => {
//     if (error) prom.reject(error)
//     else prom.resolve(token)
//   })
//   failedQueue = []
// }

// === 추가: 리프레시 동시성 제어 ===
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)))
  failedQueue = []
}

// === 추가: 401이어도 '로그아웃 유발 금지' 경로
const isSafe401 = (cfg) => {
  const url = (cfg?.url || '').toString()
  const method = (cfg?.method || '').toString().toLowerCase()
  return (
    method === 'options' ||
    url.startsWith('/ws-stomp') ||
    url.includes('/api/uploads/') ||
    url.includes('/api/products') ||   // 공개 조회성 API
    url.includes('amazonaws.com') ||
    url.includes('naver') ||           // 오브젝트 스토리지
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/refresh')
  )
}



axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err?.config
    const status = err?.response?.status

        // ✅ 로그인 상태에서만 리프레시 시도
        if (status === 401 && isLoggedIn && !originalRequest._retry) {
          originalRequest._retry = true
    
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({
                resolve: (newToken) => {
                  if (newToken) {
                    if (originalRequest.headers?.set) {
                      originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
                    } else {
                      originalRequest.headers = {
                        ...(originalRequest.headers || {}),
                        Authorization: `Bearer ${newToken}`,
                      }
                    }
                  }
                  resolve(axiosInstance(originalRequest))
                },
                reject,
              })
            })
          }
    
          isRefreshing = true
          try {
            const res = await axios.post(
              `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
              {},
              { withCredentials: true }
            )
            const headerAuth = res?.headers?.authorization
            const newAccessToken =
              res?.data?.accessToken || (headerAuth && headerAuth.replace(/^Bearer\s+/i, '')) || null
            if (!newAccessToken) throw new Error('AccessToken이 응답에 없습니다')
    
            useAuthStore.getState().setAccessToken(newAccessToken)
            axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
    
            if (originalRequest.headers?.set) {
              originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
            } else {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${newAccessToken}`,
              }
            }
    
            processQueue(null, newAccessToken)
            return axiosInstance(originalRequest)
          } catch (refreshErr) {
            processQueue(refreshErr, null)
            // 리프레시 실패 시에만 로그아웃
            try { useAuthStore.getState().logout() } finally {
              if (window.location.pathname !== '/login') window.location.href = '/login'
            }
            return Promise.reject(refreshErr)
          } finally {
            isRefreshing = false
          }
        }
    
        return Promise.reject(err?.response?.data || err)

    // // 네트워크 오류 등은 그대로 던짐
    // if (!originalRequest || !status) {
    //   return Promise.reject(err)
    // }

    // if (status === 401 && !originalRequest._retry) {
    //   originalRequest._retry = true

    //   if (isRefreshing) {
    //     return new Promise((resolve, reject) => {
    //       failedQueue.push({ resolve, reject })
    //     })
    //       .then((newToken) => {
    //         // ★ 추가: 큐 재개 시에도 토큰 주입을 확실히
    //         if (originalRequest.headers?.set) {
    //           originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
    //         } else {
    //           originalRequest.headers = {
    //             ...(originalRequest.headers || {}),
    //             Authorization: `Bearer ${newToken}`,
    //           }
    //         }
    //         return axiosInstance(originalRequest)
    //       })
    //       .catch((e) => Promise.reject(e))
    //   }

    //   isRefreshing = true
    //   try {
    //     // 1) refresh
    //     const res = await axios.post(
    //       `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
    //       {},
    //       { withCredentials: true }
    //     )
    //     const newAccessToken = res.data?.accessToken
    //     if (!newAccessToken) throw new Error('AccessToken이 응답에 없습니다')

    //     // 2) 전역 상태 갱신
    //     useAuthStore.getState().setAccessToken(newAccessToken)

    //     // ★ 추가: 디폴트 헤더에도 즉시 반영 (이후 모든 요청)
    //     axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`

    //     // ★ 추가: 실패했던 원요청에도 즉시 주입
    //     if (originalRequest.headers?.set) {
    //       originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
    //     } else {
    //       originalRequest.headers = {
    //         ...(originalRequest.headers || {}),
    //         Authorization: `Bearer ${newAccessToken}`,
    //       }
    //     }

    //     processQueue(null, newAccessToken)

    //     // 3) 원요청 재시도
    //     return axiosInstance(originalRequest)
    //   } catch (refreshErr) {
    //     processQueue(refreshErr, null)
    //     useAuthStore.getState().logout()
    //     window.location.href = '/login'
    //     return Promise.reject(refreshErr)
    //   } finally {
    //     isRefreshing = false
    //   }
    // }

    // // 그 외 에러는 기존 형태 유지
    // return Promise.reject(err.response?.data || err.message)
  }
)

export default axiosInstance
