// /src/config/axiosAI.js
import axios from 'axios'
import useAuthStore from '../stores/authStore'

// ── BASE URL (.env 폴백: VITE_AI_API_BASE_URL → VITE_AI_BASE_URL)
const RAW =
  String(import.meta?.env?.VITE_AI_API_BASE_URL ?? '').trim() ||
  String(import.meta?.env?.VITE_AI_BASE_URL ?? '').trim()
const BASE_URL = (RAW || '/api/ai').replace(/\/+$/, '')

if (import.meta?.env?.DEV) {
  // eslint-disable-next-line no-console
  console.debug('[axiosAI] baseURL =', BASE_URL)
}

const axiosAI = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  withCredentials: false, // 쿠키 안 씀
})

// Authorization 주입 (+ FormData일 때 Content-Type 제거)
axiosAI.interceptors.request.use((config) => {


  if (typeof config.url === 'string' && BASE_URL.endsWith('/api/ai') && config.url.startsWith('/api/ai/')) {
    config.url = config.url.replace(/^\/api\/ai/, '')
  }

  // FormData면 Content-Type 제거 (boundary 자동)
  const isFD = typeof FormData !== 'undefined' && config?.data instanceof FormData
  if (isFD) {
    if (config.headers?.delete) config.headers.delete('Content-Type')
    else if (config.headers) delete config.headers['Content-Type']
    config.transformRequest = [(d) => d]
  } else {
    if (config.headers?.set) config.headers.set('Content-Type', 'application/json')
    else config.headers = { ...(config.headers || {}), 'Content-Type': 'application/json' }
  }

  // 토큰
  let token = ''
  try {
    token =
      useAuthStore.getState()?.accessToken ||
      localStorage.getItem('access_token') ||
      ''
  } catch { /* noop */ }

  if (token) {
    if (!/^Bearer\s+/i.test(token)) token = `Bearer ${token}`
    if (config.headers?.set) config.headers.set('Authorization', token)
    else config.headers = { ...(config.headers || {}), Authorization: token }
  }
  return config
})

export default axiosAI
