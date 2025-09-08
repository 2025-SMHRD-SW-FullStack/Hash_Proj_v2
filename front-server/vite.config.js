import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0 과 동일
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: [
      'localhost',
      '3.36.134.163',
      'firsttry.smhrd.com',
      '.elasticbeanstalk.com', // 모든 EB 도메인 허용
      'hash-proj-v2.eba-ijnehrgn.ap-northeast-2.elasticbeanstalk.com'
    ],
    
    proxy: {
      // ������ AI는 /api/ai로 받는다 → 8001로 프록시 (rewrite 불필요)
      '/api/ai': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // ������ 그 밖의 /api/** 는 스프링으로
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/ws-stomp': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/oauth2': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        xfwd: true,
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'firsttry.smhrd.com',
          'X-Forwarded-Port': '443',
          'Host': 'firsttry.smhrd.com',
        },
      },
      '/login': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        xfwd: true,
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'firsttry.smhrd.com',
          'X-Forwarded-Port': '443',
          'Host': 'firsttry.smhrd.com',
        },
      },
    }
  }
})
