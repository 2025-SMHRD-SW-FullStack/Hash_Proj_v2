import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 2. server의 proxy 설정
  // 5172 port -> 8088 port
  // Cross-origin으로 간주하고 차단한다 => CORS
  // 보안문제때문에 
  server : {
    proxy : {
      // 차단하지 말라고 원래 포트 번호가 8088이라고 속이는거임
      '/api' : 'http://localhost:7777'
    }
  }

})