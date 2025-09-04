# 1단계: 빌드 환경
FROM node:22-bullseye AS builder

WORKDIR /usr/src/app/front-server

# 패키지 파일 먼저 복사
COPY package*.json ./

# npm 캐시 정리 + 패키지 설치
RUN npm cache clean --force
RUN npm ci --legacy-peer-deps

# rollup 문제 해결 (빌드 환경에 맞게 다시 설치)
RUN npm rebuild rollup

# 소스 복사
COPY . .

# Vite는 dev 서버 실행 (build 안 함, npm run build 대신 dev)
# 👉 AWS EB에서 run time에 dev 서버 띄울 거라 build 단계 없음

# 2단계: 런타임 환경
FROM node:22-bullseye

WORKDIR /usr/src/app/front-server

# timezone 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# builder에서 node_modules만 복사
COPY --from=builder /usr/src/app/front-server/node_modules ./node_modules
COPY --from=builder /usr/src/app/front-server/package*.json ./
COPY --from=builder /usr/src/app/front-server ./

# 5173 포트 노출 (vite dev 서버)
EXPOSE 5173

# Vite dev 서버 실행
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
