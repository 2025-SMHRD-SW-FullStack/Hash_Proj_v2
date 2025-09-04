import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import fs from "fs"
import viteCompression from "vite-plugin-compression"
import postcssConfig from "./postcss.config.js"

// package.json 파일을 동적으로 가져옵니다.
const pkg = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url))
)

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
    port: 3000,
    // CHECK: 개발 중 브라우저 새로고침 없이 즉시 반영하는 모드 -> 개발 중에만 주석 처리해서 사용
    // hmr: false,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        ws: true,
      },
    },
  },
  css: {
    postcss: postcssConfig,
  },
  plugins: [
    react(),
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "react-router-dom"],
    alias: [
      { find: "@", replacement: resolve(__dirname, "src") },
      {
        find: "react",
        replacement: resolve(__dirname, "node_modules/react"),
      },
      {
        find: "react-dom",
        replacement: resolve(__dirname, "node_modules/react-dom"),
      },
      {
        find: "react-router-dom",
        replacement: resolve(__dirname, "node_modules/react-router-dom"),
      },
    ],
  },
  ssr: {
    noExternal: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: [],
  },
  build: {
    ssr: resolve(__dirname, "entry-server.jsx"),
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react")) {
              return "vendor-react"
            }
            if (id.includes("lodash")) {
              return "vendor-lodash"
            }
            if (id.includes("axios")) {
              return "vendor-axios"
            }
            return "vendor-others"
          }
        },
      },
    },
  },
})
