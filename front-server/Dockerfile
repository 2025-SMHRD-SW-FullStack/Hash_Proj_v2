FROM node:22-bullseye

WORKDIR /usr/src/app/front-server

# package-lock.json 같이 복사
COPY package*.json ./

# npm 최신화 + 클린 설치
RUN npm install -g npm@latest
RUN npm ci --legacy-peer-deps

# 시간 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]