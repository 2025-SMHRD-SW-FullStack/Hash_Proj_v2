from __future__ import annotations

import os
from typing import Iterator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL 환경변수가 설정되지 않았습니다. (예: mysql+pymysql://user:pw@127.0.0.1:3306/meonjeo?charset=utf8mb4)")

# 💡 끊긴 커넥션 자동 감지/재연결 + 재사용 주기 설정
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # ping으로 dead connection 감지 후 재연결
    pool_recycle=1800,    # 30분마다 연결 재활용 (wait_timeout보다 작게)
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    connect_args={"connect_timeout": 10},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

Base = declarative_base()

# ✅ FastAPI 의존성 주입용
def get_db() -> Iterator[Session]:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
