FROM python:3.12.7
WORKDIR /usr/src/app/ai-server
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# 시간 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]