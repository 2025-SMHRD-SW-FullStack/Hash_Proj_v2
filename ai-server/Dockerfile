FROM python:3.11

WORKDIR /usr/src/app/ai-server

# Python requirements 설치
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Redis 서버 설치
RUN apt-get update && \
    apt-get install -y redis-server && \
    rm -rf /var/lib/apt/lists/*

# 시간대 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

COPY . .

EXPOSE 8000 6379

# uvicorn + redis-server 동시에 실행
CMD redis-server --daemonize yes && uvicorn main:app --host 0.0.0.0 --port 8000
