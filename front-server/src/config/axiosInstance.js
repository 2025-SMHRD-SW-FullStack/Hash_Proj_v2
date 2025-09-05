// /src/config/axiosInstance.js
import axios from 'axios'
import useAuthStore from '../stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Spring 서버 주소
  timeout: 5000,
  withCredentials: true, // 세션 쿠키 자동 포함
})

// 공개 API: 토큰 미첨부
const isPublic = (cfg) => {
  const url = (cfg?.url || '').toString()
  const method = (cfg?.method || 'get').toLowerCase()
  return (
    url.startsWith('/ws-stomp') ||
    url.includes('/api/uploads/') ||
    url.includes('/api/products') ||
    (method === 'get' && url.includes('/api/ads/active/'))
  )
}

// 요청 인터셉터 (FormData 처리 + 토큰 부착)
api.interceptors.request.use(
  (config) => {
    const isFD = typeof FormData !== 'undefined' && config?.data instanceof FormData

    if (isFD) {
      if (config.headers?.delete) config.headers.delete('Content-Type')
      else if (config.headers) delete config.headers['Content-Type']
      config.transformRequest = [(d) => d] // stringify 금지
    } else {
      if (config.headers?.set) config.headers.set('Content-Type', 'application/json')
      else config.headers = { ...(config.headers || {}), 'Content-Type': 'application/json' }
    }

    const { accessToken } = useAuthStore.getState()
    if (accessToken && !isPublic(config)) {
      if (config.headers?.set) config.headers.set('Authorization', `Bearer ${accessToken}`)
      else config.headers = { ...(config.headers || {}), Authorization: `Bearer ${accessToken}` }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ===== 자동 리프레시 =====
let isRefreshing = false
let failedQueue = []
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)))
  failedQueue = []
}

// 401이어도 로그아웃 유발하지 않을 경로
const isSafe401 = (cfg) => {
  const url = (cfg?.url || '').toString()
  const method = (cfg?.method || '').toString().toLowerCase()
  return (
    method === 'options' ||
    url.startsWith('/ws-stomp') ||
    url.includes('/api/uploads/') ||
    url.includes('/api/products') ||
    url.includes('/api/ads/') ||
    url.includes('amazonaws.com') ||
    url.includes('naver') ||
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/refresh')
  )
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err?.config
    const status = err?.response?.status
    const { isLoggedIn } = useAuthStore.getState() || { isLoggedIn: false }

    if (status === 401 && (isSafe401(originalRequest) || !isLoggedIn)) {
      return Promise.reject(err?.response?.data || err)
    }

    if (status === 401 && isLoggedIn && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken) => {
              if (newToken) {
                if (originalRequest.headers?.set)
                  originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
                else
                  originalRequest.headers = {
                    ...(originalRequest.headers || {}),
                    Authorization: `Bearer ${newToken}`,
                  }
              }
              resolve(api(originalRequest))
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
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`

        if (originalRequest.headers?.set)
          originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
        else
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          }

        processQueue(null, newAccessToken)
        return api(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
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

export default api
export { api as axiosInstance }
