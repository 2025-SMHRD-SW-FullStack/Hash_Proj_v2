FROM node:22.16.0-bullseye

WORKDIR /usr/src/app/front-server

# 패키지 복사
COPY package*.json ./

# npm 버그 방지 + rollup 강제 설치
RUN npm ci --legacy-peer-deps && \
    npm install --save-dev rollup @rollup/rollup-linux-x64-gnu

# 소스 복사
COPY . .

# 타임존
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
