// /src/config/axiosAI.js
import axios from 'axios'
import useAuthStore from '/src/stores/authStore'

// ────────────────────────────────────────────────────────────────
// BASE URL
// - .env: VITE_AI_API_BASE_URL (예: http://127.0.0.1:8000)
// - 비어있으면 무조건 127.0.0.1:8000 로 폴백 (상대경로 금지)
// ────────────────────────────────────────────────────────────────
const RAW = String(import.meta?.env?.VITE_AI_API_BASE_URL ?? '').trim()
const BASE_URL = (RAW || 'http://127.0.0.1:8000').replace(/\/+$/, '')

// 개발 중엔 한 번만 확인용 로그
if (import.meta?.env?.DEV) {
  // eslint-disable-next-line no-console
  console.debug('[axiosAI] baseURL =', BASE_URL)
}

const axiosAI = axios.create({
  baseURL: BASE_URL,                   // ← 절대 비우지 않음 (상대경로 방지)
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,              // AI 서버는 세션 쿠키 안 씀
})

// ────────────────────────────────────────────────────────────────
/** Authorization 주입 (Zustand → localStorage 순) */
axiosAI.interceptors.request.use((config) => {
  let token = ''
  try {
    token =
      useAuthStore.getState()?.accessToken ||
      localStorage.getItem('access_token') ||
      ''
  } catch {
    /* noop */
  }

  if (token) {
    if (!/^Bearer\s+/i.test(token)) token = `Bearer ${token}`
    config.headers = { ...(config.headers || {}), Authorization: token }
  }
  return config
})
// ────────────────────────────────────────────────────────────────

export default axiosAI
