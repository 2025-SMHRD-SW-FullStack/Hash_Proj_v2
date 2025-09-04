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
      '.elasticbeanstalk.com', // 모든 EB 도메인 허용
      'hash-proj-v2.eba-ijnehrgn.ap-northeast-2.elasticbeanstalk.com'
    ],
  }
})
