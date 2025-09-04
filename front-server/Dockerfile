FROM node:22.16.0-bullseye

WORKDIR /usr/src/app/front-server

# 패키지 설치
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 소스 복사
COPY . .

# 타임존 설정 (옵션)
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# Vite dev 서버 포트
EXPOSE 5173

# 개발 서버 실행 (0.0.0.0 바인딩 필수)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
