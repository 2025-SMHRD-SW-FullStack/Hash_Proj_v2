# ai-server (MySQL / 3번 운영 방식)

- 사용자 말투 프로필은 **MySQL**에 저장됩니다.
- 테이블은 **서버 기동 시 엔티티 기준 자동 생성**됩니다.
- 플랫폼 예시는 파일(`data/platform_examples/<platform>/*.txt` + `index.yaml`)을 사용합니다.

## Quick Start (Docker)
```bash
cp .env.example .env             # DB 계정/비번 수정
docker compose up -d --build
# 헬스체크
curl http://localhost:8001/health
curl http://localhost:8001/health/db
```

## Endpoints (prefix `/ai`)
- POST `/ai/style/ingest`        # 사용자 샘플 저장 & 프로필 업데이트(DB)
- GET  `/ai/style/profile`       # 내 프로필 조회(DB)
- POST `/ai/reviews/generate`    # 프로필(있으면) 또는 플랫폼 예시(없으면) 기반 생성
- GET  `/ai/examples/platform/{platform}`
- POST `/ai/examples/platform/{platform}/upload`  (multipart: file=ZIP of .txt)
- GET/POST `/ai/examples`        # 전역 예시 관리(YAML)

## ENV (see .env.example)
- MYSQL_DSN (선택): e.g. mysql+pymysql://ai_user:ai_password@mysql:3306/ai_server?charset=utf8mb4
- 또는 MYSQL_HOST, MYSQL_PORT, MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD
- DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_RECYCLE, DB_ECHO

## Notes
- JWT는 현재 모킹: `Authorization: Bearer <userId:int>`
- `data/` 폴더는 플랫폼 예시/전역 예시 보존용 (프로필은 DB)