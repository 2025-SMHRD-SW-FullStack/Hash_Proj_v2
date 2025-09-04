# 1단계: 빌드
FROM node:20-bullseye AS builder
WORKDIR /usr/src/app/front-server
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# 2단계: 실행 (vite dev가 아니라 빌드된 정적 파일 serve)
FROM nginx:stable-alpine
COPY --from=builder /usr/src/app/front-server/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
