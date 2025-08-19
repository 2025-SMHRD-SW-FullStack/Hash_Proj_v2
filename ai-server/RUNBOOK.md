# ai-server RUNBOOK

이 문서는 **ai-server**를 실행하기 위한 단계별 가이드를 정리합니다.

- Python: 3.11
- 프레임워크: FastAPI + Uvicorn
- DB: SQLAlchemy (MySQL/PyMySQL)
- 이미지 분석: Pillow + Tesseract(OCR)
- 기본 엔드포인트 프리픽스: `/ai`

---

## 1) 로컬 실행

### A. OS 의존성 설치 (OCR)
- **Ubuntu/Debian**
  ```bash
  sudo apt-get update
  sudo apt-get install -y tesseract-ocr tesseract-ocr-kor
  ```
- **macOS (Homebrew)**
  ```bash
  brew install tesseract tesseract-lang
  ```
- **Windows**
  1) Tesseract 설치 (예: `C:\Program Files\Tesseract-OCR\tesseract.exe`)  
  2) 필요하면 파이썬에서 경로 지정
     ```python
     import pytesseract
     pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
     ```

### B. 파이썬 환경
```bash
cd ai-server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### C. 환경변수 설정
`.env` 파일 생성(예시는 `.env.example` 참고):
```
DATABASE_URL=mysql+pymysql://root:rootpass@127.0.0.1:3306/ai_db?charset=utf8mb4
OCR_LANG=kor+eng
IMG_ANALYSIS_MAX=3
EXAMPLES_PATH=data/examples.yaml
UPLOAD_DIR=data/uploads
CRAWL_MAX_URLS=10
CRAWL_MAX_SAMPLES_PER_PAGE=5
LOG_LEVEL=info
```

### D. 앱 실행
> 엔트리 모듈이 `app/main.py`라면 아래처럼 실행합니다.
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
> 루트 `main.py`를 쓴다면 `uvicorn main:app ...`로 바꾸세요.

### E. 스모크 테스트
```bash
# 1) 기본 생성(JSON)
curl -X POST "http://localhost:8001/ai/reviews/generate"   -H "Authorization: Bearer 123"   -H "Content-Type: application/json"   -d '{
    "platform":"coupang",
    "brand":"리쏠",
    "menu":"남성용 스테인리스 오토매틱 시계",
    "keywords":["가성비","빠른배송"],
    "desiredLength":800
  }'

# 2) 멀티파트 업로드+생성
curl -X POST "http://localhost:8001/ai/reviews/generate-mp"   -H "Authorization: Bearer 123"   -F "platform=coupang"   -F "brand=리쏠"   -F "menu=남성용 스테인리스 오토매틱 시계"   -F "keywords=[\"가성비\",\"빠른배송\"]"   -F "points=포장상태,생활방수"   -F "desiredLength=800"   -F "images=@/path/to/photo1.jpg"   -F "images=@/path/to/photo2.png"
```

---

## 2) 배포 환경 실행

### 옵션 1) Docker (권장)

**Dockerfile**
```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# OS 패키지: Tesseract + 한국어 데이터
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-kor \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV OCR_LANG=kor+eng \
    IMG_ANALYSIS_MAX=3

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

**docker-compose.yml**
```yaml
services:
  ai-server:
    build: .
    ports: ["8001:8001"]
    env_file: .env
    volumes:
      - ./data:/app/data
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: ai_db
      TZ: Asia/Seoul
    ports:
      - "3307:3306"
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci"]
    volumes:
      - dbdata:/var/lib/mysql

volumes:
  dbdata:
```

**.env.example**
```
# DB
DATABASE_URL=mysql+pymysql://root:rootpass@mysql:3306/ai_db?charset=utf8mb4

# OCR
OCR_LANG=kor+eng
IMG_ANALYSIS_MAX=3

# Path
EXAMPLES_PATH=data/examples.yaml
UPLOAD_DIR=data/uploads

# Crawler
CRAWL_MAX_URLS=10
CRAWL_MAX_SAMPLES_PER_PAGE=5

# Logs
LOG_LEVEL=info
```

실행:
```bash
docker compose up -d --build
docker compose logs -f ai-server
```

리버스 프록시(Nginx) 예시:
```nginx
server {
    listen 80;
    server_name ai.example.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 옵션 2) Gunicorn + UvicornWorker (비도커)
```bash
# 가상환경 + 의존성 설치 후
export OCR_LANG=kor+eng
export IMG_ANALYSIS_MAX=3
export DATABASE_URL="mysql+pymysql://USER:PASS@HOST:3306/DB?charset=utf8mb4"

pip install gunicorn
gunicorn -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8001 app.main:app
```

Systemd 유닛 예시(`/etc/systemd/system/ai-server.service`):
```ini
[Unit]
Description=AI Server (FastAPI)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/srv/ai-server
EnvironmentFile=/srv/ai-server/.env
ExecStart=/srv/ai-server/.venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8001 app.main:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 체크리스트
- Tesseract 설치 & `OCR_LANG` 세팅
- `requirements.txt` 설치
- `DATABASE_URL` 정상 연결
- 데이터 디렉토리(`data/`) 권한 확인
- 스모크 테스트 2개 엔드포인트 OK
