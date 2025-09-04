FROM node:22-bullseye
WORKDIR /usr/src/app/front-server
COPY package*.json ./
RUN npm cache clean --force
RUN npm install
# 시간 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
# CMD ["node", "server.js"]