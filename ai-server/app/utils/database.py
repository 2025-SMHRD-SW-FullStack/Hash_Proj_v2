"""
MySQL 세션 유틸 (운영 안정화 옵션 포함)
- .env 또는 환경변수로 설정
"""
import os
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def _dsn():
    dsn = os.getenv("MYSQL_DSN") or os.getenv("DATABASE_URL")
    if dsn:
        return dsn
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    db   = os.getenv("MYSQL_DB", "ai_server")
    user = os.getenv("MYSQL_USER", "ai_user")
    pw   = os.getenv("MYSQL_PASSWORD", "ai_password")
    return f"mysql+pymysql://{user}:{pw}@{host}:{port}/{db}?charset=utf8mb4"

def engine():
    return create_engine(
        _dsn(),
        pool_pre_ping=True,
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        echo=bool(int(os.getenv("DB_ECHO", "0"))),
        future=True,
    )

_ENG = engine()
_SessionLocal = sessionmaker(bind=_ENG, autoflush=False, autocommit=False, future=True)

@contextmanager
def get_db():
    db = _SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def ping():
    """헬스체크용 DB 핑"""
    with _ENG.connect() as c:
        c.execute(text("SELECT 1"))