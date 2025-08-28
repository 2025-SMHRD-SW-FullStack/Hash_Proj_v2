import axios from 'axios'
import useAuthStore from '../stores/authStore'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Spring 서버 주소
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 세션 쿠키 자동 포함
})

axiosInstance.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState(); 
    
    // 👇 --- 디버깅 코드 추가 ---
    // console.log('📦 [Axios Interceptor] 현재 accessToken:', accessToken);
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    //   console.log('✅ [Axios Interceptor] Authorization 헤더 추가 완료:', config.headers.Authorization);
    // } else {
    //   console.warn('⚠️ [Axios Interceptor] accessToken이 없어 헤더를 추가하지 못했습니다.');
    }
    // -------------------------
    
    return config;
  }, 
  (error) => {
    return Promise.reject(error);
  }
);


// ✅ 자동 리프레시 처리
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return axiosInstance(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      isRefreshing = true

      try {
        // 1. 백엔드의 /api/auth/refresh API는 LoginResponse를 반환합니다.
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )

        console.log('refresh 응답: ', res.data)

        // 2. 응답에서 새 accessToken을 가져옵니다. (백엔드 LoginResponse DTO 기준)
        const newAccessToken = res.data.accessToken

        if (!newAccessToken) {
          console.error('❌ accessToken이 응답에 없습니다!', res.data)
          throw new Error('AccessToken이 응답에 없습니다')
        }

        // 3. zustand 스토어의 setAccessToken 액션을 호출하여 전역 상태를 업데이트합니다.
        useAuthStore.getState().setAccessToken(newAccessToken)

        processQueue(null, newAccessToken)

        // 실패했던 원래 요청 재시도
        return axiosInstance(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        // 4. 리프레시 실패 시 로그아웃 처리
        useAuthStore.getState().logout()
        window.location.href = '/login' // 확실한 리다이렉트를 위해 추가
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err.response?.data || err.message)
  }
)

export default axiosInstance
