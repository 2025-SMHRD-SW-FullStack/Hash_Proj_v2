FROM node:22-alpine
WORKDIR /usr/src/app/client
COPY package*.json ./
RUN npm cache clean --force
RUN npm install
# 시간 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone
COPY . .
EXPOSE 3000
# CMD ["npm", "run", "dev"]
CMD ["node", "server.js"]