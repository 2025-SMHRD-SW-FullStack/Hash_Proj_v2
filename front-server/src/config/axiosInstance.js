// src/config/axiosInstance

import axios from 'axios'
import useAuthStore from '../stores/authStore'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Spring 서버 주소
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 세션 쿠키 자동 포함
})

// ===== (A) 공개 URL 판별: 토큰 미첨부 =====
const isPublic = (cfg) => {
  const url = (cfg?.url || '').toString()
  const method = (cfg?.method || 'get').toLowerCase()
  return (
    url.startsWith('/ws-stomp') ||
    url.includes('/api/uploads/') ||
    url.includes('/api/products') ||
    (method === 'get' && url.includes('/api/ads/active/')) // 광고 조회는 공개
  )
}

axiosInstance.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken && !isPublic(config)) {
      // Axios v1 헤더 객체 호환
      if (config.headers?.set) {
        config.headers.set('Authorization', `Bearer ${accessToken}`)
      } else {
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${accessToken}` }
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ✅ 자동 리프레시 처리
let isRefreshing = false
let failedQueue = []

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
    url.includes('/api/ads/') ||        // 광고 API 전체(특히 /active/)
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

    // 🔹 누락되어 있던 부분: 스토어에서 isLoggedIn 읽기
    const { isLoggedIn } = useAuthStore.getState() || { isLoggedIn: false }

    // 🔹 화이트리스트이거나 비로그인 상태의 401은 로그아웃/리프레시 금지
    if (status === 401 && (isSafe401(originalRequest) || !isLoggedIn)) {
      return Promise.reject(err?.response?.data || err)
    }

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
  }
)

export default axiosInstance
