FROM python:3.11
WORKDIR /usr/src/app/server
COPY ./requirements.txt .
RUN pip install -r requirements.txt
# 시간 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]