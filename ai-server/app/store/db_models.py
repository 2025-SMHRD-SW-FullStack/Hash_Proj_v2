"""SQLAlchemy ORM 모델 정의"""
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import BigInteger, String, Text, JSON, TIMESTAMP, func

Base = declarative_base()

class UserStyleProfile(Base):
    __tablename__ = "user_style_profile"
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    tone_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    style_tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    history: Mapped[list | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[str] = mapped_column(TIMESTAMP, server_default=func.current_timestamp(),
                                            onupdate=func.current_timestamp())
    
class ReviewInputImage(Base):
    __tablename__ = "review_input_image"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # 한 번의 생성요청을 묶는 키
    original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stored_path: Mapped[str] = mapped_column(String(500), nullable=False)   # 서버 디스크 경로
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, server_default=func.current_timestamp())